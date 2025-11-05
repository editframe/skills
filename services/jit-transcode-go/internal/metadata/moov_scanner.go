package metadata

import (
	"bytes"
	"encoding/binary"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"os"
	"strings"
)

const (
	HeadBytes = 1024 * 1024
	TailBytes = 1024 * 1024
)

type MoovCacheEntry struct {
	URL             string
	Ftyp            []byte
	Moov            []byte
	TotalSize       int64
	MdatOffset      int64
	InterveningBoxes []byte
}

type Box struct {
	Type   string
	Size   uint32
	Start  int64
	End    int64
	Data   []byte
}

func isLocalFile(urlStr string) bool {
	return strings.HasPrefix(urlStr, "file://")
}

func urlToPath(urlStr string) (string, error) {
	if !strings.HasPrefix(urlStr, "file://") {
		return "", fmt.Errorf("not a file:// URL")
	}
	
	u, err := url.Parse(urlStr)
	if err != nil {
		return "", fmt.Errorf("invalid file URL: %w", err)
	}
	
	return u.Path, nil
}

func readLocalFileRange(filePath string, start, end int64) ([]byte, error) {
	f, err := os.Open(filePath)
	if err != nil {
		return nil, err
	}
	defer f.Close()
	
	_, err = f.Seek(start, 0)
	if err != nil {
		return nil, err
	}
	
	length := end - start + 1
	data := make([]byte, length)
	n, err := io.ReadFull(f, data)
	if err != nil && err != io.ErrUnexpectedEOF {
		return nil, err
	}
	
	return data[:n], nil
}

func getLocalFileSize(filePath string) (int64, error) {
	info, err := os.Stat(filePath)
	if err != nil {
		return 0, err
	}
	return info.Size(), nil
}

