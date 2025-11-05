package transitions

import "fmt"

// CalculateNextState is a pure function that determines the next state given current state and event.
// Returns the next state and whether the transition is valid.
// No I/O, no mutations, deterministic - easy to test.
func CalculateNextState(current State, event Event) TransitionResult {
	// Check if current state exists in transition table
	validEvents, stateExists := StateTransitionTable[current]
	if !stateExists {
		return TransitionResult{
			NextState: current,
			Valid:     false,
			Reason:    fmt.Sprintf("unknown state: %s", current),
		}
	}

	// Check if event is valid for current state
	nextState, eventValid := validEvents[event]
	if !eventValid {
		return TransitionResult{
			NextState: current,
			Valid:     false,
			Reason:    fmt.Sprintf("invalid transition from %s on event %s", current, event),
		}
	}

	return TransitionResult{
		NextState: nextState,
		Valid:     true,
		Reason:    fmt.Sprintf("%s -> %s (event: %s)", current, nextState, event),
	}
}

// ValidateTransition checks if a transition is valid without calculating the next state.
// Pure function: deterministic, no side effects.
func ValidateTransition(from State, event Event) error {
	result := CalculateNextState(from, event)
	if !result.Valid {
		return fmt.Errorf(result.Reason)
	}
	return nil
}

// IsTerminalState checks if a state is terminal (no further transitions possible).
// Pure function: deterministic, no side effects.
func IsTerminalState(state State) bool {
	return state == StateTerminal
}

// GetValidEvents returns all valid events for a given state.
// Pure function: deterministic, no side effects.
func GetValidEvents(state State) []Event {
	validEvents, exists := StateTransitionTable[state]
	if !exists {
		return []Event{}
	}

	events := make([]Event, 0, len(validEvents))
	for event := range validEvents {
		events = append(events, event)
	}
	return events
}

// GetAllStates returns all possible states.
// Pure function: deterministic, no side effects.
func GetAllStates() []State {
	return []State{
		StateUndefined,
		StateConnecting,
		StateConnected,
		StateDisconnecting,
		StateTerminal,
	}
}

// GetAllEvents returns all possible events.
// Pure function: deterministic, no side effects.
func GetAllEvents() []Event {
	return []Event{
		EventInit,
		EventConnectSuccess,
		EventTimeout,
		EventHangup,
		EventDisconnect,
		EventNoPong,
		EventDisconnectSuccess,
	}
}
