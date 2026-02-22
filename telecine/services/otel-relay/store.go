package main

import (
	"sort"
	"strings"
	"sync"

	"go.opentelemetry.io/collector/pdata/pcommon"
	"go.opentelemetry.io/collector/pdata/ptrace"
)

// FlatSpan is a denormalized, query-friendly representation of an OTel span.
type FlatSpan struct {
	TraceID      string            `json:"traceId"`
	SpanID       string            `json:"spanId"`
	ParentSpanID string            `json:"parentSpanId,omitempty"`
	Name         string            `json:"name"`
	StartTimeMs  int64             `json:"startTimeMs"`
	EndTimeMs    int64             `json:"endTimeMs"`
	DurationMs   float64           `json:"durationMs"`
	ServiceName  string            `json:"serviceName"`
	Attributes   map[string]string `json:"attributes"`
}

// SpanStore indexes spans as they arrive for direct querying.
// It maintains three secondary indexes (by trace, by name, by attribute)
// alongside an insertion-order slice for full scans and eviction.
type SpanStore struct {
	mu       sync.RWMutex
	spans    []*FlatSpan
	byTrace  map[string][]*FlatSpan
	byName   map[string][]*FlatSpan
	byAttr   map[string]map[string][]*FlatSpan
	seen     map[string]bool
	maxSpans int
}

func NewSpanStore(maxSpans int) *SpanStore {
	return &SpanStore{
		spans:    make([]*FlatSpan, 0, min(maxSpans, 1024)),
		byTrace:  make(map[string][]*FlatSpan),
		byName:   make(map[string][]*FlatSpan),
		byAttr:   make(map[string]map[string][]*FlatSpan),
		seen:     make(map[string]bool),
		maxSpans: maxSpans,
	}
}

// Index parses an OTLP Traces batch and adds all spans to the store.
func (s *SpanStore) Index(traces ptrace.Traces) {
	s.mu.Lock()
	defer s.mu.Unlock()

	for i := 0; i < traces.ResourceSpans().Len(); i++ {
		rs := traces.ResourceSpans().At(i)
		serviceName := ""
		if v, ok := rs.Resource().Attributes().Get("service.name"); ok {
			serviceName = v.Str()
		}

		for j := 0; j < rs.ScopeSpans().Len(); j++ {
			ss := rs.ScopeSpans().At(j)
			for k := 0; k < ss.Spans().Len(); k++ {
				span := ss.Spans().At(k)
				spanID := span.SpanID().String()
				if s.seen[spanID] {
					continue
				}
				if len(s.spans) >= s.maxSpans {
					s.evictOldest()
				}

				parentID := span.ParentSpanID().String()
				if parentID == (pcommon.SpanID{}).String() {
					parentID = ""
				}

				startMs := int64(span.StartTimestamp()) / 1_000_000
				endMs := int64(span.EndTimestamp()) / 1_000_000

				attrs := make(map[string]string)
				span.Attributes().Range(func(k string, v pcommon.Value) bool {
					attrs[k] = v.AsString()
					return true
				})

				fs := &FlatSpan{
					TraceID:      span.TraceID().String(),
					SpanID:       spanID,
					ParentSpanID: parentID,
					Name:         span.Name(),
					StartTimeMs:  startMs,
					EndTimeMs:    endMs,
					DurationMs:   float64(endMs - startMs),
					ServiceName:  serviceName,
					Attributes:   attrs,
				}

				s.spans = append(s.spans, fs)
				s.seen[spanID] = true
				s.byTrace[fs.TraceID] = append(s.byTrace[fs.TraceID], fs)
				s.byName[fs.Name] = append(s.byName[fs.Name], fs)
				for k, v := range attrs {
					if s.byAttr[k] == nil {
						s.byAttr[k] = make(map[string][]*FlatSpan)
					}
					s.byAttr[k][v] = append(s.byAttr[k][v], fs)
				}
			}
		}
	}
}

// evictOldest removes the oldest span and updates all indexes. Called under write lock.
func (s *SpanStore) evictOldest() {
	if len(s.spans) == 0 {
		return
	}
	old := s.spans[0]
	s.spans = s.spans[1:]
	delete(s.seen, old.SpanID)

	s.byTrace[old.TraceID] = removeSpan(s.byTrace[old.TraceID], old.SpanID)
	if len(s.byTrace[old.TraceID]) == 0 {
		delete(s.byTrace, old.TraceID)
	}

	s.byName[old.Name] = removeSpan(s.byName[old.Name], old.SpanID)
	if len(s.byName[old.Name]) == 0 {
		delete(s.byName, old.Name)
	}

	for k, v := range old.Attributes {
		if s.byAttr[k] != nil {
			s.byAttr[k][v] = removeSpan(s.byAttr[k][v], old.SpanID)
			if len(s.byAttr[k][v]) == 0 {
				delete(s.byAttr[k], v)
			}
		}
	}
}

func removeSpan(slice []*FlatSpan, spanID string) []*FlatSpan {
	for i, sp := range slice {
		if sp.SpanID == spanID {
			return append(slice[:i], slice[i+1:]...)
		}
	}
	return slice
}

// Clear resets the store entirely.
func (s *SpanStore) Clear() {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.spans = s.spans[:0]
	s.byTrace = make(map[string][]*FlatSpan)
	s.byName = make(map[string][]*FlatSpan)
	s.byAttr = make(map[string]map[string][]*FlatSpan)
	s.seen = make(map[string]bool)
}

