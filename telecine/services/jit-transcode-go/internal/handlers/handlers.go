package handlers

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"os"
	"strconv"
	"strings"

	"github.com/editframe/telecine/jit-transcode-go/internal/auth"
	"github.com/editframe/telecine/jit-transcode-go/internal/errors"
	"github.com/editframe/telecine/jit-transcode-go/internal/storage"
	"github.com/editframe/telecine/jit-transcode-go/internal/transcoding"
	"github.com/editframe/telecine/jit-transcode-go/internal/utils"
	"github.com/gorilla/mux"
)

type Server struct {
	storage         storage.StorageProvider
	transcodeService *transcoding.Service
	router          *mux.Router
}

func NewServer(storageProvider storage.StorageProvider) *Server {
	s := &Server{
		storage:         storageProvider,
		transcodeService: transcoding.NewService(storageProvider),
		router:          mux.NewRouter(),
	}
	s.setupRoutes()
	return s
}

func (s *Server) setupRoutes() {
	s.router.HandleFunc("/health", s.handleHealth).Methods("GET")
	s.router.HandleFunc("/healthz", s.handleHealthz).Methods("GET")

	api := s.router.PathPrefix("/api/v1/transcode").Subrouter()
	api.Use(s.corsMiddleware)
	
	api.HandleFunc("/manifest.json", auth.RequireAuth(s.handleManifestJSON)).Methods("GET")
	api.HandleFunc("/manifest.mpd", auth.RequireAuth(s.handleManifestDASH)).Methods("GET")
	api.HandleFunc("/manifest.m3u8", auth.RequireAuth(s.handleManifestHLS)).Methods("GET")
	api.HandleFunc("/{rendition}.m3u8", auth.RequireAuth(s.handleRenditionPlaylist)).Methods("GET")
	api.HandleFunc("/{rendition}/{segmentId}.{extension}", auth.RequireAuth(s.handleSegment)).Methods("GET")

	s.router.Use(s.loggingMiddleware)
}

func (s *Server) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	s.router.ServeHTTP(w, r)
}

func (s *Server) corsMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization, Range")
		w.Header().Set("Access-Control-Expose-Headers", "Content-Length, Content-Range, X-Cache, X-Actual-Start-Time, X-Actual-Duration, X-Transcode-Time-Ms, X-Total-Server-Time-Ms")

		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusOK)
			return
		}

		next.ServeHTTP(w, r)
	})
}

func (s *Server) loggingMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if !strings.HasPrefix(r.URL.Path, "/health") {
			fmt.Printf("Request %s %s\n", r.Method, r.URL.String())
		}
		next.ServeHTTP(w, r)
		if !strings.HasPrefix(r.URL.Path, "/health") {
			fmt.Printf("Response %s %s\n", r.Method, r.URL.String())
		}
	})
}

func (s *Server) handleHealth(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{
		"status":  "healthy",
		"service": "jit-transcoding",
	})
}

func (s *Server) handleHealthz(w http.ResponseWriter, r *http.Request) {
	w.WriteHeader(http.StatusOK)
}

func (s *Server) handleManifestJSON(w http.ResponseWriter, r *http.Request) {
	url := r.URL.Query().Get("url")
	if url == "" {
		errors.SendErrorResponse(w, http.StatusBadRequest, errors.ErrorCodeBadRequest, "URL parameter is required", nil)
		return
	}

	if transcoding.IsMP3Url(url) {
		fmt.Printf("Generating MP3 manifest for: %s\n", url)
		s.handleMP3Manifest(w, r, url)
		return
	}

	s.handleVideoManifest(w, r, url)
}

func (s *Server) handleVideoManifest(w http.ResponseWriter, r *http.Request, videoUrl string) {
	baseUrl := getBaseURL(r)

	manifest := map[string]interface{}{
		"version":    "1.0",
		"type":       "com.editframe/manifest",
		"sourceUrl":  videoUrl,
		"duration":   10.0,
		"durationMs": 10000,
		"baseUrl":    baseUrl,
		"videoRenditions": []interface{}{
			map[string]interface{}{
				"id":                "high",
				"width":             1920,
				"height":            1080,
				"bitrate":           5000000,
				"codec":             "avc1.640029",
				"mimeType":          "video/mp4; codecs=\"avc1.640029,mp4a.40.2\"",
				"segmentDuration":   2,
				"segmentDurationMs": 2000,
			},
			map[string]interface{}{
				"id":                "medium",
				"width":             1280,
				"height":            720,
				"bitrate":           2500000,
				"codec":             "avc1.640029",
				"mimeType":          "video/mp4; codecs=\"avc1.640029,mp4a.40.2\"",
				"segmentDuration":   2,
				"segmentDurationMs": 2000,
			},
			map[string]interface{}{
				"id":                "low",
				"width":             854,
				"height":            480,
				"bitrate":           1000000,
				"codec":             "avc1.640029",
				"mimeType":          "video/mp4; codecs=\"avc1.640029,mp4a.40.2\"",
				"segmentDuration":   2,
				"segmentDurationMs": 2000,
			},
		},
		"audioRenditions": []interface{}{
			map[string]interface{}{
				"id":                "audio",
				"channels":          1,
				"sampleRate":        48000,
				"bitrate":           128000,
				"codec":             "mp4a.40.2",
				"mimeType":          "audio/mp4; codecs=\"mp4a.40.2\"",
				"segmentDuration":   2,
				"segmentDurationMs": 2000,
			},
		},
		"endpoints": map[string]string{
			"initSegment":  fmt.Sprintf("%s/api/v1/transcode/{rendition}/init.m4s?url=%s", baseUrl, url.QueryEscape(videoUrl)),
			"mediaSegment": fmt.Sprintf("%s/api/v1/transcode/{rendition}/{segmentId}.m4s?url=%s", baseUrl, url.QueryEscape(videoUrl)),
		},
	}

	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Cache-Control", "public, max-age=300")
	json.NewEncoder(w).Encode(manifest)
}

