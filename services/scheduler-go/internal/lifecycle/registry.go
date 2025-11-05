package lifecycle

import (
	"fmt"

	"github.com/rs/zerolog"
)

// JobIDExtractor defines a function that extracts the relevant ID from a lifecycle message
// Different queues use different fields (jobId vs workflowId) as their primary identifier
type JobIDExtractor func(*LifecycleMessage) string

// QueueHandler defines the operations a queue can perform for lifecycle events
type QueueHandler struct {
	Name             string
	ExtractJobID     JobIDExtractor
	ProcessStarts    func([]string) error
	ProcessCompletes func([]string) error
	ProcessFailures  func([]string) error
}

// WorkflowHandler defines the operations a workflow can perform for lifecycle events
type WorkflowHandler struct {
	Name            string
	ProcessFailures func([]*WorkflowLifecycleMessage) error
}

// Registry holds all queue handlers and workflow handlers
type Registry struct {
	handlers         map[string]*QueueHandler
	workflowHandlers map[string]*WorkflowHandler
	logger           *zerolog.Logger
}

// NewRegistry creates a new queue registry
func NewRegistry(dbUpdater *DatabaseUpdater, logger *zerolog.Logger) *Registry {
	registry := &Registry{
		handlers:         make(map[string]*QueueHandler),
		workflowHandlers: make(map[string]*WorkflowHandler),
		logger:           logger,
	}

	// ExtractJobID extracts the jobId field from job/attempt messages
	extractJobID := func(msg *LifecycleMessage) string {
		if msg.IsJobMessage() {
			return msg.JobLifecycleMessage.JobID
		}
		return ""
	}

	// ExtractWorkflowID extracts the workflowId field from job/attempt messages
	extractWorkflowID := func(msg *LifecycleMessage) string {
		if msg.IsJobMessage() {
			return msg.JobLifecycleMessage.WorkflowID
		}
		return ""
	}

	// Process ISOBMFF Queue - uses jobId as identifier
	registry.handlers["process-isobmff"] = &QueueHandler{
		Name:             "process-isobmff",
		ExtractJobID:     extractJobID,
		ProcessStarts:    dbUpdater.ProcessISOBMFFJobStarted,
		ProcessCompletes: dbUpdater.ProcessISOBMFFJobCompleted,
		ProcessFailures:  dbUpdater.ProcessISOBMFFJobFailed,
	}

	// Render Initializer Queue - uses workflowId as identifier
	// Only handles started events with special logic (sets status to 'rendering')
	registry.handlers["render-initializer"] = &QueueHandler{
		Name:             "render-initializer",
		ExtractJobID:     extractWorkflowID,
		ProcessStarts:    dbUpdater.SetRenderJobStarted,
		ProcessCompletes: nil, // No action required for completed events
		ProcessFailures:  nil, // No action required for failed events
	}

	// Process HTML Initializer Queue - uses workflowId as identifier
	// Only handles started events
	registry.handlers["process-html-initializer"] = &QueueHandler{
		Name:             "process-html-initializer",
		ExtractJobID:     extractWorkflowID,
		ProcessStarts:    dbUpdater.ProcessHTMLJobStarted,
		ProcessCompletes: nil, // No action required for completed events
		ProcessFailures:  nil, // No action required for failed events
	}

	// Render Finalizer Queue - uses workflowId as identifier
	// Only handles completed events
	registry.handlers["render-finalizer"] = &QueueHandler{
		Name:             "render-finalizer",
		ExtractJobID:     extractWorkflowID,
		ProcessStarts:    nil, // No action required for started events
		ProcessCompletes: dbUpdater.RenderFinalizerJobCompleted,
		ProcessFailures:  nil, // No action required for failed events
	}

	// Process HTML Finalizer Queue - uses workflowId as identifier
	// Only handles completed events
	registry.handlers["process-html-finalizer"] = &QueueHandler{
		Name:             "process-html-finalizer",
		ExtractJobID:     extractWorkflowID,
		ProcessStarts:    nil, // No action required for started events
		ProcessCompletes: dbUpdater.ProcessHTMLFinalizerJobCompleted,
		ProcessFailures:  nil, // No action required for failed events
	}

	// Workflow handlers for workflow-level failure processing

	// Render Workflow - handles workflow failures
	registry.workflowHandlers["render"] = &WorkflowHandler{
		Name:            "render",
		ProcessFailures: dbUpdater.ProcessRenderWorkflowFailures,
	}

	// Process HTML Workflow - handles workflow failures
	registry.workflowHandlers["process-html"] = &WorkflowHandler{
		Name:            "process-html",
		ProcessFailures: dbUpdater.ProcessHTMLWorkflowFailures,
	}

	return registry
}

// GetHandler returns the queue handler for the given queue name
func (r *Registry) GetHandler(queueName string) (*QueueHandler, error) {
	handler, exists := r.handlers[queueName]
	if !exists {
		return nil, fmt.Errorf("unknown queue: %s", queueName)
	}
	return handler, nil
}

// GetWorkflowHandler returns the workflow handler for the given workflow name
func (r *Registry) GetWorkflowHandler(workflowName string) (*WorkflowHandler, error) {
	handler, exists := r.workflowHandlers[workflowName]
	if !exists {
		return nil, fmt.Errorf("unknown workflow: %s", workflowName)
	}
	return handler, nil
}

