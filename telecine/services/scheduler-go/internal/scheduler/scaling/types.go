package scaling

// QueueStats represents immutable queue statistics
type QueueStats struct {
	Queued    int
	Claimed   int
	Completed int
	Failed    int
	Stalled   int
}

// ConnectionState represents immutable connection state
type ConnectionState struct {
	Total   int // All connections (connecting, connected, disconnecting)
	Working int // Only connected connections
}

// ScalingHistory represents immutable scaling history
type ScalingHistory struct {
	SmoothedTarget float64
	LastRawTarget  int
}

// ScalingAction represents what action to take
type ScalingAction int

const (
	ActionNone ScalingAction = iota
	ActionScaleUp
	ActionScaleDown
	ActionCleanupState
)

func (a ScalingAction) String() string {
	switch a {
	case ActionNone:
		return "none"
	case ActionScaleUp:
		return "scale_up"
	case ActionScaleDown:
		return "scale_down"
	case ActionCleanupState:
		return "cleanup_state"
	default:
		return "unknown"
	}
}

// ScalingDecision represents an immutable scaling decision
type ScalingDecision struct {
	QueueName          string
	Action             ScalingAction
	TargetConnections  int
	CurrentConnections int
	WorkingConnections int
	Reason             string
	NewSmoothedTarget  float64

	// Intermediate values for observability
	NaturalQueueDepth     int
	ConcurrentQueueDepth  int
	ConstrainedQueueDepth int
	RawFairShare          int
}
