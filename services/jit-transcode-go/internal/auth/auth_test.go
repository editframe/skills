package auth

import (
	"net/http"
	"net/http/httptest"
	"os"
	"testing"
)

func TestParseRequestSession(t *testing.T) {
	t.Run("API token from Authorization header", func(t *testing.T) {
		req := httptest.NewRequest("GET", "/test", nil)
		req.Header.Set("Authorization", "Bearer test-token-123")

		session, err := ParseRequestSession(req)
		if err != nil {
			t.Fatalf("Unexpected error: %v", err)
		}

		if session == nil {
			t.Fatal("Expected session to be non-nil")
		}

		if session.Type != SessionTypeAPI {
			t.Errorf("Expected API session type, got %v", session.Type)
		}

		if session.UserID != "test-token-123" {
			t.Errorf("Expected user ID 'test-token-123', got %s", session.UserID)
		}
	})

	t.Run("URL token from query parameter", func(t *testing.T) {
		req := httptest.NewRequest("GET", "/test?token=url-token-456&url=https://example.com/video.mp4", nil)

		session, err := ParseRequestSession(req)
		if err != nil {
			t.Fatalf("Unexpected error: %v", err)
		}

		if session == nil {
			t.Fatal("Expected session to be non-nil")
		}

		if session.Type != SessionTypeURL {
			t.Errorf("Expected URL session type, got %v", session.Type)
		}
	})

	t.Run("No authentication", func(t *testing.T) {
		req := httptest.NewRequest("GET", "/test", nil)

		session, err := ParseRequestSession(req)
		if err != nil {
			t.Fatalf("Unexpected error: %v", err)
		}

		if session != nil {
			t.Error("Expected session to be nil when no auth provided")
		}
	})
}

func TestValidateURLToken(t *testing.T) {
	t.Run("Valid URL token", func(t *testing.T) {
		session := &Session{
			Type:     SessionTypeURL,
			URLMatch: "/api/v1/transcode/high/1.m4s?url=https://example.com/video.mp4",
		}

		result := ValidateURLToken(session, "/api/v1/transcode/high/1.m4s?url=https://example.com/video.mp4&extra=param")

		if !result.IsValid {
			t.Errorf("Expected valid result, got: %s", result.Reason)
		}
	})

	t.Run("Invalid path", func(t *testing.T) {
		session := &Session{
			Type:     SessionTypeURL,
			URLMatch: "/api/v1/transcode/high/1.m4s?url=https://example.com/video.mp4",
		}

		result := ValidateURLToken(session, "/api/v1/different/path?url=https://example.com/video.mp4")

		if result.IsValid {
			t.Error("Expected invalid result for different path")
		}
	})

	t.Run("Invalid query parameter", func(t *testing.T) {
		session := &Session{
			Type:     SessionTypeURL,
			URLMatch: "/api/v1/transcode/high/1.m4s?url=https://example.com/video.mp4",
		}

		result := ValidateURLToken(session, "/api/v1/transcode/high/1.m4s?url=https://different.com/video.mp4")

		if result.IsValid {
			t.Error("Expected invalid result for different URL parameter")
		}
	})

	t.Run("Non-URL session type bypasses validation", func(t *testing.T) {
		session := &Session{
			Type: SessionTypeAPI,
		}

		result := ValidateURLToken(session, "/any/path")

		if !result.IsValid {
			t.Error("Expected valid result for non-URL session type")
		}
	})
}

func TestRequireAuth(t *testing.T) {
	handlerCalled := false
	testHandler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		handlerCalled = true
		w.WriteHeader(http.StatusOK)
	})

	t.Run("Development mode bypasses auth", func(t *testing.T) {
		os.Setenv("NODE_ENV", "development")
		defer os.Unsetenv("NODE_ENV")

		handlerCalled = false
		req := httptest.NewRequest("GET", "/test", nil)
		rec := httptest.NewRecorder()

		authHandler := RequireAuth(testHandler)
		authHandler(rec, req)

		if !handlerCalled {
			t.Error("Expected handler to be called in development mode")
		}

		if rec.Code != http.StatusOK {
			t.Errorf("Expected 200, got %d", rec.Code)
		}
	})

	t.Run("Production mode requires auth", func(t *testing.T) {
		os.Setenv("NODE_ENV", "production")
		defer os.Unsetenv("NODE_ENV")

		handlerCalled = false
		req := httptest.NewRequest("GET", "/test", nil)
		rec := httptest.NewRecorder()

		authHandler := RequireAuth(testHandler)
		authHandler(rec, req)

		if handlerCalled {
			t.Error("Expected handler to not be called without auth")
		}

		if rec.Code != http.StatusUnauthorized {
			t.Errorf("Expected 401, got %d", rec.Code)
		}
	})

	t.Run("Valid API token allows access", func(t *testing.T) {
		os.Setenv("NODE_ENV", "production")
		defer os.Unsetenv("NODE_ENV")

		handlerCalled = false
		req := httptest.NewRequest("GET", "/test", nil)
		req.Header.Set("Authorization", "Bearer valid-token")
		rec := httptest.NewRecorder()

		authHandler := RequireAuth(testHandler)
		authHandler(rec, req)

		if !handlerCalled {
			t.Error("Expected handler to be called with valid auth")
		}

		if rec.Code != http.StatusOK {
			t.Errorf("Expected 200, got %d", rec.Code)
		}
	})
}

