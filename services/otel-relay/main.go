package main

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net"
	"net/http"
	"os"
	"os/signal"
	"strconv"
	"sync"
	"syscall"
	"time"

	"go.opentelemetry.io/collector/pdata/plog"
	"go.opentelemetry.io/collector/pdata/plog/plogotlp"
	"go.opentelemetry.io/collector/pdata/ptrace"
	"go.opentelemetry.io/collector/pdata/ptrace/ptraceotlp"
	"google.golang.org/grpc"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}

type EventBuffer struct {
	mu     sync.RWMutex
	events [][]byte
	maxLen int
	pos    int
	full   bool
}

func NewEventBuffer(maxLen int) *EventBuffer {
	return &EventBuffer{
		events: make([][]byte, maxLen),
		maxLen: maxLen,
	}
}

func (b *EventBuffer) Add(data []byte) {
	b.mu.Lock()
	defer b.mu.Unlock()

	b.events[b.pos] = data
	b.pos++
	if b.pos >= b.maxLen {
		b.pos = 0
		b.full = true
	}
}

func (b *EventBuffer) Clear() {
	b.mu.Lock()
	defer b.mu.Unlock()
	b.pos = 0
	b.full = false
	for i := range b.events {
		b.events[i] = nil
	}
}

func (b *EventBuffer) GetAll() [][]byte {
	b.mu.RLock()
	defer b.mu.RUnlock()

	if !b.full {
		result := make([][]byte, b.pos)
		copy(result, b.events[:b.pos])
		return result
	}

	result := make([][]byte, b.maxLen)
	copy(result[:b.maxLen-b.pos], b.events[b.pos:])
	copy(result[b.maxLen-b.pos:], b.events[:b.pos])
	return result
}

type SSEBroadcaster struct {
	mu        sync.RWMutex
	clients   map[chan []byte]bool
	buffer    *EventBuffer
	addClient chan chan []byte
	rmClient  chan chan []byte
	broadcast chan []byte
}

func NewSSEBroadcaster(bufferSize int) *SSEBroadcaster {
	b := &SSEBroadcaster{
		clients:   make(map[chan []byte]bool),
		buffer:    NewEventBuffer(bufferSize),
		addClient: make(chan chan []byte),
		rmClient:  make(chan chan []byte),
		broadcast: make(chan []byte, 100),
	}
	go b.run()
	return b
}

func (b *SSEBroadcaster) run() {
	for {
		select {
		case client := <-b.addClient:
			b.clients[client] = true
		case client := <-b.rmClient:
			delete(b.clients, client)
			close(client)
		case msg := <-b.broadcast:
			b.buffer.Add(msg)
			for client := range b.clients {
				select {
				case client <- msg:
				default:
				}
			}
		}
	}
}

func (b *SSEBroadcaster) BroadcastEvent(eventType string, data interface{}) {
	jsonData, err := json.Marshal(data)
	if err != nil {
		log.Printf("Failed to marshal event: %v", err)
		return
	}

	envelope := map[string]interface{}{
		"type":      eventType,
		"data":      json.RawMessage(jsonData),
		"timestamp": time.Now().UnixMilli(),
	}

	envelopeJSON, err := json.Marshal(envelope)
	if err != nil {
		log.Printf("Failed to marshal envelope: %v", err)
		return
	}

	b.broadcast <- envelopeJSON
}

func (b *SSEBroadcaster) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("Cache-Control", "no-cache")
	w.Header().Set("Connection", "keep-alive")
	w.Header().Set("Access-Control-Allow-Origin", "*")

	flusher, ok := w.(http.Flusher)
	if !ok {
		http.Error(w, "Streaming unsupported", http.StatusInternalServerError)
		return
	}

	clientChan := make(chan []byte, 10)
	b.addClient <- clientChan
	defer func() { b.rmClient <- clientChan }()

	for _, event := range b.buffer.GetAll() {
		if event != nil {
			fmt.Fprintf(w, "data: %s\n\n", event)
			flusher.Flush()
		}
	}

	ctx := r.Context()
	for {
		select {
		case <-ctx.Done():
			return
		case msg := <-clientChan:
			fmt.Fprintf(w, "data: %s\n\n", msg)
			flusher.Flush()
		}
	}
}

