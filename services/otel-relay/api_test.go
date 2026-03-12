package main

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"go.opentelemetry.io/collector/pdata/pcommon"
)

func setupTestServer(store *SpanStore, buffer *EventBuffer) *http.ServeMux {
	mux := http.NewServeMux()
	registerAPI(mux, store, buffer)
	return mux
}

func TestAPISummary(t *testing.T) {
	store := NewSpanStore(100)
	buffer := NewEventBuffer(100)
	mux := setupTestServer(store, buffer)

	store.Index(makeTestTraces([16]byte{1}, [8]byte{1}, "Worker.executeJob", "Worker",
		map[string]string{"jobId": "job-1"}, 1000, 2000))

	req := httptest.NewRequest(http.MethodGet, "/api/summary", nil)
	w := httptest.NewRecorder()
	mux.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", w.Code, w.Body.String())
	}

	var summary Summary
	if err := json.NewDecoder(w.Body).Decode(&summary); err != nil {
		t.Fatalf("failed to decode response: %v", err)
	}
	if summary.SpanCount != 1 {
		t.Errorf("expected SpanCount=1, got %d", summary.SpanCount)
	}
	if summary.TraceCount != 1 {
		t.Errorf("expected TraceCount=1, got %d", summary.TraceCount)
	}
}

func TestAPISpans_ByName(t *testing.T) {
	store := NewSpanStore(100)
	buffer := NewEventBuffer(100)
	mux := setupTestServer(store, buffer)

	store.Index(makeTestTraces([16]byte{1}, [8]byte{1}, "SegmentEncoder.renderFrame", "SE",
		map[string]string{"renderId": "r1"}, 1000, 1210))
	store.Index(makeTestTraces([16]byte{2}, [8]byte{2}, "Worker.executeJob", "Worker",
		nil, 1000, 2000))

	req := httptest.NewRequest(http.MethodGet, "/api/spans?name=SegmentEncoder.renderFrame", nil)
	w := httptest.NewRecorder()
	mux.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", w.Code, w.Body.String())
	}

	var spans []*FlatSpan
	if err := json.NewDecoder(w.Body).Decode(&spans); err != nil {
		t.Fatalf("failed to decode: %v", err)
	}
	if len(spans) != 1 {
		t.Fatalf("expected 1 span, got %d", len(spans))
	}
	if spans[0].Name != "SegmentEncoder.renderFrame" {
		t.Errorf("expected SegmentEncoder.renderFrame, got %s", spans[0].Name)
	}
}

func TestAPISpans_ByNamePrefix(t *testing.T) {
	store := NewSpanStore(100)
	buffer := NewEventBuffer(100)
	mux := setupTestServer(store, buffer)

	store.Index(makeTestTraces([16]byte{1}, [8]byte{1}, "SegmentEncoder.renderFrame", "SE", nil, 1000, 1200))
	store.Index(makeTestTraces([16]byte{2}, [8]byte{2}, "SegmentEncoder.buildVideo", "SE", nil, 1000, 1200))
	store.Index(makeTestTraces([16]byte{3}, [8]byte{3}, "Worker.executeJob", "W", nil, 1000, 2000))

	req := httptest.NewRequest(http.MethodGet, "/api/spans?namePrefix=SegmentEncoder", nil)
	w := httptest.NewRecorder()
	mux.ServeHTTP(w, req)

	var spans []*FlatSpan
	json.NewDecoder(w.Body).Decode(&spans)
	if len(spans) != 2 {
		t.Fatalf("expected 2 spans, got %d", len(spans))
	}
}