// ProcessMessages processes a batch of lifecycle messages
// Groups messages by queue and event type, then delegates to appropriate handlers
func (r *Registry) ProcessMessages(messages []*LifecycleMessage) error {
	if len(messages) == 0 {
		return nil
	}

	r.logger.Debug().
		Int("count", len(messages)).
		Msg("Processing batch of lifecycle messages")

	// Separate job messages and workflow messages
	var jobMessages []*LifecycleMessage
	var workflowMessages []*LifecycleMessage

	for _, msg := range messages {
		if msg.IsJobMessage() {
			jobMessages = append(jobMessages, msg)
		} else if msg.IsWorkflowMessage() {
			workflowMessages = append(workflowMessages, msg)
		}
	}

	var lastError error

	// Process job messages (existing logic)
	if len(jobMessages) > 0 {
		if err := r.processJobMessages(jobMessages); err != nil {
			lastError = err
		}
	}

	// Process workflow messages (new logic)
	if len(workflowMessages) > 0 {
		if err := r.processWorkflowMessages(workflowMessages); err != nil {
			lastError = err
		}
	}

	return lastError
}

// processJobMessages handles job-level lifecycle messages
func (r *Registry) processJobMessages(messages []*LifecycleMessage) error {
	// Group messages by queue name and event type
	// Structure: map[queueName][eventType][]jobID
	groups := make(map[string]map[LifecycleEvent][]string)

	for _, msg := range messages {
		queueName := msg.JobLifecycleMessage.Queue
		event := msg.JobLifecycleMessage.Event

		// Get the handler for this queue
		handler, err := r.GetHandler(queueName)
		if err != nil {
			r.logger.Warn().
				Err(err).
				Str("queue", queueName).
				Msg("Skipping message for unknown queue")
			continue
		}

		// Extract the job ID using the queue's extractor function
		jobID := handler.ExtractJobID(msg)
		if jobID == "" {
			r.logger.Warn().
				Str("queue", queueName).
				Interface("message", msg).
				Msg("Could not extract job ID from message")
			continue
		}

		// Initialize nested maps if needed
		if groups[queueName] == nil {
			groups[queueName] = make(map[LifecycleEvent][]string)
		}

		// Add the job ID to the appropriate group
		groups[queueName][event] = append(groups[queueName][event], jobID)
	}

	// Process each group
	var lastError error
	for queueName, eventGroups := range groups {
		handler, err := r.GetHandler(queueName)
		if err != nil {
			r.logger.Error().
				Err(err).
				Str("queue", queueName).
				Msg("Failed to get handler for queue")
			lastError = err
			continue
		}

		// Process each event type for this queue
		for event, jobIDs := range eventGroups {
			if err := r.processEventGroup(handler, event, jobIDs); err != nil {
				r.logger.Error().
					Err(err).
					Str("queue", queueName).
					Str("event", string(event)).
					Int("jobCount", len(jobIDs)).
					Msg("Failed to process event group")
				lastError = err
			}
		}
	}

	return lastError
}

// processWorkflowMessages handles workflow-level lifecycle messages
func (r *Registry) processWorkflowMessages(messages []*LifecycleMessage) error {
	// Group workflow messages by workflow name
	workflowGroups := make(map[string][]*WorkflowLifecycleMessage)

	for _, msg := range messages {
		workflowName := msg.WorkflowLifecycleMessage.WorkflowName
		workflowGroups[workflowName] = append(workflowGroups[workflowName], msg.WorkflowLifecycleMessage)
	}

	// Process each workflow group
	var lastError error
	for workflowName, workflowMessages := range workflowGroups {
		handler, err := r.GetWorkflowHandler(workflowName)
		if err != nil {
			r.logger.Warn().
				Err(err).
				Str("workflow", workflowName).
				Msg("Skipping messages for unknown workflow")
			continue
		}

		// For now, only process failures (matching TypeScript logic)
		var failureMessages []*WorkflowLifecycleMessage
		for _, msg := range workflowMessages {
			if msg.Event == EventFailed {
				failureMessages = append(failureMessages, msg)
			}
		}

		if len(failureMessages) > 0 && handler.ProcessFailures != nil {
			r.logger.Info().
				Str("workflow", workflowName).
				Int("messageCount", len(failureMessages)).
				Msg("Processing workflow failures")

			if err := handler.ProcessFailures(failureMessages); err != nil {
				r.logger.Error().
					Err(err).
					Str("workflow", workflowName).
					Int("messageCount", len(failureMessages)).
					Msg("Failed to process workflow failures")
				lastError = err
			}
		} else if len(failureMessages) > 0 {
			r.logger.Info().
				Str("workflow", workflowName).
				Int("messageCount", len(failureMessages)).
				Msg("No processFailures handler for workflow")
		}
	}

	return lastError
}

// processEventGroup processes a single group of jobs for a specific event
func (r *Registry) processEventGroup(handler *QueueHandler, event LifecycleEvent, jobIDs []string) error {
	if len(jobIDs) == 0 {
		return nil
	}

	r.logger.Debug().
		Str("queue", handler.Name).
		Str("event", string(event)).
		Int("jobCount", len(jobIDs)).
		Msg("Processing event group")

	switch event {
	case EventStarted:
		if handler.ProcessStarts != nil {
			return handler.ProcessStarts(jobIDs)
		}
	case EventCompleted:
		if handler.ProcessCompletes != nil {
			return handler.ProcessCompletes(jobIDs)
		}
	case EventFailed:
		if handler.ProcessFailures != nil {
			return handler.ProcessFailures(jobIDs)
		}
	default:
		return fmt.Errorf("unknown event type: %s", event)
	}

	// No error if handler for this event is nil (no action required)
	return nil
}