func (s *Server) handleMP3Manifest(w http.ResponseWriter, r *http.Request, mp3Url string) {
	if _, err := transcoding.ConvertMp3ToMp4AndCache(mp3Url, s.storage); err != nil {
		errors.Send500Error(w, errors.ErrorContext{
			Context: "MP3 conversion",
			Err:     err,
			Request: r,
			Additional: map[string]interface{}{
				"sourceUrl": mp3Url,
			},
		})
		return
	}

	baseUrl := getBaseURL(r)

	manifest := map[string]interface{}{
		"version":  "1.0",
		"type":     "jit-audio",
		"sourceUrl": mp3Url,
		"duration":  0,
		"durationMs": 0,
		"baseUrl":   baseUrl,
		"videoRenditions": []interface{}{},
		"audioRenditions": []interface{}{
			map[string]interface{}{
				"id":                "audio",
				"channels":          2,
				"sampleRate":        48000,
				"bitrate":           128000,
				"codec":             "mp4a.40.2",
				"container":         "audio/mp4",
				"mimeType":          "audio/mp4; codecs=\"mp4a.40.2\"",
				"segmentDuration":   15,
				"segmentDurationMs": 15000,
				"language":          "en",
			},
		},
		"endpoints": map[string]string{
			"initSegment":  fmt.Sprintf("%s/api/v1/transcode/{rendition}/init.m4s?url=%s", baseUrl, url.QueryEscape(mp3Url)),
			"mediaSegment": fmt.Sprintf("%s/api/v1/transcode/{rendition}/{segmentId}.m4s?url=%s", baseUrl, url.QueryEscape(mp3Url)),
		},
		"jitInfo": map[string]interface{}{
			"parallelTranscodingSupported": true,
			"expectedTranscodeLatency":     100,
		},
	}

	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Cache-Control", "public, max-age=300")
	json.NewEncoder(w).Encode(manifest)
}

func (s *Server) handleManifestDASH(w http.ResponseWriter, r *http.Request) {
	url := r.URL.Query().Get("url")
	if url == "" {
		errors.SendErrorResponse(w, http.StatusBadRequest, errors.ErrorCodeBadRequest, "URL parameter is required", nil)
		return
	}

	baseUrl := getBaseURL(r)

	dash := fmt.Sprintf(`<?xml version="1.0" encoding="UTF-8"?>
<MPD xmlns="urn:mpeg:dash:schema:mpd:2011" profiles="urn:mpeg:dash:profile:isoff-live:2011" type="static" mediaPresentationDuration="PT10S" minBufferTime="PT2S">
  <Period id="0" start="PT0S">
    <AdaptationSet mimeType="video/mp4" segmentAlignment="true" startWithSAP="1" codecs="avc1.640029">
      <Representation id="high" bandwidth="5000000" width="1920" height="1080">
        <SegmentTemplate media="%s/api/v1/transcode/high/$Number$$.m4s?url=%s" initialization="%s/api/v1/transcode/high/init.m4s?url=%s" timescale="1000" startNumber="1"/>
      </Representation>
    </AdaptationSet>
  </Period>
</MPD>`, baseUrl, url, baseUrl, url)

	w.Header().Set("Content-Type", "application/dash+xml")
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Write([]byte(dash))
}

func (s *Server) handleManifestHLS(w http.ResponseWriter, r *http.Request) {
	url := r.URL.Query().Get("url")
	if url == "" {
		errors.SendErrorResponse(w, http.StatusBadRequest, errors.ErrorCodeBadRequest, "URL parameter is required", nil)
		return
	}

	baseUrl := getBaseURL(r)

	hls := fmt.Sprintf(`#EXTM3U
#EXT-X-VERSION:6
#EXT-X-STREAM-INF:BANDWIDTH=5000000,RESOLUTION=1920x1080,CODECS="avc1.640029,mp4a.40.2"
%s/api/v1/transcode/high.m3u8?url=%s`, baseUrl, url)

	w.Header().Set("Content-Type", "application/vnd.apple.mpegurl")
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Write([]byte(hls))
}

