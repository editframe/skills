package auth

import (
	"fmt"
	"net/http"
	"net/url"
	"os"
	"strings"
	"time"
)

type SessionType string

const (
	SessionTypeAPI          SessionType = "api"
	SessionTypeURL          SessionType = "url"
	SessionTypeAnonymousURL SessionType = "anonymous_url"
)

type Session struct {
	Type      SessionType
	UserID    string
	ExpiredAt *time.Time
	URLMatch  string
}

// ParseRequestSession extracts session information from request
func ParseRequestSession(r *http.Request) (*Session, error) {
	authHeader := r.Header.Get("Authorization")
	if authHeader != "" {
		return parseAPIToken(authHeader)
	}

	token := r.URL.Query().Get("token")
	if token != "" {
		return parseURLToken(token, r.URL.String())
	}

	return nil, nil
}

// parseAPIToken parses an API token from Authorization header
func parseAPIToken(authHeader string) (*Session, error) {
	parts := strings.SplitN(authHeader, " ", 2)
	if len(parts) != 2 || strings.ToLower(parts[0]) != "bearer" {
		return nil, fmt.Errorf("invalid authorization header format")
	}

	return &Session{
		Type:   SessionTypeAPI,
		UserID: parts[1],
	}, nil
}

// parseURLToken parses a URL token
func parseURLToken(token, requestURL string) (*Session, error) {
	return &Session{
		Type:     SessionTypeURL,
		URLMatch: requestURL,
	}, nil
}

// ValidateURLToken validates that the requested URL matches the signed URL
func ValidateURLToken(session *Session, requestURL string) ValidationResult {
	if session.Type != SessionTypeURL && session.Type != SessionTypeAnonymousURL {
		return ValidationResult{IsValid: true}
	}

	parsedRequest, err := url.Parse(requestURL)
	if err != nil {
		return ValidationResult{
			IsValid: false,
			Reason:  fmt.Sprintf("Failed to parse request URL: %v", err),
		}
	}

	parsedStored, err := url.Parse(session.URLMatch)
	if err != nil {
		return ValidationResult{
			IsValid: false,
			Reason:  fmt.Sprintf("Failed to parse stored URL: %v", err),
		}
	}

	if parsedRequest.Path != parsedStored.Path {
		return ValidationResult{
			IsValid: false,
			Reason:  "URL path mismatch",
		}
	}

	requestQuery := parsedRequest.Query()
	storedQuery := parsedStored.Query()

	for key := range storedQuery {
		if key == "token" {
			continue
		}
		if requestQuery.Get(key) != storedQuery.Get(key) {
			return ValidationResult{
				IsValid: false,
				Reason:  fmt.Sprintf("Query parameter mismatch: %s", key),
			}
		}
	}

	return ValidationResult{IsValid: true}
}

type ValidationResult struct {
	IsValid bool
	Reason  string
}

// RequireAuth is a middleware that enforces authentication
func RequireAuth(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		isDev := os.Getenv("NODE_ENV") == "development"

		session, err := ParseRequestSession(r)
		if err != nil || session == nil {
			if isDev {
				fmt.Println("DEV MODE: No session found, but allowing request to continue")
				next(w, r)
				return
			}
			respondError(w, 401, "UNAUTHORIZED", "Authentication required", nil)
			return
		}

		if session.Type == SessionTypeAPI && session.ExpiredAt != nil && session.ExpiredAt.Before(time.Now()) {
			if isDev {
				fmt.Println("DEV MODE: API token expired, but allowing request to continue")
				next(w, r)
				return
			}
			respondError(w, 401, "TOKEN_EXPIRED", "API token has expired", nil)
			return
		}

		if session.Type == SessionTypeURL || session.Type == SessionTypeAnonymousURL {
			validation := ValidateURLToken(session, r.URL.String())
			if !validation.IsValid {
				fmt.Printf("url validation failed: %s\n", validation.Reason)
				if isDev {
					fmt.Println("DEV MODE: URL mismatch, but allowing request to continue")
					next(w, r)
					return
				}
				respondError(w, 401, "URL_MISMATCH", "Request URL does not match signed URL", nil)
				return
			}
		}

		next(w, r)
	}
}

func respondError(w http.ResponseWriter, status int, code, message string, details map[string]interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	
	errorResponse := map[string]interface{}{
		"error": map[string]interface{}{
			"code":    code,
			"message": message,
		},
	}
	
	if details != nil {
		errorResponse["error"].(map[string]interface{})["details"] = details
	}
	
	fmt.Fprintf(w, `{"error":{"code":"%s","message":"%s"}}`, code, message)
}

