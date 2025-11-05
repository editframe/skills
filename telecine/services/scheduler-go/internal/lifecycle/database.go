package lifecycle

import (
	"database/sql"
	"encoding/json"
	"fmt"

	"github.com/lib/pq"
	"github.com/rs/zerolog"
)

// DatabaseUpdater handles database operations for lifecycle events
type DatabaseUpdater struct {
	db     *sql.DB
	logger *zerolog.Logger
}

// NewDatabaseUpdater creates a new database updater
func NewDatabaseUpdater(db *sql.DB, logger *zerolog.Logger) *DatabaseUpdater {
	return &DatabaseUpdater{
		db:     db,
		logger: logger,
	}
}

// UpdateJobTimestamp performs a bulk update of a timestamp column for given job IDs
// This is the generic function used by most queues for lifecycle events
func (du *DatabaseUpdater) UpdateJobTimestamp(tableName, columnName string, jobIDs []string) error {
	if len(jobIDs) == 0 {
		return nil
	}

	query := fmt.Sprintf("UPDATE %s SET %s = NOW() WHERE id = ANY($1)", tableName, columnName)

	du.logger.Debug().
		Str("table", tableName).
		Str("column", columnName).
		Int("count", len(jobIDs)).
		Msg("Executing bulk timestamp update")

	_, err := du.db.Exec(query, pq.Array(jobIDs))
	if err != nil {
		du.logger.Error().
			Err(err).
			Str("table", tableName).
			Str("column", columnName).
			Strs("jobIds", jobIDs).
			Msg("Failed to update job timestamps")
		return fmt.Errorf("failed to update %s.%s: %w", tableName, columnName, err)
	}

	du.logger.Info().
		Str("table", tableName).
		Str("column", columnName).
		Int("count", len(jobIDs)).
		Msg("Successfully updated job timestamps")

	return nil
}

// SetRenderJobStarted handles the special case for render-initializer queue
// which updates both started_at and status columns
func (du *DatabaseUpdater) SetRenderJobStarted(jobIDs []string) error {
	if len(jobIDs) == 0 {
		return nil
	}

	query := "UPDATE video2.renders SET started_at = NOW(), status = 'rendering' WHERE id = ANY($1)"

	du.logger.Debug().
		Int("count", len(jobIDs)).
		Msg("Executing render job started update")

	_, err := du.db.Exec(query, pq.Array(jobIDs))
	if err != nil {
		du.logger.Error().
			Err(err).
			Strs("jobIds", jobIDs).
			Msg("Failed to update render jobs")
		return fmt.Errorf("failed to update video2.renders for started jobs: %w", err)
	}

	du.logger.Info().
		Int("count", len(jobIDs)).
		Msg("Successfully updated render jobs to started status")

	return nil
}

// ProcessISOBMFFJobStarted updates the process_isobmff table for started jobs
func (du *DatabaseUpdater) ProcessISOBMFFJobStarted(jobIDs []string) error {
	return du.UpdateJobTimestamp("video2.process_isobmff", "started_at", jobIDs)
}

// ProcessISOBMFFJobCompleted updates the process_isobmff table for completed jobs
func (du *DatabaseUpdater) ProcessISOBMFFJobCompleted(jobIDs []string) error {
	return du.UpdateJobTimestamp("video2.process_isobmff", "completed_at", jobIDs)
}

// ProcessISOBMFFJobFailed updates the process_isobmff table for failed jobs
func (du *DatabaseUpdater) ProcessISOBMFFJobFailed(jobIDs []string) error {
	return du.UpdateJobTimestamp("video2.process_isobmff", "failed_at", jobIDs)
}

// ProcessHTMLJobStarted updates the process_html table for started jobs
func (du *DatabaseUpdater) ProcessHTMLJobStarted(jobIDs []string) error {
	return du.UpdateJobTimestamp("video2.process_html", "started_at", jobIDs)
}

// RenderFinalizerJobCompleted handles completion of render-finalizer jobs
// This matches the RenderFinalizerQueue.processCompletions logic in TypeScript
func (du *DatabaseUpdater) RenderFinalizerJobCompleted(jobIDs []string) error {
	if len(jobIDs) == 0 {
		return nil
	}

	query := `
		UPDATE video2.renders 
		SET status = 'complete', completed_at = NOW() 
		WHERE id = ANY($1)
	`

	du.logger.Debug().
		Int("count", len(jobIDs)).
		Msg("Executing render finalizer completion update")

	_, err := du.db.Exec(query, pq.Array(jobIDs))
	if err != nil {
		du.logger.Error().
			Err(err).
			Strs("jobIds", jobIDs).
			Msg("Failed to update render finalizer completions")
		return fmt.Errorf("failed to update video2.renders for completed render finalizer jobs: %w", err)
	}

	du.logger.Info().
		Int("count", len(jobIDs)).
		Msg("Successfully updated render finalizer completions")

	return nil
}

// ProcessHTMLFinalizerJobCompleted handles completion of process-html-finalizer jobs
// This matches the ProcessHTMLFinalizerQueue.processCompletions logic in TypeScript
func (du *DatabaseUpdater) ProcessHTMLFinalizerJobCompleted(jobIDs []string) error {
	return du.UpdateJobTimestamp("video2.process_html", "completed_at", jobIDs)
}