func (s *Server) handleRenditionPlaylist(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	rendition := vars["rendition"]
	
	url := r.URL.Query().Get("url")
	if url == "" {
		errors.SendErrorResponse(w, http.StatusBadRequest, errors.ErrorCodeBadRequest, "URL parameter is required", nil)
		return
	}

	validRenditions := []string{"high", "medium", "low", "audio"}
	valid := false
	for _, r := range validRenditions {
		if r == rendition {
			valid = true
			break
		}
	}

	if !valid {
		errors.SendErrorResponse(w, http.StatusBadRequest, errors.ErrorCodeBadRequest, "Invalid rendition. Use high, medium, low, or audio", nil)
		return
	}

	errors.SendErrorResponse(w, http.StatusNotImplemented, errors.ErrorCodeInternal, "Rendition playlist not yet implemented", nil)
}

func (s *Server) handleSegment(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	rendition := vars["rendition"]
	segmentId := vars["segmentId"]
	extension := vars["extension"]
	
	url := r.URL.Query().Get("url")
	if url == "" {
		errors.SendErrorResponse(w, http.StatusBadRequest, errors.ErrorCodeBadRequest, "URL parameter is required", nil)
		return
	}

	if extension != "m4s" && extension != "mp4" {
		errors.SendErrorResponse(w, http.StatusBadRequest, errors.ErrorCodeBadRequest, "Invalid extension. Use .m4s or .mp4", nil)
		return
	}

	if transcoding.IsMP3Url(url) {
		if !transcoding.ValidateMp3Rendition(rendition) {
			errors.SendErrorResponse(w, http.StatusBadRequest, errors.ErrorCodeInvalidRendition, "MP3 files only support audio rendition", map[string]interface{}{
				"providedRendition":    rendition,
				"supportedRenditions": []string{"audio"},
				"fileType":            "mp3",
			})
			return
		}
	} else {
		validRenditions := []string{"high", "medium", "low", "audio", "scrub"}
		valid := false
		for _, r := range validRenditions {
			if r == rendition {
				valid = true
				break
			}
		}
		if !valid {
			errors.SendErrorResponse(w, http.StatusBadRequest, errors.ErrorCodeBadRequest, "Invalid rendition. Use high, medium, low, audio, or scrub", nil)
			return
		}
	}

	if segmentId != "init" {
		if _, err := strconv.Atoi(segmentId); err != nil {
			errors.SendErrorResponse(w, http.StatusBadRequest, errors.ErrorCodeBadRequest, "segmentId must be 'init' or a number", nil)
			return
		}
	}

	cacheKey := fmt.Sprintf("cache/%s/%s/%s.%s", utils.GenerateCacheKey(url), rendition, segmentId, extension)

	exists, err := s.storage.PathExists(cacheKey)
	if err == nil && exists {
		reader, err := s.storage.CreateReadStream(cacheKey)
		if err == nil {
			defer reader.Close()
			data, err := io.ReadAll(reader)
			if err == nil {
				w.Header().Set("Content-Type", getContentType(extension))
				w.Header().Set("X-Cache", "HIT")
				w.Header().Set("Access-Control-Allow-Origin", "*")
				w.Write(data)
				return
			}
		}
	}

	result, err := s.transcodeService.TranscodeSegment(transcoding.TranscodeSegmentRequest{
		InputURL:          url,
		Rendition:         rendition,
		SegmentID:         segmentId,
		SegmentDurationMs: transcoding.GetSegmentDuration(rendition, transcoding.IsMP3Url(url)),
		IsFragmented:      extension == "m4s",
	})

	if err != nil {
		errors.Send500Error(w, errors.ErrorContext{
			Context: "Segment transcoding",
			Err:     err,
			Request: r,
			Additional: map[string]interface{}{
				"url":       url,
				"rendition": rendition,
				"segmentId": segmentId,
			},
		})
		return
	}

	s.storage.WriteFile(cacheKey, result.Data, storage.WriteOptions{
		ContentType: getContentType(extension),
	})

	w.Header().Set("Content-Type", getContentType(extension))
	w.Header().Set("X-Cache", "MISS")
	w.Header().Set("X-Transcode-Time-Ms", strconv.FormatInt(result.TranscodeTimeMs, 10))
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Write(result.Data)
}

func getContentType(extension string) string {
	if extension == "m4s" {
		return "video/iso.segment"
	}
	return "video/mp4"
}

func getBaseURL(r *http.Request) string {
	isProduction := os.Getenv("NODE_ENV") == "production"

	if isProduction {
		return fmt.Sprintf("https://%s", r.Host)
	}

	protocol := "http"
	if r.TLS != nil {
		protocol = "https"
	}
	return fmt.Sprintf("%s://%s", protocol, r.Host)
}

