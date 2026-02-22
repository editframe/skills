package main

import (
	"testing"

	"go.opentelemetry.io/collector/pdata/pcommon"
	"go.opentelemetry.io/collector/pdata/ptrace"
)

func makeTestTraces(traceID [16]byte, spanID [8]byte, name, service string, attrs map[string]string, startMs, endMs int64) ptrace.Traces {
	traces := ptrace.NewTraces()
	rs := traces.ResourceSpans().AppendEmpty()
	rs.Resource().Attributes().PutStr("service.name", service)
	ss := rs.ScopeSpans().AppendEmpty()
	span := ss.Spans().AppendEmpty()
	span.SetTraceID(pcommon.TraceID(traceID))
	span.SetSpanID(pcommon.SpanID(spanID))
	span.SetName(name)
	span.SetStartTimestamp(pcommon.Timestamp(startMs * 1_000_000))
	span.SetEndTimestamp(pcommon.Timestamp(endMs * 1_000_000))
	for k, v := range attrs {
		span.Attributes().PutStr(k, v)
	}
	return traces
}

func TestSpanStore_Index(t *testing.T) {
	store := NewSpanStore(100)
	store.Index(makeTestTraces(
		[16]byte{1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16},
		[8]byte{1, 2, 3, 4, 5, 6, 7, 8},
		"Worker.executeJob", "Worker",
		map[string]string{"renderId": "render-1", "jobId": "job-1"},
		1000, 2000,
	))

	summary := store.GetSummary()
	if summary.SpanCount != 1 {
		t.Errorf("expected 1 span, got %d", summary.SpanCount)
	}
	if summary.TraceCount != 1 {
		t.Errorf("expected 1 trace, got %d", summary.TraceCount)
	}
	if len(summary.Services) != 1 || summary.Services[0] != "Worker" {
		t.Errorf("expected [Worker] services, got %v", summary.Services)
	}
}

func TestSpanStore_QueryByName(t *testing.T) {
	store := NewSpanStore(100)
	store.Index(makeTestTraces(
		[16]byte{1}, [8]byte{1},
		"SegmentEncoder.renderFrame", "SegmentEncoder",
		map[string]string{"frameTimeMs": "210"},
		1000, 1210,
	))
	store.Index(makeTestTraces(
		[16]byte{2}, [8]byte{2},
		"Worker.executeJob", "Worker",
		nil, 1000, 2000,
	))

	spans := store.QuerySpans(SpanQuery{Name: "SegmentEncoder.renderFrame", Limit: 10})
	if len(spans) != 1 {
		t.Fatalf("expected 1 span, got %d", len(spans))
	}
	if spans[0].Name != "SegmentEncoder.renderFrame" {
		t.Errorf("unexpected span name: %s", spans[0].Name)
	}
	if spans[0].DurationMs != 210 {
		t.Errorf("expected duration 210ms, got %f", spans[0].DurationMs)
	}
}

func TestSpanStore_QueryByNamePrefix(t *testing.T) {
	store := NewSpanStore(100)
	store.Index(makeTestTraces([16]byte{1}, [8]byte{1}, "SegmentEncoder.renderFrame", "SE", nil, 1000, 1200))
	store.Index(makeTestTraces([16]byte{2}, [8]byte{2}, "SegmentEncoder.buildVideo", "SE", nil, 1000, 1200))
	store.Index(makeTestTraces([16]byte{3}, [8]byte{3}, "Worker.executeJob", "W", nil, 1000, 2000))

	spans := store.QuerySpans(SpanQuery{NamePrefix: "SegmentEncoder", Limit: 10})
	if len(spans) != 2 {
		t.Fatalf("expected 2 spans, got %d", len(spans))
	}
}

func TestSpanStore_QueryByAttr(t *testing.T) {
	store := NewSpanStore(100)
	store.Index(makeTestTraces(
		[16]byte{1}, [8]byte{1},
		"SegmentEncoder.renderFrame", "SegmentEncoder",
		map[string]string{"renderId": "render-abc"},
		1000, 1210,
	))
	store.Index(makeTestTraces(
		[16]byte{2}, [8]byte{2},
		"SegmentEncoder.renderFrame", "SegmentEncoder",
		map[string]string{"renderId": "render-xyz"},
		2000, 2210,
	))

	spans := store.QuerySpans(SpanQuery{Attrs: map[string]string{"renderId": "render-abc"}, Limit: 10})
	if len(spans) != 1 {
		t.Fatalf("expected 1 span, got %d", len(spans))
	}
	if spans[0].Attributes["renderId"] != "render-abc" {
		t.Errorf("unexpected renderId: %s", spans[0].Attributes["renderId"])
	}
}

func TestSpanStore_QueryByMultipleAttrs(t *testing.T) {
	store := NewSpanStore(100)
	store.Index(makeTestTraces(
		[16]byte{1}, [8]byte{1}, "span", "svc",
		map[string]string{"renderId": "r1", "jobId": "j1"},
		1000, 2000,
	))
	store.Index(makeTestTraces(
		[16]byte{2}, [8]byte{2}, "span", "svc",
		map[string]string{"renderId": "r1", "jobId": "j2"},
		1000, 2000,
	))

	spans := store.QuerySpans(SpanQuery{
		Attrs: map[string]string{"renderId": "r1", "jobId": "j1"},
		Limit: 10,
	})
	if len(spans) != 1 {
		t.Fatalf("expected 1 span matching both attrs, got %d", len(spans))
	}
}