func TestAPISpans_ByAttr(t *testing.T) {
	store := NewSpanStore(100)
	buffer := NewEventBuffer(100)
	mux := setupTestServer(store, buffer)

	store.Index(makeTestTraces([16]byte{1}, [8]byte{1}, "SegmentEncoder.renderFrame", "SE",
		map[string]string{"renderId": "render-abc"}, 1000, 1210))
	store.Index(makeTestTraces([16]byte{2}, [8]byte{2}, "SegmentEncoder.renderFrame", "SE",
		map[string]string{"renderId": "render-xyz"}, 2000, 2210))

	req := httptest.NewRequest(http.MethodGet, "/api/spans?attr.renderId=render-abc", nil)
	w := httptest.NewRecorder()
	mux.ServeHTTP(w, req)

	var spans []*FlatSpan
	json.NewDecoder(w.Body).Decode(&spans)
	if len(spans) != 1 {
		t.Fatalf("expected 1 span, got %d", len(spans))
	}
	if spans[0].Attributes["renderId"] != "render-abc" {
		t.Errorf("wrong renderId: %s", spans[0].Attributes["renderId"])
	}
}

func TestAPITraces_List(t *testing.T) {
	store := NewSpanStore(100)
	buffer := NewEventBuffer(100)
	mux := setupTestServer(store, buffer)

	store.Index(makeTestTraces([16]byte{1}, [8]byte{1}, "worker.workLoop", "Worker", nil, 1000, 65000))
	store.Index(makeTestTraces([16]byte{2}, [8]byte{2}, "worker.workLoop", "Worker", nil, 2000, 25000))

	req := httptest.NewRequest(http.MethodGet, "/api/traces", nil)
	w := httptest.NewRecorder()
	mux.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", w.Code, w.Body.String())
	}

	var traces []TraceEntry
	json.NewDecoder(w.Body).Decode(&traces)
	if len(traces) != 2 {
		t.Fatalf("expected 2 traces, got %d", len(traces))
	}
}

func TestAPITraces_ByID(t *testing.T) {
	store := NewSpanStore(100)
	buffer := NewEventBuffer(100)
	mux := setupTestServer(store, buffer)

	store.Index(makeTestTraces([16]byte{1}, [8]byte{1}, "Worker.executeJob", "Worker", nil, 1000, 2000))

	traceID := pcommon.TraceID([16]byte{1}).String()
	req := httptest.NewRequest(http.MethodGet, "/api/traces/"+traceID, nil)
	w := httptest.NewRecorder()
	mux.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", w.Code, w.Body.String())
	}

	var result map[string]interface{}
	json.NewDecoder(w.Body).Decode(&result)
	if result["traceId"] != traceID {
		t.Errorf("expected traceId %s, got %v", traceID, result["traceId"])
	}
	spans, _ := result["spans"].([]interface{})
	if len(spans) != 1 {
		t.Fatalf("expected 1 span in trace, got %d", len(spans))
	}
}

func TestAPIBuffer_Delete(t *testing.T) {
	store := NewSpanStore(100)
	buffer := NewEventBuffer(100)
	mux := setupTestServer(store, buffer)

	store.Index(makeTestTraces([16]byte{1}, [8]byte{1}, "test", "svc", nil, 1000, 2000))

	req := httptest.NewRequest(http.MethodDelete, "/api/buffer", nil)
	w := httptest.NewRecorder()
	mux.ServeHTTP(w, req)

	if w.Code != http.StatusNoContent {
		t.Fatalf("expected 204, got %d", w.Code)
	}
	if store.GetSummary().SpanCount != 0 {
		t.Error("expected 0 spans after buffer delete")
	}
}

func TestAPICORS(t *testing.T) {
	store := NewSpanStore(100)
	buffer := NewEventBuffer(100)
	mux := setupTestServer(store, buffer)

	req := httptest.NewRequest(http.MethodOptions, "/api/summary", nil)
	w := httptest.NewRecorder()
	mux.ServeHTTP(w, req)

	if w.Code != http.StatusNoContent {
		t.Fatalf("expected 204 for OPTIONS, got %d", w.Code)
	}
	if w.Header().Get("Access-Control-Allow-Origin") != "*" {
		t.Error("expected CORS header Access-Control-Allow-Origin: *")
	}
}
