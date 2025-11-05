package transitions

// State represents a connection state
type State string

const (
	StateConnecting    State = "connecting"
	StateConnected     State = "connected"
	StateDisconnecting State = "disconnecting"
	StateTerminal      State = "terminal"
	StateUndefined     State = "undefined"
)

// Event represents a state transition trigger
type Event string

const (
	EventInit              Event = "INIT"
	EventConnectSuccess    Event = "CONNECT_SUCCESS"
	EventTimeout           Event = "TIMEOUT"
	EventHangup            Event = "HANGUP"
	EventDisconnect        Event = "DISCONNECT"
	EventNoPong            Event = "NO_PONG"
	EventDisconnectSuccess Event = "DISCONNECT_SUCCESS"
)

// TransitionResult represents the outcome of a state transition
type TransitionResult struct {
	NextState State
	Valid     bool
	Reason    string
}

// StateTransitionTable defines valid transitions for each state
var StateTransitionTable = map[State]map[Event]State{
	StateUndefined: {
		EventInit: StateConnecting,
	},
	StateConnecting: {
		EventConnectSuccess: StateConnected,
		EventTimeout:        StateTerminal,
		EventHangup:         StateTerminal,
	},
	StateConnected: {
		EventNoPong:     StateDisconnecting,
		EventDisconnect: StateDisconnecting,
		EventHangup:     StateTerminal,
	},
	StateDisconnecting: {
		EventDisconnectSuccess: StateTerminal,
		EventTimeout:           StateTerminal,
		EventHangup:            StateTerminal,
	},
	StateTerminal: {
		// Terminal state has no valid transitions
	},
}
