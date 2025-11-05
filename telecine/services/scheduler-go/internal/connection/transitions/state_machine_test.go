package transitions

import (
	"fmt"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestCalculateNextState_ValidTransitions(t *testing.T) {
	tests := []struct {
		name          string
		currentState  State
		event         Event
		expectedState State
		shouldBeValid bool
	}{
		// Undefined state transitions
		{
			name:          "undefined to connecting on init",
			currentState:  StateUndefined,
			event:         EventInit,
			expectedState: StateConnecting,
			shouldBeValid: true,
		},

		// Connecting state transitions
		{
			name:          "connecting to connected on success",
			currentState:  StateConnecting,
			event:         EventConnectSuccess,
			expectedState: StateConnected,
			shouldBeValid: true,
		},
		{
			name:          "connecting to terminal on timeout",
			currentState:  StateConnecting,
			event:         EventTimeout,
			expectedState: StateTerminal,
			shouldBeValid: true,
		},
		{
			name:          "connecting to terminal on hangup",
			currentState:  StateConnecting,
			event:         EventHangup,
			expectedState: StateTerminal,
			shouldBeValid: true,
		},

		// Connected state transitions
		{
			name:          "connected to disconnecting on no pong",
			currentState:  StateConnected,
			event:         EventNoPong,
			expectedState: StateDisconnecting,
			shouldBeValid: true,
		},
		{
			name:          "connected to disconnecting on disconnect",
			currentState:  StateConnected,
			event:         EventDisconnect,
			expectedState: StateDisconnecting,
			shouldBeValid: true,
		},
		{
			name:          "connected to terminal on hangup",
			currentState:  StateConnected,
			event:         EventHangup,
			expectedState: StateTerminal,
			shouldBeValid: true,
		},

		// Disconnecting state transitions
		{
			name:          "disconnecting to terminal on success",
			currentState:  StateDisconnecting,
			event:         EventDisconnectSuccess,
			expectedState: StateTerminal,
			shouldBeValid: true,
		},
		{
			name:          "disconnecting to terminal on timeout",
			currentState:  StateDisconnecting,
			event:         EventTimeout,
			expectedState: StateTerminal,
			shouldBeValid: true,
		},
		{
			name:          "disconnecting to terminal on hangup",
			currentState:  StateDisconnecting,
			event:         EventHangup,
			expectedState: StateTerminal,
			shouldBeValid: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := CalculateNextState(tt.currentState, tt.event)

			assert.Equal(t, tt.shouldBeValid, result.Valid, "validity mismatch")
			if tt.shouldBeValid {
				assert.Equal(t, tt.expectedState, result.NextState, "next state mismatch")
				assert.NotEmpty(t, result.Reason, "reason should be populated")
			}
		})
	}
}

func TestCalculateNextState_InvalidTransitions(t *testing.T) {
	tests := []struct {
		name         string
		currentState State
		event        Event
	}{
		{
			name:         "undefined cannot handle connect success",
			currentState: StateUndefined,
			event:        EventConnectSuccess,
		},
		{
			name:         "connecting cannot handle disconnect",
			currentState: StateConnecting,
			event:        EventDisconnect,
		},
		{
			name:         "connected cannot handle init",
			currentState: StateConnected,
			event:        EventInit,
		},
		{
			name:         "terminal cannot handle any event",
			currentState: StateTerminal,
			event:        EventInit,
		},
		{
			name:         "terminal cannot handle hangup",
			currentState: StateTerminal,
			event:        EventHangup,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := CalculateNextState(tt.currentState, tt.event)

			assert.False(t, result.Valid, "transition should be invalid")
			assert.Equal(t, tt.currentState, result.NextState, "should stay in current state")
			assert.NotEmpty(t, result.Reason, "reason should explain why invalid")
		})
	}
}

func TestCalculateNextState_UnknownState(t *testing.T) {
	result := CalculateNextState(State("unknown"), EventInit)

	assert.False(t, result.Valid)
	assert.Contains(t, result.Reason, "unknown state")
}

func TestValidateTransition(t *testing.T) {
	tests := []struct {
		name        string
		from        State
		event       Event
		expectError bool
	}{
		{
			name:        "valid transition returns no error",
			from:        StateConnecting,
			event:       EventConnectSuccess,
			expectError: false,
		},
		{
			name:        "invalid transition returns error",
			from:        StateConnecting,
			event:       EventDisconnect,
			expectError: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := ValidateTransition(tt.from, tt.event)

			if tt.expectError {
				assert.Error(t, err)
			} else {
				assert.NoError(t, err)
			}
		})
	}
}

func TestIsTerminalState(t *testing.T) {
	tests := []struct {
		state      State
		isTerminal bool
	}{
		{StateTerminal, true},
		{StateConnecting, false},
		{StateConnected, false},
		{StateDisconnecting, false},
		{StateUndefined, false},
	}

	for _, tt := range tests {
		t.Run(string(tt.state), func(t *testing.T) {
			result := IsTerminalState(tt.state)
			assert.Equal(t, tt.isTerminal, result)
		})
	}
}