type traceService struct {
	ptraceotlp.UnimplementedGRPCServer
	broadcaster *SSEBroadcaster
	store       *SpanStore
}

func (s *traceService) Export(ctx context.Context, req ptraceotlp.ExportRequest) (ptraceotlp.ExportResponse, error) {
	marshaler := ptrace.JSONMarshaler{}
	jsonBytes, err := marshaler.MarshalTraces(req.Traces())
	if err != nil {
		return ptraceotlp.NewExportResponse(), status.Error(codes.Internal, err.Error())
	}

	var tracesData interface{}
	if err := json.Unmarshal(jsonBytes, &tracesData); err != nil {
		return ptraceotlp.NewExportResponse(), status.Error(codes.Internal, err.Error())
	}

	s.broadcaster.BroadcastEvent("trace", tracesData)
	s.store.Index(req.Traces())
	return ptraceotlp.NewExportResponse(), nil
}

type logService struct {
	plogotlp.UnimplementedGRPCServer
	broadcaster *SSEBroadcaster
}

func (s *logService) Export(ctx context.Context, req plogotlp.ExportRequest) (plogotlp.ExportResponse, error) {
	marshaler := plog.JSONMarshaler{}
	jsonBytes, err := marshaler.MarshalLogs(req.Logs())
	if err != nil {
		return plogotlp.NewExportResponse(), status.Error(codes.Internal, err.Error())
	}

	var logsData interface{}
	if err := json.Unmarshal(jsonBytes, &logsData); err != nil {
		return plogotlp.NewExportResponse(), status.Error(codes.Internal, err.Error())
	}

	s.broadcaster.BroadcastEvent("log", logsData)
	return plogotlp.NewExportResponse(), nil
}

func getEnvInt(key string, defaultVal int) int {
	if val := os.Getenv(key); val != "" {
		if i, err := strconv.Atoi(val); err == nil {
			return i
		}
	}
	return defaultVal
}

func getEnv(key, defaultVal string) string {
	if val := os.Getenv(key); val != "" {
		return val
	}
	return defaultVal
}