func FetchMoovAndFtyp(urlStr string) (result *MoovCacheEntry, resultErr error) {
	defer func() {
		if r := recover(); r != nil {
			fmt.Printf("[FetchMoovAndFtyp] PANIC: %v\n", r)
			resultErr = fmt.Errorf("panic during metadata fetch: %v", r)
		}
	}()
	
	if isLocalFile(urlStr) {
		return fetchMoovAndFtypLocal(urlStr)
	}
	
	entry := &MoovCacheEntry{
		URL: urlStr,
	}

	fmt.Printf("[FetchMoovAndFtyp] Fetching metadata for: %s\n", urlStr)

	if err := testRangeRequestSupport(urlStr); err != nil {
		fmt.Printf("[FetchMoovAndFtyp] Range request check failed: %v\n", err)
		return nil, fmt.Errorf("range requests not supported: %w", err)
	}

	headData, err := fetchByteRange(urlStr, 0, HeadBytes-1)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch head bytes: %w", err)
	}

	fmt.Printf("[FetchMoovAndFtyp] Fetched %d head bytes\n", len(headData))

	boxes, err := parseBoxesFromBuffer(headData, 0)
	if err != nil {
		return nil, fmt.Errorf("failed to parse boxes: %w", err)
	}

	fmt.Printf("[FetchMoovAndFtyp] Parsed %d boxes\n", len(boxes))

	var moovEndOffset int64 = -1
	
	for i, box := range boxes {
		fmt.Printf("[FetchMoovAndFtyp] Box %d: type='%s' at %d-%d (data len=%d)\n", i, box.Type, box.Start, box.End, len(box.Data))
		
		switch box.Type {
		case "ftyp":
			if box.Data != nil {
				entry.Ftyp = box.Data
			}
			fmt.Printf("[FetchMoovAndFtyp] ftyp stored, len=%d\n", len(entry.Ftyp))
		case "moov":
			if box.Data != nil {
				entry.Moov = box.Data
			}
			moovEndOffset = box.End
			fmt.Printf("[FetchMoovAndFtyp] moov stored, len=%d, ends at %d\n", len(entry.Moov), moovEndOffset)
		case "free", "skip", "wide", "uuid":
			if moovEndOffset > 0 && box.Start >= moovEndOffset && box.Data != nil && entry.MdatOffset == 0 {
				fmt.Printf("[FetchMoovAndFtyp] Intervening box between moov and mdat: %s\n", box.Type)
				entry.InterveningBoxes = append(entry.InterveningBoxes, box.Data...)
			}
		case "mdat":
			fmt.Printf("[FetchMoovAndFtyp] Found mdat at %d, ends at %d\n", box.Start, box.End)
			entry.MdatOffset = box.End
			fmt.Printf("[FetchMoovAndFtyp] mdat end offset set to %d\n", entry.MdatOffset)
		default:
			fmt.Printf("[FetchMoovAndFtyp] Skipping unknown box type: %s\n", box.Type)
		}
		
		fmt.Printf("[FetchMoovAndFtyp] Completed processing box %d\n", i)
	}

	fmt.Printf("[FetchMoovAndFtyp] Completed box iteration. After head parsing: ftyp=%v, moov=%v\n", entry.Ftyp != nil, entry.Moov != nil)

	if entry.Moov == nil {
		fmt.Printf("[FetchMoovAndFtyp] moov not in head, fetching after mdat...\n")
		
		var moovData []byte
		var fetchErr error
		
		if entry.MdatOffset > 0 {
			fmt.Printf("[FetchMoovAndFtyp] mdat ends at %d, fetching 100KB after it...\n", entry.MdatOffset)
			moovData, fetchErr = fetchByteRange(urlStr, entry.MdatOffset, entry.MdatOffset+102400-1)
		} else {
			fmt.Printf("[FetchMoovAndFtyp] mdat offset unknown, fetching file tail...\n")
			moovData, fetchErr = fetchTailForMoov(urlStr)
		}
		
		if fetchErr != nil {
			return nil, fmt.Errorf("failed to fetch moov area: %w", fetchErr)
		}

		fmt.Printf("[FetchMoovAndFtyp] Fetched %d bytes for moov search\n", len(moovData))

		moovBoxes, err := parseBoxesFromBuffer(moovData, entry.MdatOffset)
		if err != nil {
			return nil, fmt.Errorf("failed to parse moov area: %w", err)
		}

		fmt.Printf("[FetchMoovAndFtyp] Parsed %d boxes after mdat\n", len(moovBoxes))

		for i, box := range moovBoxes {
			fmt.Printf("[FetchMoovAndFtyp] Post-mdat box %d: type='%s' at %d-%d (data len=%d)\n", i, box.Type, box.Start, box.End, len(box.Data))
			
			if box.Type == "moov" && box.Data != nil {
				entry.Moov = box.Data
				fmt.Printf("[FetchMoovAndFtyp] Found moov after mdat! Stored %d bytes\n", len(entry.Moov))
				break
			}
		}
	}

	if entry.Ftyp == nil || entry.Moov == nil {
		return nil, fmt.Errorf("failed to find ftyp and moov boxes")
	}

	totalSize, err := getResourceSize(urlStr)
	if err != nil {
		return nil, fmt.Errorf("failed to get resource size: %w", err)
	}
	entry.TotalSize = totalSize

	return entry, nil
}