func TestGetValidEvents(t *testing.T) {
	tests := []struct {
		state         State
		expectedCount int
		shouldContain []Event
	}{
		{
			state:         StateUndefined,
			expectedCount: 1,
			shouldContain: []Event{EventInit},
		},
		{
			state:         StateConnecting,
			expectedCount: 3,
			shouldContain: []Event{EventConnectSuccess, EventTimeout, EventHangup},
		},
		{
			state:         StateConnected,
			expectedCount: 3,
			shouldContain: []Event{EventNoPong, EventDisconnect, EventHangup},
		},
		{
			state:         StateDisconnecting,
			expectedCount: 3,
			shouldContain: []Event{EventDisconnectSuccess, EventTimeout, EventHangup},
		},
		{
			state:         StateTerminal,
			expectedCount: 0,
			shouldContain: []Event{},
		},
	}

	for _, tt := range tests {
		t.Run(string(tt.state), func(t *testing.T) {
			events := GetValidEvents(tt.state)

			assert.Len(t, events, tt.expectedCount)

			for _, expectedEvent := range tt.shouldContain {
				assert.Contains(t, events, expectedEvent)
			}
		})
	}
}

func TestGetValidEvents_UnknownState(t *testing.T) {
	events := GetValidEvents(State("unknown"))
	assert.Empty(t, events)
}

func TestGetAllStates(t *testing.T) {
	states := GetAllStates()

	assert.Len(t, states, 5)
	assert.Contains(t, states, StateUndefined)
	assert.Contains(t, states, StateConnecting)
	assert.Contains(t, states, StateConnected)
	assert.Contains(t, states, StateDisconnecting)
	assert.Contains(t, states, StateTerminal)
}

func TestGetAllEvents(t *testing.T) {
	events := GetAllEvents()

	assert.Len(t, events, 7)
	assert.Contains(t, events, EventInit)
	assert.Contains(t, events, EventConnectSuccess)
	assert.Contains(t, events, EventTimeout)
	assert.Contains(t, events, EventHangup)
	assert.Contains(t, events, EventDisconnect)
	assert.Contains(t, events, EventNoPong)
	assert.Contains(t, events, EventDisconnectSuccess)
}

// Property-based test: verify all transitions in the table are valid
func TestStateTransitionTable_Completeness(t *testing.T) {
	for state, validEvents := range StateTransitionTable {
		for event, expectedNext := range validEvents {
			t.Run(fmt.Sprintf("%s_%s", state, event), func(t *testing.T) {
				result := CalculateNextState(state, event)

				require.True(t, result.Valid, "transition should be valid")
				assert.Equal(t, expectedNext, result.NextState)
			})
		}
	}
}

// Property-based test: terminal state should reject all events
func TestTerminalState_RejectsAllEvents(t *testing.T) {
	allEvents := GetAllEvents()

	for _, event := range allEvents {
		t.Run(string(event), func(t *testing.T) {
			result := CalculateNextState(StateTerminal, event)
			assert.False(t, result.Valid, "terminal state should reject all events")
		})
	}
}

// Property-based test: all non-terminal states should eventually reach terminal
func TestAllStates_CanReachTerminal(t *testing.T) {
	nonTerminalStates := []State{
		StateUndefined,
		StateConnecting,
		StateConnected,
		StateDisconnecting,
	}

	for _, state := range nonTerminalStates {
		t.Run(string(state), func(t *testing.T) {
			// Check if there's at least one path to terminal
			canReachTerminal := false

			validEvents := GetValidEvents(state)
			for _, event := range validEvents {
				result := CalculateNextState(state, event)
				if result.Valid && result.NextState == StateTerminal {
					canReachTerminal = true
					break
				}
			}

			// If not directly reachable, check one level deeper
			if !canReachTerminal {
				for _, event := range validEvents {
					result := CalculateNextState(state, event)
					if result.Valid {
						nextEvents := GetValidEvents(result.NextState)
						for _, nextEvent := range nextEvents {
							nextResult := CalculateNextState(result.NextState, nextEvent)
							if nextResult.Valid && nextResult.NextState == StateTerminal {
								canReachTerminal = true
								break
							}
						}
					}
					if canReachTerminal {
						break
					}
				}
			}

			assert.True(t, canReachTerminal, "state %s should have a path to terminal", state)
		})
	}
}

// Benchmark to ensure pure functions are fast
func BenchmarkCalculateNextState(b *testing.B) {
	for i := 0; i < b.N; i++ {
		_ = CalculateNextState(StateConnecting, EventConnectSuccess)
	}
}

func BenchmarkValidateTransition(b *testing.B) {
	for i := 0; i < b.N; i++ {
		_ = ValidateTransition(StateConnecting, EventConnectSuccess)
	}
}

func BenchmarkIsTerminalState(b *testing.B) {
	for i := 0; i < b.N; i++ {
		_ = IsTerminalState(StateTerminal)
	}
}
