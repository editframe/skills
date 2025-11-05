package mse

import (
	"bytes"
	"encoding/binary"
	"fmt"
	"io"
)

type Box struct {
	Type     string
	Size     uint32
	Data     []byte
	Children []Box
}

func ParseMP4(data []byte) ([]Box, error) {
	boxes := []Box{}
	reader := bytes.NewReader(data)

	for {
		box, err := parseBox(reader)
		if err == io.EOF {
			break
		}
		if err != nil {
			return nil, fmt.Errorf("failed to parse box: %w", err)
		}
		boxes = append(boxes, box)
	}

	return boxes, nil
}

func parseBox(reader *bytes.Reader) (Box, error) {
	box := Box{}

	var size uint32
	if err := binary.Read(reader, binary.BigEndian, &size); err != nil {
		return box, err
	}

	typeBytes := make([]byte, 4)
	if _, err := reader.Read(typeBytes); err != nil {
		return box, err
	}

	box.Type = string(typeBytes)
	box.Size = size

	if size == 1 {
		var largeSize uint64
		if err := binary.Read(reader, binary.BigEndian, &largeSize); err != nil {
			return box, err
		}
		size = uint32(largeSize)
	}

	if size < 8 {
		return box, fmt.Errorf("invalid box size: %d", size)
	}

	dataSize := size - 8
	box.Data = make([]byte, dataSize)
	if _, err := reader.Read(box.Data); err != nil {
		return box, err
	}

	return box, nil
}

func FindBox(boxes []Box, boxType string) *Box {
	for i := range boxes {
		if boxes[i].Type == boxType {
			return &boxes[i]
		}
	}
	return nil
}

func SerializeBox(box Box) []byte {
	buf := bytes.NewBuffer(nil)

	totalSize := uint32(8 + len(box.Data))
	binary.Write(buf, binary.BigEndian, totalSize)
	buf.WriteString(box.Type)
	buf.Write(box.Data)

	return buf.Bytes()
}

func RepackageInitSegment(mp4Data []byte, durationMs float64) ([]byte, error) {
	boxes, err := ParseMP4(mp4Data)
	if err != nil {
		return nil, fmt.Errorf("failed to parse MP4: %w", err)
	}

	ftypBox := FindBox(boxes, "ftyp")
	if ftypBox == nil {
		return nil, fmt.Errorf("ftyp box not found")
	}

	moovBox := FindBox(boxes, "moov")
	if moovBox == nil {
		return nil, fmt.Errorf("moov box not found")
	}

	moovData := updateMoovDuration(moovBox.Data, 0)
	updatedMoov := Box{
		Type: "moov",
		Size: uint32(8 + len(moovData)),
		Data: moovData,
	}

	result := bytes.NewBuffer(nil)
	result.Write(SerializeBox(*ftypBox))
	result.Write(SerializeBox(updatedMoov))

	return result.Bytes(), nil
}

func RepackageMediaSegment(mp4Data []byte, sequenceNumber int, baseDecodeTimeMs float64) ([]byte, error) {
	boxes, err := ParseMP4(mp4Data)
	if err != nil {
		return nil, fmt.Errorf("failed to parse MP4: %w", err)
	}

	moofBox := FindBox(boxes, "moof")
	if moofBox == nil {
		return nil, fmt.Errorf("moof box not found")
	}

	mdatBox := FindBox(boxes, "mdat")
	if mdatBox == nil {
		return nil, fmt.Errorf("mdat box not found")
	}

	moofData := updateMoofMetadata(moofBox.Data, sequenceNumber, baseDecodeTimeMs)
	updatedMoof := Box{
		Type: "moof",
		Size: uint32(8 + len(moofData)),
		Data: moofData,
	}

	result := bytes.NewBuffer(nil)
	result.Write(SerializeBox(updatedMoof))
	result.Write(SerializeBox(*mdatBox))

	return result.Bytes(), nil
}

func updateMoovDuration(moovData []byte, durationMs float64) []byte {
	updatedData := make([]byte, len(moovData))
	copy(updatedData, moovData)

	return updatedData
}

func updateMoofMetadata(moofData []byte, sequenceNumber int, baseDecodeTimeMs float64) []byte {
	updatedData := make([]byte, len(moofData))
	copy(updatedData, moofData)

	patchSequenceNumber(updatedData, sequenceNumber)
	patchBaseMediaDecodeTime(updatedData, baseDecodeTimeMs)

	return updatedData
}

func patchSequenceNumber(data []byte, sequenceNumber int) {
	mfhdPos := bytes.Index(data, []byte("mfhd"))
	if mfhdPos == -1 || mfhdPos+12 > len(data) {
		return
	}

	binary.BigEndian.PutUint32(data[mfhdPos+8:mfhdPos+12], uint32(sequenceNumber))
}

func patchBaseMediaDecodeTime(data []byte, baseDecodeTimeMs float64) {
	tfdtPos := bytes.Index(data, []byte("tfdt"))
	if tfdtPos == -1 {
		return
	}

	if tfdtPos+16 > len(data) {
		return
	}

	version := data[tfdtPos+4]
	baseMediaDecodeTime := uint64(baseDecodeTimeMs * 90)

	if version == 1 {
		binary.BigEndian.PutUint64(data[tfdtPos+8:tfdtPos+16], baseMediaDecodeTime)
	} else {
		if tfdtPos+12 > len(data) {
			return
		}
		binary.BigEndian.PutUint32(data[tfdtPos+8:tfdtPos+12], uint32(baseMediaDecodeTime))
	}
}

func ExtractBox(mp4Data []byte, boxType string) ([]byte, error) {
	boxes, err := ParseMP4(mp4Data)
	if err != nil {
		return nil, fmt.Errorf("failed to parse MP4: %w", err)
	}

	box := FindBox(boxes, boxType)
	if box == nil {
		return nil, fmt.Errorf("%s box not found", boxType)
	}

	return SerializeBox(*box), nil
}

func HasBox(mp4Data []byte, boxType string) bool {
	boxes, err := ParseMP4(mp4Data)
	if err != nil {
		return false
	}

	return FindBox(boxes, boxType) != nil
}