func fetchMoovAndFtypLocal(urlStr string) (*MoovCacheEntry, error) {
	filePath, err := urlToPath(urlStr)
	if err != nil {
		return nil, fmt.Errorf("failed to parse file URL: %w", err)
	}
	
	fmt.Printf("[FetchMoovAndFtyp] Reading local file: %s\n", filePath)
	
	entry := &MoovCacheEntry{
		URL: urlStr,
	}
	
	headData, err := readLocalFileRange(filePath, 0, HeadBytes-1)
	if err != nil {
		return nil, fmt.Errorf("failed to read head bytes: %w", err)
	}
	
	fmt.Printf("[FetchMoovAndFtyp] Read %d head bytes\n", len(headData))
	
	boxes, err := parseBoxesFromBuffer(headData, 0)
	if err != nil {
		return nil, fmt.Errorf("failed to parse boxes: %w", err)
	}
	
	fmt.Printf("[FetchMoovAndFtyp] Parsed %d boxes\n", len(boxes))
	
	var moovEndOffset int64 = -1
	
	for i, box := range boxes {
		fmt.Printf("[FetchMoovAndFtyp] Box %d: type='%s' at %d-%d (data len=%d)\n", i, box.Type, box.Start, box.End, len(box.Data))
		
		switch box.Type {
		case "ftyp":
			if box.Data != nil {
				entry.Ftyp = box.Data
			}
		case "moov":
			if box.Data != nil {
				entry.Moov = box.Data
			}
			moovEndOffset = box.End
		case "free", "skip", "wide", "uuid":
			if moovEndOffset > 0 && box.Start >= moovEndOffset && box.Data != nil && entry.MdatOffset == 0 {
				entry.InterveningBoxes = append(entry.InterveningBoxes, box.Data...)
			}
		case "mdat":
			entry.MdatOffset = box.End
		}
	}
	
	if entry.Moov == nil {
		fmt.Printf("[FetchMoovAndFtyp] moov not in head, scanning from after mdat...\n")
		
		totalSize, err := getLocalFileSize(filePath)
		if err != nil {
			return nil, fmt.Errorf("failed to get file size: %w", err)
		}
		
		var scanStart int64
		if entry.MdatOffset > 0 {
			scanStart = entry.MdatOffset
			fmt.Printf("[FetchMoovAndFtyp] Starting scan from after mdat at offset %d\n", scanStart)
		} else {
			scanStart = totalSize - TailBytes
			if scanStart < 0 {
				scanStart = 0
			}
			fmt.Printf("[FetchMoovAndFtyp] mdat offset unknown, scanning from offset %d\n", scanStart)
		}
		
		scanData, err := readLocalFileRange(filePath, scanStart, totalSize-1)
		if err != nil {
			return nil, fmt.Errorf("failed to read scan data: %w", err)
		}
		
		fmt.Printf("[FetchMoovAndFtyp] Read %d bytes from offset %d, parsing...\n", len(scanData), scanStart)
		
		scanBoxes, err := parseBoxesFromBuffer(scanData, scanStart)
		if err != nil {
			return nil, fmt.Errorf("failed to parse boxes: %w", err)
		}
		
		fmt.Printf("[FetchMoovAndFtyp] Parsed %d boxes after mdat\n", len(scanBoxes))
		
		for i, box := range scanBoxes {
			fmt.Printf("[FetchMoovAndFtyp] Post-mdat box %d: type='%s' at %d-%d (data len=%d)\n", i, box.Type, box.Start, box.End, len(box.Data))
			if box.Type == "moov" && box.Data != nil {
				entry.Moov = box.Data
				fmt.Printf("[FetchMoovAndFtyp] Found moov after mdat!\n")
				break
			}
		}
	}
	
	if entry.Ftyp == nil || entry.Moov == nil {
		return nil, fmt.Errorf("failed to find ftyp and moov boxes")
	}
	
	totalSize, err := getLocalFileSize(filePath)
	if err != nil {
		return nil, fmt.Errorf("failed to get file size: %w", err)
	}
	entry.TotalSize = totalSize
	
	return entry, nil
}

func BuildSyntheticMp4(entry *MoovCacheEntry) []byte {
	buf := bytes.NewBuffer(nil)

	buf.Write(entry.Ftyp)
	buf.Write(entry.Moov)

	if len(entry.InterveningBoxes) > 0 {
		buf.Write(entry.InterveningBoxes)
	}

	mdatHeader := make([]byte, 8)
	binary.BigEndian.PutUint32(mdatHeader[0:4], 8)
	mdatHeader[4] = 0x6d
	mdatHeader[5] = 0x64
	mdatHeader[6] = 0x61
	mdatHeader[7] = 0x74
	buf.Write(mdatHeader)

	return buf.Bytes()
}