// Workflow failure processing functions

// ProcessRenderWorkflowFailures handles workflow failures for the render workflow
// This matches the RenderWorkflow.processFailures logic in TypeScript
func (du *DatabaseUpdater) ProcessRenderWorkflowFailures(messages []*WorkflowLifecycleMessage) error {
	if len(messages) == 0 {
		return nil
	}

	du.logger.Debug().
		Int("count", len(messages)).
		Msg("Processing render workflow failures")

	// Process each message individually to handle failure_detail properly
	for _, msg := range messages {
		// Extract failure detail from message details
		var failureDetailJSON []byte
		if msg.Details != nil {
			// Marshal the entire Details object as the failure_detail
			// This preserves all error information from the workflow
			var err error
			failureDetailJSON, err = json.Marshal(msg.Details)
			if err != nil {
				du.logger.Warn().
					Err(err).
					Str("workflowId", msg.WorkflowID).
					Msg("Failed to marshal failure details, using NULL")
				failureDetailJSON = nil
			}
		}

		// Update the render record with failure details
		query := `
			UPDATE video2.renders 
			SET status = 'failed', failed_at = NOW(), completed_at = NULL, failure_detail = $2
			WHERE id = $1
		`

		var result sql.Result
		var err error
		if failureDetailJSON != nil {
			result, err = du.db.Exec(query, msg.WorkflowID, failureDetailJSON)
		} else {
			result, err = du.db.Exec(query, msg.WorkflowID, nil)
		}

		if err != nil {
			du.logger.Error().
				Err(err).
				Str("workflowId", msg.WorkflowID).
				Msg("Failed to update render workflow failure")
			return fmt.Errorf("failed to update render workflow failure for %s: %w", msg.WorkflowID, err)
		}

		// Check if any rows were affected
		rowsAffected, err := result.RowsAffected()
		if err != nil {
			du.logger.Warn().
				Err(err).
				Str("workflowId", msg.WorkflowID).
				Msg("Could not check rows affected for render failure update")
		} else if rowsAffected == 0 {
			du.logger.Warn().
				Str("workflowId", msg.WorkflowID).
				Msg("No render record found to update for workflow failure")
		} else {
			du.logger.Debug().
				Str("workflowId", msg.WorkflowID).
				Bool("hasFailureDetail", failureDetailJSON != nil).
				Msg("Successfully updated render workflow failure")
		}
	}

	du.logger.Info().
		Int("count", len(messages)).
		Msg("Successfully processed render workflow failures")

	return nil
}

// ProcessHTMLWorkflowFailures handles workflow failures for the process-html workflow
// This matches the ProcessHTMLWorkflow.processFailures logic in TypeScript
func (du *DatabaseUpdater) ProcessHTMLWorkflowFailures(messages []*WorkflowLifecycleMessage) error {
	if len(messages) == 0 {
		return nil
	}

	du.logger.Debug().
		Int("count", len(messages)).
		Msg("Processing HTML workflow failures")

	// For each message, we need to extract the process_html ID and render ID from the details
	// The TypeScript code uses message.details?.workflow?.processHtml?.id and message.details?.workflow?.render?.id
	var processHTMLIDs []string
	var renderIDs []string

	for _, msg := range messages {
		if msg.Details != nil {
			// Extract process HTML ID
			if workflow, ok := msg.Details["workflow"].(map[string]interface{}); ok {
				if processHTML, ok := workflow["processHtml"].(map[string]interface{}); ok {
					if id, ok := processHTML["id"].(string); ok {
						processHTMLIDs = append(processHTMLIDs, id)
					}
				}
				if render, ok := workflow["render"].(map[string]interface{}); ok {
					if id, ok := render["id"].(string); ok {
						renderIDs = append(renderIDs, id)
					}
				}
			}
		}
	}

	// Update process_html table
	if len(processHTMLIDs) > 0 {
		query1 := `
			UPDATE video2.process_html 
			SET failed_at = NOW(), completed_at = NULL 
			WHERE id = ANY($1)
		`

		_, err := du.db.Exec(query1, pq.Array(processHTMLIDs))
		if err != nil {
			du.logger.Error().
				Err(err).
				Strs("processHtmlIds", processHTMLIDs).
				Msg("Failed to update process HTML failures")
			return fmt.Errorf("failed to update process HTML failures: %w", err)
		}
	}

	// Update renders table
	if len(renderIDs) > 0 {
		query2 := `
			UPDATE video2.renders 
			SET status = 'failed', failed_at = NOW(), completed_at = NULL 
			WHERE id = ANY($1)
		`

		_, err := du.db.Exec(query2, pq.Array(renderIDs))
		if err != nil {
			du.logger.Error().
				Err(err).
				Strs("renderIds", renderIDs).
				Msg("Failed to update render failures from HTML workflow")
			return fmt.Errorf("failed to update render failures from HTML workflow: %w", err)
		}
	}

	du.logger.Info().
		Int("processHtmlCount", len(processHTMLIDs)).
		Int("renderCount", len(renderIDs)).
		Msg("Successfully updated HTML workflow failures")

	return nil
}
