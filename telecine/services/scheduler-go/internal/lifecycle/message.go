package lifecycle

import (
	"encoding/json"
	"fmt"
)

// LifecycleEvent represents the type of lifecycle event
type LifecycleEvent string

const (
	EventStarted   LifecycleEvent = "started"
	EventCompleted LifecycleEvent = "completed"
	EventFailed    LifecycleEvent = "failed"
)

// LifecycleType represents the type of lifecycle message
type LifecycleType string

const (
	TypeJob      LifecycleType = "job"
	TypeAttempt  LifecycleType = "attempt"
	TypeWorkflow LifecycleType = "workflow"
)

// JobLifecycleMessage represents a job or attempt lifecycle message
// This matches the TypeScript JobLifecycleMessage interface
type JobLifecycleMessage struct {
	Type          LifecycleType          `json:"type"`
	Event         LifecycleEvent         `json:"event"`
	Queue         string                 `json:"queue"`
	JobID         string                 `json:"jobId"`
	Workflow      string                 `json:"workflow"`
	WorkflowID    string                 `json:"workflowId"`
	Timestamp     int64                  `json:"timestamp"`
	AttemptNumber int                    `json:"attemptNumber"`
	Details       map[string]interface{} `json:"details,omitempty"`
}

// WorkflowLifecycleMessage represents a workflow lifecycle message
// This matches the TypeScript WorkflowLifecycleMessage interface
type WorkflowLifecycleMessage struct {
	Type         LifecycleType          `json:"type"`
	Event        LifecycleEvent         `json:"event"`
	WorkflowID   string                 `json:"workflowId"`
	WorkflowName string                 `json:"workflowName"`
	OrgID        string                 `json:"orgId"`
	Timestamp    int64                  `json:"timestamp"`
	Details      map[string]interface{} `json:"details,omitempty"`
}

// LifecycleMessage is a union type that can be either a job or workflow message
type LifecycleMessage struct {
	*JobLifecycleMessage
	*WorkflowLifecycleMessage
}

// UnmarshalJSON implements custom JSON unmarshaling to handle the union type
func (lm *LifecycleMessage) UnmarshalJSON(data []byte) error {
	// First, determine the type by unmarshaling into a temporary struct
	var temp struct {
		Type LifecycleType `json:"type"`
	}

	if err := json.Unmarshal(data, &temp); err != nil {
		return err
	}

	switch temp.Type {
	case TypeJob, TypeAttempt:
		var jobMsg JobLifecycleMessage
		if err := json.Unmarshal(data, &jobMsg); err != nil {
			return err
		}
		lm.JobLifecycleMessage = &jobMsg
		lm.WorkflowLifecycleMessage = nil
	case TypeWorkflow:
		var workflowMsg WorkflowLifecycleMessage
		if err := json.Unmarshal(data, &workflowMsg); err != nil {
			return err
		}
		lm.WorkflowLifecycleMessage = &workflowMsg
		lm.JobLifecycleMessage = nil
	default:
		return fmt.Errorf("unknown lifecycle message type: %s", temp.Type)
	}

	return nil
}

// MarshalJSON implements custom JSON marshaling for the union type
func (lm *LifecycleMessage) MarshalJSON() ([]byte, error) {
	if lm.JobLifecycleMessage != nil {
		return json.Marshal(lm.JobLifecycleMessage)
	}
	if lm.WorkflowLifecycleMessage != nil {
		return json.Marshal(lm.WorkflowLifecycleMessage)
	}
	return nil, fmt.Errorf("lifecycle message is empty")
}

// IsJobMessage returns true if this is a job or attempt message
func (lm *LifecycleMessage) IsJobMessage() bool {
	return lm.JobLifecycleMessage != nil
}

// IsWorkflowMessage returns true if this is a workflow message
func (lm *LifecycleMessage) IsWorkflowMessage() bool {
	return lm.WorkflowLifecycleMessage != nil
}

// GetType returns the type of the message
func (lm *LifecycleMessage) GetType() LifecycleType {
	if lm.JobLifecycleMessage != nil {
		return lm.JobLifecycleMessage.Type
	}
	if lm.WorkflowLifecycleMessage != nil {
		return lm.WorkflowLifecycleMessage.Type
	}
	return ""
}