func TestSpanStore_QueryByTraceID(t *testing.T) {
	store := NewSpanStore(100)
	traceID := [16]byte{0xAB, 0xCD}
	store.Index(makeTestTraces(traceID, [8]byte{1}, "span-a", "svc", nil, 1000, 1100))
	store.Index(makeTestTraces(traceID, [8]byte{2}, "span-b", "svc", nil, 1100, 1200))
	store.Index(makeTestTraces([16]byte{0xEF}, [8]byte{3}, "span-c", "svc", nil, 1000, 1100))

	tid := pcommon.TraceID(traceID).String()
	spans := store.QuerySpans(SpanQuery{TraceID: tid, Limit: 10})
	if len(spans) != 2 {
		t.Fatalf("expected 2 spans for trace, got %d", len(spans))
	}
}

func TestSpanStore_Dedup(t *testing.T) {
	store := NewSpanStore(100)
	traces := makeTestTraces([16]byte{1}, [8]byte{1}, "Worker.executeJob", "Worker", nil, 1000, 2000)
	store.Index(traces)
	store.Index(traces) // Same spans — should dedup

	summary := store.GetSummary()
	if summary.SpanCount != 1 {
		t.Errorf("expected 1 span after dedup, got %d", summary.SpanCount)
	}
}

func TestSpanStore_CapEviction(t *testing.T) {
	store := NewSpanStore(3)
	store.Index(makeTestTraces([16]byte{1}, [8]byte{1}, "span", "svc", nil, 1000, 2000))
	store.Index(makeTestTraces([16]byte{2}, [8]byte{2}, "span", "svc", nil, 1000, 2000))
	store.Index(makeTestTraces([16]byte{3}, [8]byte{3}, "span", "svc", nil, 1000, 2000))
	store.Index(makeTestTraces([16]byte{4}, [8]byte{4}, "span", "svc", nil, 1000, 2000))

	summary := store.GetSummary()
	if summary.SpanCount != 3 {
		t.Errorf("expected 3 spans after eviction, got %d", summary.SpanCount)
	}
}

func TestSpanStore_Clear(t *testing.T) {
	store := NewSpanStore(100)
	store.Index(makeTestTraces([16]byte{1}, [8]byte{1}, "test", "svc", nil, 1000, 2000))
	store.Clear()

	summary := store.GetSummary()
	if summary.SpanCount != 0 {
		t.Errorf("expected 0 spans after clear, got %d", summary.SpanCount)
	}
	if summary.TraceCount != 0 {
		t.Errorf("expected 0 traces after clear, got %d", summary.TraceCount)
	}
	// Can index again after clear
	store.Index(makeTestTraces([16]byte{1}, [8]byte{1}, "test", "svc", nil, 1000, 2000))
	if store.GetSummary().SpanCount != 1 {
		t.Error("expected to be able to index after clear")
	}
}

func TestSpanStore_QueryTraces(t *testing.T) {
	store := NewSpanStore(100)
	store.Index(makeTestTraces([16]byte{1}, [8]byte{1}, "worker.workLoop", "Worker", nil, 1000, 65000))
	store.Index(makeTestTraces([16]byte{2}, [8]byte{2}, "worker.workLoop", "Worker", nil, 2000, 25000))

	traces := store.QueryTraces("", "", 0, 0, 10)
	if len(traces) != 2 {
		t.Fatalf("expected 2 traces, got %d", len(traces))
	}
	// Should be sorted descending by start time
	if traces[0].StartTimeMs < traces[1].StartTimeMs {
		t.Error("expected traces sorted by start time descending")
	}
}

func TestSpanStore_QueryTraces_ServiceFilter(t *testing.T) {
	store := NewSpanStore(100)
	store.Index(makeTestTraces([16]byte{1}, [8]byte{1}, "Worker.executeJob", "Worker", nil, 1000, 2000))
	store.Index(makeTestTraces([16]byte{2}, [8]byte{2}, "SegmentEncoder.renderAndMux", "SegmentEncoder", nil, 1000, 2000))

	traces := store.QueryTraces("Worker", "", 0, 0, 10)
	if len(traces) != 1 {
		t.Fatalf("expected 1 trace for Worker service, got %d", len(traces))
	}
	if traces[0].ServiceName != "Worker" {
		t.Errorf("expected Worker service, got %s", traces[0].ServiceName)
	}
}

func TestSpanStore_TimeRangeFilter(t *testing.T) {
	store := NewSpanStore(100)
	store.Index(makeTestTraces([16]byte{1}, [8]byte{1}, "span", "svc", nil, 1000, 2000))
	store.Index(makeTestTraces([16]byte{2}, [8]byte{2}, "span", "svc", nil, 5000, 6000))
	store.Index(makeTestTraces([16]byte{3}, [8]byte{3}, "span", "svc", nil, 9000, 10000))

	// Only spans starting between 2000 and 7000
	spans := store.QuerySpans(SpanQuery{FromMs: 2000, ToMs: 7000, Limit: 10})
	if len(spans) != 1 {
		t.Fatalf("expected 1 span in time range, got %d", len(spans))
	}
}