func testRangeRequestSupport(url string) error {
	req, err := http.NewRequest("HEAD", url, nil)
	if err != nil {
		return err
	}

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.Header.Get("Accept-Ranges") == "" {
		req, _ = http.NewRequest("GET", url, nil)
		req.Header.Set("Range", "bytes=0-0")

		resp, err = http.DefaultClient.Do(req)
		if err != nil {
			return err
		}
		defer resp.Body.Close()

		if resp.StatusCode != http.StatusPartialContent {
			return fmt.Errorf("server does not support range requests (status: %d)", resp.StatusCode)
		}
	}

	return nil
}

func fetchByteRange(url string, start, end int64) ([]byte, error) {
	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return nil, err
	}

	req.Header.Set("Range", fmt.Sprintf("bytes=%d-%d", start, end))

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusPartialContent {
		return nil, fmt.Errorf("expected 206 Partial Content, got %d", resp.StatusCode)
	}

	return io.ReadAll(resp.Body)
}

func fetchTailForMoov(url string) ([]byte, error) {
	size, err := getResourceSize(url)
	if err != nil {
		return nil, err
	}

	fmt.Printf("[fetchTailForMoov] File size: %d bytes\n", size)

	start := size - TailBytes
	if start < 0 {
		start = 0
	}

	fmt.Printf("[fetchTailForMoov] Fetching bytes %d-%d\n", start, size-1)

	return fetchByteRange(url, start, size-1)
}

func getResourceSize(url string) (int64, error) {
	req, err := http.NewRequest("HEAD", url, nil)
	if err != nil {
		return 0, err
	}

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return 0, err
	}
	defer resp.Body.Close()

	if resp.ContentLength <= 0 {
		return 0, fmt.Errorf("could not determine content length")
	}

	return resp.ContentLength, nil
}

func parseBoxesFromBuffer(buffer []byte, baseOffset int64) ([]Box, error) {
	boxes := []Box{}
	reader := bytes.NewReader(buffer)
	offset := int64(0)

	for {
		if reader.Len() < 8 {
			break
		}

		var size uint32
		if err := binary.Read(reader, binary.BigEndian, &size); err != nil {
			break
		}

		typeBytes := make([]byte, 4)
		if _, err := reader.Read(typeBytes); err != nil {
			break
		}

		boxType := string(typeBytes)

		if size == 1 {
			var largeSize uint64
			if err := binary.Read(reader, binary.BigEndian, &largeSize); err != nil {
				break
			}
			size = uint32(largeSize)
		}

		if size < 8 {
			offset++
			reader.Seek(offset, io.SeekStart)
			continue
		}

		dataSize := size - 8

		if boxType == "mdat" || int64(dataSize) > int64(reader.Len()) {
			box := Box{
				Type:  boxType,
				Size:  size,
				Start: baseOffset + offset,
				End:   baseOffset + offset + int64(size),
				Data:  nil,
			}
			boxes = append(boxes, box)
			
			if boxType == "mdat" {
				break
			}
			break
		}

		data := make([]byte, dataSize)
		if n, err := reader.Read(data); err != nil || n != int(dataSize) {
			break
		}

		fullBoxData := make([]byte, size)
		binary.BigEndian.PutUint32(fullBoxData[0:4], size)
		copy(fullBoxData[4:8], typeBytes)
		copy(fullBoxData[8:], data)

		box := Box{
			Type:  boxType,
			Size:  size,
			Start: baseOffset + offset,
			End:   baseOffset + offset + int64(size),
			Data:  fullBoxData,
		}

		boxes = append(boxes, box)
		offset += int64(size)
	}

	return boxes, nil
}

func serializeBox(boxType string, data []byte) []byte {
	size := uint32(8 + len(data))
	buf := bytes.NewBuffer(nil)

	binary.Write(buf, binary.BigEndian, size)
	buf.WriteString(boxType)
	buf.Write(data)

	return buf.Bytes()
}

func FetchByteRangeForSegment(urlStr string, startByte, endByte int64) ([]byte, error) {
	if isLocalFile(urlStr) {
		filePath, err := urlToPath(urlStr)
		if err != nil {
			return nil, fmt.Errorf("failed to parse file URL: %w", err)
		}
		return readLocalFileRange(filePath, startByte, endByte)
	}
	return fetchByteRange(urlStr, startByte, endByte)
}