func main() {
	grpcPort := getEnvInt("OTEL_GRPC_PORT", 4317)
	httpPort := getEnvInt("OTEL_HTTP_PORT", 4318)
	ssePort := getEnvInt("SSE_PORT", 4319)
	bufferSize := getEnvInt("BUFFER_SIZE", 50000)

	log.Printf("Starting OTEL Relay Service")
	log.Printf("  gRPC receiver: :%d", grpcPort)
	log.Printf("  HTTP receiver: :%d", httpPort)
	log.Printf("  SSE broadcast: :%d", ssePort)
	log.Printf("  Buffer size: %d events", bufferSize)

	broadcaster := NewSSEBroadcaster(bufferSize)
	store := NewSpanStore(bufferSize)

	grpcServer := grpc.NewServer()
	ptraceotlp.RegisterGRPCServer(grpcServer, &traceService{broadcaster: broadcaster, store: store})
	plogotlp.RegisterGRPCServer(grpcServer, &logService{broadcaster: broadcaster})

	go func() {
		addr := fmt.Sprintf(":%d", grpcPort)
		lis, err := net.Listen("tcp", addr)
		if err != nil {
			log.Fatalf("Failed to listen on %s: %v", addr, err)
		}
		log.Printf("gRPC server listening on %s", addr)
		if err := grpcServer.Serve(lis); err != nil {
			log.Fatalf("Failed to serve gRPC: %v", err)
		}
	}()

	httpMux := http.NewServeMux()
	httpMux.HandleFunc("/v1/traces", func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
			return
		}

		body, err := io.ReadAll(r.Body)
		if err != nil {
			log.Printf("Error reading request body: %v", err)
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}

		req := ptraceotlp.NewExportRequest()

		contentType := r.Header.Get("Content-Type")
		if contentType == "application/json" {
			if err := req.UnmarshalJSON(body); err != nil {
				log.Printf("Error unmarshaling JSON trace request (first 200 chars): %s", string(body[:min(200, len(body))]))
				log.Printf("Unmarshal error: %v", err)
				http.Error(w, err.Error(), http.StatusBadRequest)
				return
			}
		} else {
			if err := req.UnmarshalProto(body); err != nil {
				log.Printf("Error unmarshaling Proto trace request: %v", err)
				http.Error(w, err.Error(), http.StatusBadRequest)
				return
			}
		}

		marshaler := ptrace.JSONMarshaler{}
		jsonBytes, err := marshaler.MarshalTraces(req.Traces())
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}

		var tracesData interface{}
		if err := json.Unmarshal(jsonBytes, &tracesData); err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}

		log.Printf("Received and broadcasting trace data")
		broadcaster.BroadcastEvent("trace", tracesData)
		store.Index(req.Traces())

		resp := ptraceotlp.NewExportResponse()
		if contentType == "application/json" {
			respBytes, _ := resp.MarshalJSON()
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusOK)
			w.Write(respBytes)
		} else {
			respBytes, _ := resp.MarshalProto()
			w.Header().Set("Content-Type", "application/x-protobuf")
			w.WriteHeader(http.StatusOK)
			w.Write(respBytes)
		}
	})

	httpMux.HandleFunc("/v1/logs", func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
			return
		}

		body, err := io.ReadAll(r.Body)
		if err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}

		req := plogotlp.NewExportRequest()

		contentType := r.Header.Get("Content-Type")
		if contentType == "application/json" {
			if err := req.UnmarshalJSON(body); err != nil {
				http.Error(w, err.Error(), http.StatusBadRequest)
				return
			}
		} else {
			if err := req.UnmarshalProto(body); err != nil {
				http.Error(w, err.Error(), http.StatusBadRequest)
				return
			}
		}

		marshaler := plog.JSONMarshaler{}
		jsonBytes, err := marshaler.MarshalLogs(req.Logs())
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}

		var logsData interface{}
		if err := json.Unmarshal(jsonBytes, &logsData); err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}

		log.Printf("Received and broadcasting log data")
		broadcaster.BroadcastEvent("log", logsData)

		resp := plogotlp.NewExportResponse()
		if contentType == "application/json" {
			respBytes, _ := resp.MarshalJSON()
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusOK)
			w.Write(respBytes)
		} else {
			respBytes, _ := resp.MarshalProto()
			w.Header().Set("Content-Type", "application/x-protobuf")
			w.WriteHeader(http.StatusOK)
			w.Write(respBytes)
		}
	})

	go func() {
		addr := fmt.Sprintf(":%d", httpPort)
		log.Printf("HTTP server listening on %s", addr)
		if err := http.ListenAndServe(addr, httpMux); err != nil {
			log.Fatalf("Failed to serve HTTP: %v", err)
		}
	}()

	sseMux := http.NewServeMux()
	sseMux.Handle("/events", broadcaster)
	sseMux.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		w.Write([]byte("OK"))
	})
	registerAPI(sseMux, store, broadcaster.buffer)

	go func() {
		addr := fmt.Sprintf(":%d", ssePort)
		log.Printf("SSE server listening on %s/events", addr)
		if err := http.ListenAndServe(addr, sseMux); err != nil {
			log.Fatalf("Failed to serve SSE: %v", err)
		}
	}()

	sigChan := make(chan os.Signal, 1)
	signal.Notify(sigChan, os.Interrupt, syscall.SIGTERM)
	<-sigChan

	log.Println("Shutting down...")
	grpcServer.GracefulStop()
}