// GetEvent returns the event type of the message
func (lm *LifecycleMessage) GetEvent() LifecycleEvent {
	if lm.JobLifecycleMessage != nil {
		return lm.JobLifecycleMessage.Event
	}
	if lm.WorkflowLifecycleMessage != nil {
		return lm.WorkflowLifecycleMessage.Event
	}
	return ""
}

// ParseFromRedisFields creates a LifecycleMessage from Redis stream fields
// This matches the format used by the TypeScript publishJobLifecycle function
func ParseFromRedisFields(fields map[string]interface{}) (*LifecycleMessage, error) {
	typeStr, ok := fields["type"].(string)
	if !ok {
		return nil, fmt.Errorf("missing or invalid 'type' field")
	}

	eventStr, ok := fields["event"].(string)
	if !ok {
		return nil, fmt.Errorf("missing or invalid 'event' field")
	}

	timestampStr, ok := fields["timestamp"].(string)
	if !ok {
		return nil, fmt.Errorf("missing or invalid 'timestamp' field")
	}

	// Convert timestamp string to int64
	var timestamp int64
	if _, err := fmt.Sscanf(timestampStr, "%d", &timestamp); err != nil {
		return nil, fmt.Errorf("invalid timestamp format: %v", err)
	}

	msgType := LifecycleType(typeStr)
	event := LifecycleEvent(eventStr)

	switch msgType {
	case TypeJob, TypeAttempt:
		queue, ok := fields["queue"].(string)
		if !ok {
			return nil, fmt.Errorf("missing or invalid 'queue' field for job message")
		}

		jobID, ok := fields["jobId"].(string)
		if !ok {
			return nil, fmt.Errorf("missing or invalid 'jobId' field")
		}

		workflow, ok := fields["workflow"].(string)
		if !ok {
			return nil, fmt.Errorf("missing or invalid 'workflow' field")
		}

		workflowID, ok := fields["workflowId"].(string)
		if !ok {
			return nil, fmt.Errorf("missing or invalid 'workflowId' field")
		}

		attemptNumberStr, ok := fields["attemptNumber"].(string)
		if !ok {
			return nil, fmt.Errorf("missing or invalid 'attemptNumber' field")
		}

		var attemptNumber int
		if _, err := fmt.Sscanf(attemptNumberStr, "%d", &attemptNumber); err != nil {
			return nil, fmt.Errorf("invalid attemptNumber format: %v", err)
		}

		jobMsg := &JobLifecycleMessage{
			Type:          msgType,
			Event:         event,
			Queue:         queue,
			JobID:         jobID,
			Workflow:      workflow,
			WorkflowID:    workflowID,
			Timestamp:     timestamp,
			AttemptNumber: attemptNumber,
		}

		// Parse details if present (stored as SuperJSON string)
		if detailsStr, ok := fields["details"].(string); ok {
			// For now, we'll store it as a simple map. In a full implementation,
			// we might want to integrate with a SuperJSON equivalent for Go
			var details map[string]interface{}
			if err := json.Unmarshal([]byte(detailsStr), &details); err == nil {
				jobMsg.Details = details
			}
		}

		return &LifecycleMessage{JobLifecycleMessage: jobMsg}, nil

	case TypeWorkflow:
		workflowID, ok := fields["workflowId"].(string)
		if !ok {
			return nil, fmt.Errorf("missing or invalid 'workflowId' field")
		}

		workflowName, ok := fields["workflowName"].(string)
		if !ok {
			return nil, fmt.Errorf("missing or invalid 'workflowName' field")
		}

		orgID, ok := fields["orgId"].(string)
		if !ok {
			return nil, fmt.Errorf("missing or invalid 'orgId' field")
		}

		workflowMsg := &WorkflowLifecycleMessage{
			Type:         msgType,
			Event:        event,
			WorkflowID:   workflowID,
			WorkflowName: workflowName,
			OrgID:        orgID,
			Timestamp:    timestamp,
		}

		// Parse details if present
		if detailsStr, ok := fields["details"].(string); ok {
			var details map[string]any
			if err := json.Unmarshal([]byte(detailsStr), &details); err == nil {
				workflowMsg.Details = details
			}
		}

		return &LifecycleMessage{WorkflowLifecycleMessage: workflowMsg}, nil

	default:
		return nil, fmt.Errorf("unknown message type: %s", msgType)
	}
}
