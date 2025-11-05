package errors

import (
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"net/http"
	"time"
)

type ErrorCode string

const (
	ErrorCodeInternal            ErrorCode = "INTERNAL_SERVER_ERROR"
	ErrorCodeInvalidRendition    ErrorCode = "INVALID_RENDITION_FOR_MP3"
	ErrorCodeNoAudioTrack        ErrorCode = "NO_AUDIO_TRACK"
	ErrorCodeNoVideoTrack        ErrorCode = "NO_VIDEO_TRACK"
	ErrorCodeURLMismatch         ErrorCode = "URL_MISMATCH"
	ErrorCodeUnauthorized        ErrorCode = "UNAUTHORIZED"
	ErrorCodeTokenExpired        ErrorCode = "TOKEN_EXPIRED"
	ErrorCodeBadRequest          ErrorCode = "BAD_REQUEST"
)

type ErrorResponse struct {
	Error struct {
		Code    ErrorCode              `json:"code"`
		Message string                 `json:"message"`
		ErrorID string                 `json:"errorId"`
		Details map[string]interface{} `json:"details,omitempty"`
	} `json:"error"`
}

type ErrorContext struct {
	Context    string
	Err        error
	Request    *http.Request
	Additional map[string]interface{}
}

// GenerateErrorID creates a unique 8-character hex error ID
func GenerateErrorID() string {
	b := make([]byte, 4)
	rand.Read(b)
	return hex.EncodeToString(b)
}

// LogError logs detailed error information with context
func LogError(ctx ErrorContext) string {
	errorID := GenerateErrorID()

	logEntry := map[string]interface{}{
		"errorId":   errorID,
		"context":   ctx.Context,
		"timestamp": time.Now().Format(time.RFC3339),
	}

	if ctx.Request != nil {
		logEntry["method"] = ctx.Request.Method
		logEntry["url"] = ctx.Request.URL.String()
		logEntry["userAgent"] = ctx.Request.UserAgent()
		logEntry["ip"] = ctx.Request.RemoteAddr
	}

	if ctx.Err != nil {
		logEntry["error"] = ctx.Err.Error()
	}

	for k, v := range ctx.Additional {
		logEntry[k] = v
	}

	logJSON, _ := json.Marshal(logEntry)
	fmt.Printf("[ERROR %s] %s: %s\n", errorID, ctx.Context, string(logJSON))

	return errorID
}

// Send500Error sends a 500 error response with proper logging
func Send500Error(w http.ResponseWriter, ctx ErrorContext) {
	errorID := LogError(ctx)

	response := ErrorResponse{}
	response.Error.Code = ErrorCodeInternal
	response.Error.Message = "Internal server error"
	response.Error.ErrorID = errorID

	sendErrorResponse(w, http.StatusInternalServerError, response)
}

// SendErrorResponse sends a structured error response
func SendErrorResponse(w http.ResponseWriter, status int, code ErrorCode, message string, details map[string]interface{}) {
	response := ErrorResponse{}
	response.Error.Code = code
	response.Error.Message = message
	response.Error.Details = details

	sendErrorResponse(w, status, response)
}

func sendErrorResponse(w http.ResponseWriter, status int, response ErrorResponse) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(response)
}

