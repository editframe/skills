package health

import (
	"encoding/json"
	"net/http"

	"github.com/editframe/telecine/scheduler-go/internal/pool"
	"github.com/editframe/telecine/scheduler-go/internal/queue"
)

type Handler struct {
	queues []queue.Queue
	pools  map[string]*pool.Pool
}

func NewHandler(queues []queue.Queue, pools map[string]*pool.Pool) *Handler {
	return &Handler{queues: queues, pools: pools}
}

func (h *Handler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	switch r.URL.Path {
	case "/health":
		w.WriteHeader(http.StatusOK)
		w.Write([]byte("ok"))
	case "/status":
		h.status(w)
	default:
		w.WriteHeader(http.StatusNotFound)
	}
}

func (h *Handler) status(w http.ResponseWriter) {
	type queueStatus struct {
		Name       string `json:"name"`
		PoolSize   int    `json:"poolSize"`
		MaxWorkers int    `json:"maxWorkers"`
	}

	statuses := make([]queueStatus, 0, len(h.queues))
	for _, q := range h.queues {
		size := 0
		if p, ok := h.pools[q.Name]; ok {
			size = p.Size()
		}
		statuses = append(statuses, queueStatus{
			Name:       q.Name,
			PoolSize:   size,
			MaxWorkers: q.MaxWorkerCount,
		})
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(statuses)
}
