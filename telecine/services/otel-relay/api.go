package main

import (
	"encoding/json"
	"net/http"
	"strconv"
	"strings"
)

// registerAPI mounts the /api/* query endpoints onto the given mux.
func registerAPI(mux *http.ServeMux, store *SpanStore, buffer *EventBuffer) {
	mux.HandleFunc("/api/summary", corsMiddleware(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet {
			http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
			return
		}
		writeJSON(w, store.GetSummary())
	}))

	// /api/traces  — list traces (with optional filters)
	// /api/traces/{traceId} — single trace with all its spans
	mux.HandleFunc("/api/traces/", corsMiddleware(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet {
			http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
			return
		}
		traceID := strings.TrimPrefix(r.URL.Path, "/api/traces/")
		if traceID == "" {
			http.Error(w, "traceId required", http.StatusBadRequest)
			return
		}
		spans := store.QuerySpans(SpanQuery{TraceID: traceID, Limit: 1000})
		writeJSON(w, map[string]interface{}{
			"traceId": traceID,
			"spans":   spans,
		})
	}))

	mux.HandleFunc("/api/traces", corsMiddleware(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet {
			http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
			return
		}
		q := r.URL.Query()
		fromMs, _ := strconv.ParseInt(q.Get("from"), 10, 64)
		toMs, _ := strconv.ParseInt(q.Get("to"), 10, 64)
		limit, _ := strconv.Atoi(q.Get("limit"))
		writeJSON(w, store.QueryTraces(q.Get("service"), q.Get("name"), fromMs, toMs, limit))
	}))

	mux.HandleFunc("/api/spans", corsMiddleware(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet {
			http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
			return
		}
		q := r.URL.Query()
		fromMs, _ := strconv.ParseInt(q.Get("from"), 10, 64)
		toMs, _ := strconv.ParseInt(q.Get("to"), 10, 64)
		limit, _ := strconv.Atoi(q.Get("limit"))

		attrs := make(map[string]string)
		for key, vals := range q {
			if strings.HasPrefix(key, "attr.") && len(vals) > 0 {
				attrs[strings.TrimPrefix(key, "attr.")] = vals[0]
			}
		}

		writeJSON(w, store.QuerySpans(SpanQuery{
			Name:       q.Get("name"),
			NamePrefix: q.Get("namePrefix"),
			TraceID:    q.Get("traceId"),
			Attrs:      attrs,
			FromMs:     fromMs,
			ToMs:       toMs,
			Limit:      limit,
		}))
	}))

	mux.HandleFunc("/api/buffer", corsMiddleware(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodDelete {
			http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
			return
		}
		store.Clear()
		buffer.Clear()
		w.WriteHeader(http.StatusNoContent)
	}))
}

func corsMiddleware(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		next(w, r)
	}
}

func writeJSON(w http.ResponseWriter, v interface{}) {
	w.Header().Set("Content-Type", "application/json")
	enc := json.NewEncoder(w)
	enc.SetIndent("", "  ")
	if err := enc.Encode(v); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
	}
}