// SpanQuery holds filter parameters for QuerySpans.
type SpanQuery struct {
	Name       string
	NamePrefix string
	TraceID    string
	Attrs      map[string]string
	FromMs     int64
	ToMs       int64
	Limit      int
}

// QuerySpans returns spans matching all provided filters.
// Uses the most selective available index as a starting set, then filters the rest.
func (s *SpanStore) QuerySpans(q SpanQuery) []*FlatSpan {
	s.mu.RLock()
	defer s.mu.RUnlock()

	if q.Limit <= 0 || q.Limit > 1000 {
		q.Limit = 100
	}

	// Pick the most selective index as the candidate set.
	var candidates []*FlatSpan
	switch {
	case q.TraceID != "":
		candidates = s.byTrace[q.TraceID]
	case q.Name != "":
		candidates = s.byName[q.Name]
	case len(q.Attrs) > 0:
		// Use the attr index entry with the fewest spans.
		for k, v := range q.Attrs {
			if vals, ok := s.byAttr[k]; ok {
				if c, ok := vals[v]; ok {
					if candidates == nil || len(c) < len(candidates) {
						candidates = c
					}
				}
			}
		}
	}
	if candidates == nil {
		candidates = s.spans
	}

	var result []*FlatSpan
	for _, sp := range candidates {
		if matchSpan(sp, q) {
			result = append(result, sp)
			if len(result) >= q.Limit {
				break
			}
		}
	}
	return result
}

func matchSpan(sp *FlatSpan, q SpanQuery) bool {
	if q.Name != "" && sp.Name != q.Name {
		return false
	}
	if q.NamePrefix != "" && !strings.HasPrefix(sp.Name, q.NamePrefix) {
		return false
	}
	if q.TraceID != "" && sp.TraceID != q.TraceID {
		return false
	}
	if q.FromMs > 0 && sp.StartTimeMs < q.FromMs {
		return false
	}
	if q.ToMs > 0 && sp.StartTimeMs > q.ToMs {
		return false
	}
	for k, v := range q.Attrs {
		if sp.Attributes[k] != v {
			return false
		}
	}
	return true
}

// TraceEntry summarizes a single trace for list responses.
type TraceEntry struct {
	TraceID     string  `json:"traceId"`
	RootSpan    string  `json:"rootSpan"`
	DurationMs  float64 `json:"durationMs"`
	SpanCount   int     `json:"spanCount"`
	StartTimeMs int64   `json:"startTimeMs"`
	ServiceName string  `json:"serviceName"`
}

// QueryTraces returns summarized trace entries, optionally filtered.
func (s *SpanStore) QueryTraces(service, nameContains string, fromMs, toMs int64, limit int) []TraceEntry {
	s.mu.RLock()
	defer s.mu.RUnlock()

	if limit <= 0 || limit > 1000 {
		limit = 50
	}

	entries := make([]TraceEntry, 0, len(s.byTrace))
	for traceID, spans := range s.byTrace {
		if len(spans) == 0 {
			continue
		}

		var root *FlatSpan
		var minStart int64 = -1
		var maxEnd int64
		for _, sp := range spans {
			if sp.ParentSpanID == "" && root == nil {
				root = sp
			}
			if minStart < 0 || sp.StartTimeMs < minStart {
				minStart = sp.StartTimeMs
			}
			if sp.EndTimeMs > maxEnd {
				maxEnd = sp.EndTimeMs
			}
		}
		if root == nil {
			root = spans[0]
		}

		if service != "" && root.ServiceName != service {
			continue
		}
		if nameContains != "" && !strings.Contains(root.Name, nameContains) {
			continue
		}
		if fromMs > 0 && minStart < fromMs {
			continue
		}
		if toMs > 0 && minStart > toMs {
			continue
		}

		entries = append(entries, TraceEntry{
			TraceID:     traceID,
			RootSpan:    root.Name,
			DurationMs:  float64(maxEnd - minStart),
			SpanCount:   len(spans),
			StartTimeMs: minStart,
			ServiceName: root.ServiceName,
		})
	}

	sort.Slice(entries, func(i, j int) bool {
		return entries[i].StartTimeMs > entries[j].StartTimeMs
	})
	if len(entries) > limit {
		entries = entries[:limit]
	}
	return entries
}

// Summary describes the current state of the store.
type Summary struct {
	SpanCount  int      `json:"spanCount"`
	TraceCount int      `json:"traceCount"`
	Services   []string `json:"services"`
	FromMs     int64    `json:"fromMs"`
	ToMs       int64    `json:"toMs"`
}

// GetSummary returns aggregate statistics about the stored spans.
func (s *SpanStore) GetSummary() Summary {
	s.mu.RLock()
	defer s.mu.RUnlock()

	serviceSet := make(map[string]bool)
	var fromMs int64 = -1
	var toMs int64
	for _, sp := range s.spans {
		serviceSet[sp.ServiceName] = true
		if fromMs < 0 || sp.StartTimeMs < fromMs {
			fromMs = sp.StartTimeMs
		}
		if sp.EndTimeMs > toMs {
			toMs = sp.EndTimeMs
		}
	}

	services := make([]string, 0, len(serviceSet))
	for svc := range serviceSet {
		services = append(services, svc)
	}
	sort.Strings(services)

	if fromMs < 0 {
		fromMs = 0
	}
	return Summary{
		SpanCount:  len(s.spans),
		TraceCount: len(s.byTrace),
		Services:   services,
		FromMs:     fromMs,
		ToMs:       toMs,
	}
}
