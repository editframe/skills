package scheduler

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"runtime"
	"time"

	"github.com/rs/zerolog"
)

type Server struct {
	port       int
	server     *http.Server
	logger     *zerolog.Logger
	reconciler *Reconciler
}

func NewServer(port int, logger *zerolog.Logger) *Server {
	return &Server{
		port:   port,
		logger: logger,
	}
}

func (s *Server) SetReconciler(reconciler *Reconciler) {
	s.reconciler = reconciler
}

func (s *Server) Start(ctx context.Context) error {
	mux := http.NewServeMux()

	mux.HandleFunc("/healthz", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		w.Write([]byte("OK"))
	})

	mux.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		w.Write([]byte("OK"))
	})

	mux.HandleFunc("/api/scaling-info", func(w http.ResponseWriter, r *http.Request) {
		if s.reconciler == nil {
			w.WriteHeader(http.StatusServiceUnavailable)
			w.Write([]byte(`{"error": "reconciler not initialized"}`))
			return
		}

		scalingInfo := s.reconciler.GetScalingInfo()
		w.Header().Set("Content-Type", "application/json")
		if err := json.NewEncoder(w).Encode(scalingInfo); err != nil {
			s.logger.Error().Err(err).Msg("failed to encode scaling info")
			w.WriteHeader(http.StatusInternalServerError)
			return
		}
	})

	mux.HandleFunc("/api/status", func(w http.ResponseWriter, r *http.Request) {
		if s.reconciler == nil {
			w.WriteHeader(http.StatusServiceUnavailable)
			w.Write([]byte(`{"error": "reconciler not initialized"}`))
			return
		}

		var memStats runtime.MemStats
		runtime.ReadMemStats(&memStats)

		status := map[string]interface{}{
			"memory": map[string]interface{}{
				"heapAlloc":  memStats.HeapAlloc,
				"heapInUse":  memStats.HeapInuse,
				"heapSys":    memStats.HeapSys,
				"totalAlloc": memStats.TotalAlloc,
				"numGC":      memStats.NumGC,
				"lastGC":     memStats.LastGC,
			},
			"goroutines":  runtime.NumGoroutine(),
			"connections": s.reconciler.GetConnectionCounts(),
			"scaling":     s.reconciler.GetScalingInfo(),
		}

		w.Header().Set("Content-Type", "application/json")
		if err := json.NewEncoder(w).Encode(status); err != nil {
			s.logger.Error().Err(err).Msg("failed to encode status")
			w.WriteHeader(http.StatusInternalServerError)
			return
		}
	})

	mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/" {
			w.WriteHeader(http.StatusNotFound)
			w.Write([]byte("Not found"))
			return
		}
		w.WriteHeader(http.StatusNotFound)
		w.Write([]byte("Not found"))
	})

	s.server = &http.Server{
		Addr:    fmt.Sprintf(":%d", s.port),
		Handler: mux,
	}

	s.logger.Info().Int("port", s.port).Msg("starting HTTP server")

	go func() {
		<-ctx.Done()
		shutdownCtx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()
		s.server.Shutdown(shutdownCtx)
	}()

	if err := s.server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
		return fmt.Errorf("failed to start server: %w", err)
	}

	return nil
}

func (s *Server) Shutdown(ctx context.Context) error {
	return s.server.Shutdown(ctx)
}
