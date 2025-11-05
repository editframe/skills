package lifecycle

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"os"
	"testing"
	"time"

	"github.com/redis/go-redis/v9"
	"github.com/rs/zerolog"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	redisclient "github.com/editframe/telecine/scheduler/internal/redis"
	"github.com/editframe/telecine/scheduler/internal/testutil"
	_ "github.com/lib/pq"
)

func getTestRedisAddr() string {
	valkeyHost := os.Getenv("VALKEY_HOST")
	valkeyPort := os.Getenv("VALKEY_PORT")

	if valkeyHost != "" {
		if valkeyPort == "" {
			valkeyPort = "6379"
		}
		return fmt.Sprintf("%s:%s", valkeyHost, valkeyPort)
	}

	return "localhost:6379"
}

const (
	testConsumerID    = "test-consumer"
	testStreamKey     = "lifecycle:jobs:test"
	testConsumerGroup = "test-group"
)

func getTestDBConnString() string {
	host := os.Getenv("POSTGRES_HOST")
	if host == "" {
		host = "localhost"
	}
	user := os.Getenv("POSTGRES_USER")
	if user == "" {
		user = "postgres"
	}
	password := os.Getenv("POSTGRES_PASSWORD")
	if password == "" {
		password = "postgres"
	}
	dbname := os.Getenv("POSTGRES_DB")
	if dbname == "" {
		dbname = "scheduler-go-tests"
	}

	return fmt.Sprintf("host=%s user=%s password=%s dbname=%s sslmode=disable",
		host, user, password, dbname)
}

func TestConsumerIntegration(t *testing.T) {
	_ = testutil.WithTestSpan(t)
	if testing.Short() {
		t.Skip("Skipping integration tests in short mode")
	}

	// Setup database connection
	db, err := sql.Open("postgres", getTestDBConnString())
	require.NoError(t, err)
	defer db.Close()

	err = db.Ping()
	require.NoError(t, err, "Failed to connect to test database")

	// Setup Redis connection
	rdb := redis.NewClient(&redis.Options{
		Addr: getTestRedisAddr(),
	})
	defer rdb.Close()

	err = rdb.Ping(context.Background()).Err()
	require.NoError(t, err, "Failed to connect to test Redis")

	redisClient := &redisclient.Client{Client: rdb}

	// Setup logger
	logger := testutil.Logger()

	t.Run("ProcessISOBMFFJobStarted", func(t *testing.T) {
		testProcessISOBMFFJobStarted(t, db, redisClient, logger)
	})

	t.Run("ProcessISOBMFFJobCompleted", func(t *testing.T) {
		testProcessISOBMFFJobCompleted(t, db, redisClient, logger)
	})

	t.Run("ProcessISOBMFFJobFailed", func(t *testing.T) {
		testProcessISOBMFFJobFailed(t, db, redisClient, logger)
	})

	t.Run("RenderJobStarted", func(t *testing.T) {
		testRenderJobStarted(t, db, redisClient, logger)
	})

	t.Run("ProcessHTMLJobStarted", func(t *testing.T) {
		testProcessHTMLJobStarted(t, db, redisClient, logger)
	})

	t.Run("RenderWorkflowFailure", func(t *testing.T) {
		testRenderWorkflowFailure(t, db, redisClient, logger)
	})

	t.Run("ProcessHTMLWorkflowFailure", func(t *testing.T) {
		testProcessHTMLWorkflowFailure(t, db, redisClient, logger)
	})

	t.Run("RenderFinalizerJobCompleted", func(t *testing.T) {
		testRenderFinalizerJobCompleted(t, db, redisClient, logger)
	})

	t.Run("ProcessHTMLFinalizerJobCompleted", func(t *testing.T) {
		testProcessHTMLFinalizerJobCompleted(t, db, redisClient, logger)
	})
}

func testProcessISOBMFFJobStarted(t *testing.T, db *sql.DB, redisClient *redisclient.Client, logger *zerolog.Logger) {
	ctx := context.Background()
	testJobID := fmt.Sprintf("test-job-%d", time.Now().UnixNano())

	// Clean up before and after
	cleanupRedis(t, redisClient, ctx)
	defer cleanupRedis(t, redisClient, ctx)
	defer cleanupDB(t, db, "video2.process_isobmff", testJobID)

	// Insert test record
	_, err := db.Exec(`
		INSERT INTO video2.process_isobmff (id, org_id, creator_id, api_key_id, source_type, url, started_at, completed_at, failed_at, unprocessed_file_id)
		VALUES ($1, '00000000-0000-0000-0000-000000000001'::uuid, '00000000-0000-0000-0000-000000000001'::uuid, '00000000-0000-0000-0000-000000000001'::uuid, 'url', 'http://example.com/test.mp4', NULL, NULL, NULL, '00000000-0000-0000-0000-000000000001'::uuid)
	`, testJobID)
	require.NoError(t, err, "Failed to insert test record")

	// Create consumer
	consumer := NewConsumer(redisClient, testConsumerID, db, logger)

	// Initialize consumer group
	err = consumer.initialize(ctx)
	require.NoError(t, err, "Failed to initialize consumer")

	// Publish lifecycle message
	err = publishJobLifecycleMessage(redisClient, ctx, &JobLifecycleMessage{
		Type:          TypeJob,
		Event:         EventStarted,
		Queue:         "process-isobmff",
		JobID:         testJobID,
		Workflow:      "process-isobmff",
		WorkflowID:    testJobID,
		Timestamp:     time.Now().Unix(),
		AttemptNumber: 1,
	})
	require.NoError(t, err, "Failed to publish lifecycle message")

	// Process messages
	err = consumer.processMessages(ctx)
	require.NoError(t, err, "Failed to process messages")

	// Verify database update
	var startedAt *time.Time
	err = db.QueryRow("SELECT started_at FROM video2.process_isobmff WHERE id = $1", testJobID).Scan(&startedAt)
	require.NoError(t, err, "Failed to query updated record")
	assert.NotNil(t, startedAt, "started_at should be set")
	assert.WithinDuration(t, time.Now(), *startedAt, 5*time.Second, "started_at should be recent")
}

func testProcessISOBMFFJobCompleted(t *testing.T, db *sql.DB, redisClient *redisclient.Client, logger *zerolog.Logger) {
	ctx := context.Background()
	testJobID := fmt.Sprintf("test-job-%d", time.Now().UnixNano())

	// Clean up before and after
	cleanupRedis(t, redisClient, ctx)
	defer cleanupRedis(t, redisClient, ctx)
	defer cleanupDB(t, db, "video2.process_isobmff", testJobID)

	// Insert test record
	_, err := db.Exec(`
		INSERT INTO video2.process_isobmff (id, org_id, creator_id, api_key_id, source_type, url, started_at, completed_at, failed_at, unprocessed_file_id)
		VALUES ($1, '00000000-0000-0000-0000-000000000001'::uuid, '00000000-0000-0000-0000-000000000001'::uuid, '00000000-0000-0000-0000-000000000001'::uuid, 'url', 'http://example.com/test.mp4', NOW(), NULL, NULL, '00000000-0000-0000-0000-000000000001'::uuid)
	`, testJobID)
	require.NoError(t, err, "Failed to insert test record")

	// Create consumer
	consumer := NewConsumer(redisClient, testConsumerID, db, logger)

	// Initialize consumer group
	err = consumer.initialize(ctx)
	require.NoError(t, err, "Failed to initialize consumer")

	// Publish lifecycle message
	err = publishJobLifecycleMessage(redisClient, ctx, &JobLifecycleMessage{
		Type:          TypeJob,
		Event:         EventCompleted,
		Queue:         "process-isobmff",
		JobID:         testJobID,
		Workflow:      "process-isobmff",
		WorkflowID:    testJobID,
		Timestamp:     time.Now().Unix(),
		AttemptNumber: 1,
	})
	require.NoError(t, err, "Failed to publish lifecycle message")

	// Process messages
	err = consumer.processMessages(ctx)
	require.NoError(t, err, "Failed to process messages")

	// Verify database update
	var completedAt *time.Time
	err = db.QueryRow("SELECT completed_at FROM video2.process_isobmff WHERE id = $1", testJobID).Scan(&completedAt)
	require.NoError(t, err, "Failed to query updated record")
	assert.NotNil(t, completedAt, "completed_at should be set")
	assert.WithinDuration(t, time.Now(), *completedAt, 5*time.Second, "completed_at should be recent")
}

func testProcessISOBMFFJobFailed(t *testing.T, db *sql.DB, redisClient *redisclient.Client, logger *zerolog.Logger) {
	ctx := context.Background()
	testJobID := fmt.Sprintf("test-job-%d", time.Now().UnixNano())

	// Clean up before and after
	cleanupRedis(t, redisClient, ctx)
	defer cleanupRedis(t, redisClient, ctx)
	defer cleanupDB(t, db, "video2.process_isobmff", testJobID)

	// Insert test record
	_, err := db.Exec(`
		INSERT INTO video2.process_isobmff (id, org_id, creator_id, api_key_id, source_type, url, started_at, completed_at, failed_at, unprocessed_file_id)
		VALUES ($1, '00000000-0000-0000-0000-000000000001'::uuid, '00000000-0000-0000-0000-000000000001'::uuid, '00000000-0000-0000-0000-000000000001'::uuid, 'url', 'http://example.com/test.mp4', NOW(), NULL, NULL, '00000000-0000-0000-0000-000000000001'::uuid)
	`, testJobID)
	require.NoError(t, err, "Failed to insert test record")

	// Create consumer
	consumer := NewConsumer(redisClient, testConsumerID, db, logger)

	// Initialize consumer group
	err = consumer.initialize(ctx)
	require.NoError(t, err, "Failed to initialize consumer")

	// Publish lifecycle message
	err = publishJobLifecycleMessage(redisClient, ctx, &JobLifecycleMessage{
		Type:          TypeJob,
		Event:         EventFailed,
		Queue:         "process-isobmff",
		JobID:         testJobID,
		Workflow:      "process-isobmff",
		WorkflowID:    testJobID,
		Timestamp:     time.Now().Unix(),
		AttemptNumber: 1,
	})
	require.NoError(t, err, "Failed to publish lifecycle message")

	// Process messages
	err = consumer.processMessages(ctx)
	require.NoError(t, err, "Failed to process messages")

	// Verify database update
	var failedAt *time.Time
	err = db.QueryRow("SELECT failed_at FROM video2.process_isobmff WHERE id = $1", testJobID).Scan(&failedAt)
	require.NoError(t, err, "Failed to query updated record")
	assert.NotNil(t, failedAt, "failed_at should be set")
	assert.WithinDuration(t, time.Now(), *failedAt, 5*time.Second, "failed_at should be recent")
}

func testRenderJobStarted(t *testing.T, db *sql.DB, redisClient *redisclient.Client, logger *zerolog.Logger) {
	ctx := context.Background()
	testJobID := fmt.Sprintf("test-job-%d", time.Now().UnixNano())

	// Clean up before and after
	cleanupRedis(t, redisClient, ctx)
	defer cleanupRedis(t, redisClient, ctx)
	defer cleanupDB(t, db, "video2.renders", testJobID)

	// Insert test record
	_, err := db.Exec(`
		INSERT INTO video2.renders (id, org_id, creator_id, api_key_id, started_at, status)
		VALUES ($1, '00000000-0000-0000-0000-000000000001'::uuid, '00000000-0000-0000-0000-000000000001'::uuid, '00000000-0000-0000-0000-000000000001'::uuid, NULL, 'pending')
	`, testJobID)
	require.NoError(t, err, "Failed to insert test record")

	// Create consumer
	consumer := NewConsumer(redisClient, testConsumerID, db, logger)

	// Initialize consumer group
	err = consumer.initialize(ctx)
	require.NoError(t, err, "Failed to initialize consumer")

	// Publish lifecycle message - note: render-initializer uses workflowId as the identifier
	err = publishJobLifecycleMessage(redisClient, ctx, &JobLifecycleMessage{
		Type:          TypeJob,
		Event:         EventStarted,
		Queue:         "render-initializer",
		JobID:         "some-job-id", // Different from workflowId
		Workflow:      "render",
		WorkflowID:    testJobID, // This is what gets used for renders table
		Timestamp:     time.Now().Unix(),
		AttemptNumber: 1,
	})
	require.NoError(t, err, "Failed to publish lifecycle message")

	// Process messages
	err = consumer.processMessages(ctx)
	require.NoError(t, err, "Failed to process messages")

	// Verify database update
	var startedAt *time.Time
	var status string
	err = db.QueryRow("SELECT started_at, status FROM video2.renders WHERE id = $1", testJobID).Scan(&startedAt, &status)
	require.NoError(t, err, "Failed to query updated record")
	assert.NotNil(t, startedAt, "started_at should be set")
	assert.Equal(t, "rendering", status, "status should be set to 'rendering'")
	assert.WithinDuration(t, time.Now(), *startedAt, 5*time.Second, "started_at should be recent")
}

func testProcessHTMLJobStarted(t *testing.T, db *sql.DB, redisClient *redisclient.Client, logger *zerolog.Logger) {
	ctx := context.Background()
	testJobID := fmt.Sprintf("test-job-%d", time.Now().UnixNano())

	// Clean up before and after
	cleanupRedis(t, redisClient, ctx)
	defer cleanupRedis(t, redisClient, ctx)
	defer cleanupDB(t, db, "video2.process_html", testJobID)

	// Insert test record
	_, err := db.Exec(`
		INSERT INTO video2.process_html (id, org_id, creator_id, api_key_id, html, render_id, started_at)
		VALUES ($1, '00000000-0000-0000-0000-000000000001'::uuid, '00000000-0000-0000-0000-000000000001'::uuid, '00000000-0000-0000-0000-000000000001'::uuid, '<html></html>', 'render-id', NULL)
	`, testJobID)
	require.NoError(t, err, "Failed to insert test record")

	// Create consumer
	consumer := NewConsumer(redisClient, testConsumerID, db, logger)

	// Initialize consumer group
	err = consumer.initialize(ctx)
	require.NoError(t, err, "Failed to initialize consumer")

	// Publish lifecycle message - note: process-html-initializer uses workflowId as the identifier
	err = publishJobLifecycleMessage(redisClient, ctx, &JobLifecycleMessage{
		Type:          TypeJob,
		Event:         EventStarted,
		Queue:         "process-html-initializer",
		JobID:         "some-job-id", // Different from workflowId
		Workflow:      "process-html",
		WorkflowID:    testJobID, // This is what gets used for process_html table
		Timestamp:     time.Now().Unix(),
		AttemptNumber: 1,
	})
	require.NoError(t, err, "Failed to publish lifecycle message")

	// Process messages
	err = consumer.processMessages(ctx)
	require.NoError(t, err, "Failed to process messages")

	// Verify database update
	var startedAt *time.Time
	err = db.QueryRow("SELECT started_at FROM video2.process_html WHERE id = $1", testJobID).Scan(&startedAt)
	require.NoError(t, err, "Failed to query updated record")
	assert.NotNil(t, startedAt, "started_at should be set")
	assert.WithinDuration(t, time.Now(), *startedAt, 5*time.Second, "started_at should be recent")
}

func testRenderWorkflowFailure(t *testing.T, db *sql.DB, redisClient *redisclient.Client, logger *zerolog.Logger) {
	ctx := context.Background()
	testWorkflowID := fmt.Sprintf("test-workflow-%d", time.Now().UnixNano())

	// Clean up before and after
	cleanupRedis(t, redisClient, ctx)
	defer cleanupRedis(t, redisClient, ctx)
	defer cleanupDB(t, db, "video2.renders", testWorkflowID)

	// Insert test render record
	_, err := db.Exec(`
		INSERT INTO video2.renders (id, org_id, creator_id, api_key_id, status, started_at, failed_at)
		VALUES ($1, '00000000-0000-0000-0000-000000000001'::uuid, '00000000-0000-0000-0000-000000000001'::uuid, '00000000-0000-0000-0000-000000000001'::uuid, 'rendering', NOW(), NULL)
	`, testWorkflowID)
	require.NoError(t, err, "Failed to insert test render record")

	// Create consumer
	consumer := NewConsumer(redisClient, testConsumerID, db, logger)

	// Initialize consumer group
	err = consumer.initialize(ctx)
	require.NoError(t, err, "Failed to initialize consumer")

	// Publish workflow failure message
	err = publishWorkflowLifecycleMessage(redisClient, ctx, &WorkflowLifecycleMessage{
		Type:         TypeWorkflow,
		Event:        EventFailed,
		WorkflowID:   testWorkflowID,
		WorkflowName: "render",
		OrgID:        "00000000-0000-0000-0000-000000000001",
		Timestamp:    time.Now().Unix(),
		Details: map[string]interface{}{
			"error": "Test render failure",
		},
	})
	require.NoError(t, err, "Failed to publish workflow failure message")

	// Process messages
	err = consumer.processMessages(ctx)
	require.NoError(t, err, "Failed to process messages")

	// Verify database update
	var status string
	var failedAt *time.Time
	var completedAt *time.Time
	var failureDetail []byte
	err = db.QueryRow("SELECT status, failed_at, completed_at, failure_detail FROM video2.renders WHERE id = $1", testWorkflowID).
		Scan(&status, &failedAt, &completedAt, &failureDetail)
	require.NoError(t, err, "Failed to query updated render record")

	assert.Equal(t, "failed", status, "status should be set to 'failed'")
	assert.NotNil(t, failedAt, "failed_at should be set")
	assert.Nil(t, completedAt, "completed_at should be NULL")
	assert.WithinDuration(t, time.Now(), *failedAt, 5*time.Second, "failed_at should be recent")

	// Verify failure_detail is properly set
	assert.NotNil(t, failureDetail, "failure_detail should be set")
	if failureDetail != nil {
		var parsedDetail map[string]interface{}
		err = json.Unmarshal(failureDetail, &parsedDetail)
		require.NoError(t, err, "failure_detail should be valid JSON")
		assert.Equal(t, "Test render failure", parsedDetail["error"], "failure_detail should contain the error message")
	}
}

func testProcessHTMLWorkflowFailure(t *testing.T, db *sql.DB, redisClient *redisclient.Client, logger *zerolog.Logger) {
	ctx := context.Background()
	testWorkflowID := fmt.Sprintf("test-workflow-%d", time.Now().UnixNano())
	testProcessHTMLID := fmt.Sprintf("test-process-html-%d", time.Now().UnixNano())
	testRenderID := fmt.Sprintf("test-render-%d", time.Now().UnixNano())

	// Clean up before and after
	cleanupRedis(t, redisClient, ctx)
	defer cleanupRedis(t, redisClient, ctx)
	defer cleanupDB(t, db, "video2.process_html", testProcessHTMLID)
	defer cleanupDB(t, db, "video2.renders", testRenderID)

	// Insert test process_html record
	_, err := db.Exec(`
		INSERT INTO video2.process_html (id, org_id, creator_id, api_key_id, html, render_id, started_at, failed_at)
		VALUES ($1, '00000000-0000-0000-0000-000000000001'::uuid, '00000000-0000-0000-0000-000000000001'::uuid, '00000000-0000-0000-0000-000000000001'::uuid, '<html></html>', $2, NOW(), NULL)
	`, testProcessHTMLID, testRenderID)
	require.NoError(t, err, "Failed to insert test process_html record")

	// Insert test render record
	_, err = db.Exec(`
		INSERT INTO video2.renders (id, org_id, creator_id, api_key_id, status, started_at, failed_at)
		VALUES ($1, '00000000-0000-0000-0000-000000000001'::uuid, '00000000-0000-0000-0000-000000000001'::uuid, '00000000-0000-0000-0000-000000000001'::uuid, 'rendering', NOW(), NULL)
	`, testRenderID)
	require.NoError(t, err, "Failed to insert test render record")

	// Create consumer
	consumer := NewConsumer(redisClient, testConsumerID, db, logger)

	// Initialize consumer group
	err = consumer.initialize(ctx)
	require.NoError(t, err, "Failed to initialize consumer")

	// Publish workflow failure message with nested workflow details
	err = publishWorkflowLifecycleMessage(redisClient, ctx, &WorkflowLifecycleMessage{
		Type:         TypeWorkflow,
		Event:        EventFailed,
		WorkflowID:   testWorkflowID,
		WorkflowName: "process-html",
		OrgID:        "00000000-0000-0000-0000-000000000001",
		Timestamp:    time.Now().Unix(),
		Details: map[string]interface{}{
			"error": "Test HTML processing failure",
			"workflow": map[string]interface{}{
				"processHtml": map[string]interface{}{
					"id": testProcessHTMLID,
				},
				"render": map[string]interface{}{
					"id": testRenderID,
				},
			},
		},
	})
	require.NoError(t, err, "Failed to publish workflow failure message")

	// Process messages
	err = consumer.processMessages(ctx)
	require.NoError(t, err, "Failed to process messages")

	// Verify process_html table update
	var htmlFailedAt *time.Time
	var htmlCompletedAt *time.Time
	err = db.QueryRow("SELECT failed_at, completed_at FROM video2.process_html WHERE id = $1", testProcessHTMLID).
		Scan(&htmlFailedAt, &htmlCompletedAt)
	require.NoError(t, err, "Failed to query updated process_html record")

	assert.NotNil(t, htmlFailedAt, "process_html failed_at should be set")
	assert.Nil(t, htmlCompletedAt, "process_html completed_at should be NULL")
	if htmlFailedAt != nil {
		assert.WithinDuration(t, time.Now(), *htmlFailedAt, 5*time.Second, "process_html failed_at should be recent")
	}

	// Verify renders table update
	var renderStatus string
	var renderFailedAt *time.Time
	var renderCompletedAt *time.Time
	err = db.QueryRow("SELECT status, failed_at, completed_at FROM video2.renders WHERE id = $1", testRenderID).
		Scan(&renderStatus, &renderFailedAt, &renderCompletedAt)
	require.NoError(t, err, "Failed to query updated render record")

	assert.Equal(t, "failed", renderStatus, "render status should be set to 'failed'")
	assert.NotNil(t, renderFailedAt, "render failed_at should be set")
	assert.Nil(t, renderCompletedAt, "render completed_at should be NULL")
	if renderFailedAt != nil {
		assert.WithinDuration(t, time.Now(), *renderFailedAt, 5*time.Second, "render failed_at should be recent")
	}
}

func testRenderFinalizerJobCompleted(t *testing.T, db *sql.DB, redisClient *redisclient.Client, logger *zerolog.Logger) {
	ctx := context.Background()
	testJobID := fmt.Sprintf("test-job-%d", time.Now().UnixNano())

	// Clean up before and after
	cleanupRedis(t, redisClient, ctx)
	defer cleanupRedis(t, redisClient, ctx)
	defer cleanupDB(t, db, "video2.renders", testJobID)

	// Insert test render record
	_, err := db.Exec(`
		INSERT INTO video2.renders (id, org_id, creator_id, api_key_id, status, started_at, completed_at)
		VALUES ($1, '00000000-0000-0000-0000-000000000001'::uuid, '00000000-0000-0000-0000-000000000001'::uuid, '00000000-0000-0000-0000-000000000001'::uuid, 'rendering', NOW(), NULL)
	`, testJobID)
	require.NoError(t, err, "Failed to insert test render record")

	// Create consumer
	consumer := NewConsumer(redisClient, testConsumerID, db, logger)

	// Initialize consumer group
	err = consumer.initialize(ctx)
	require.NoError(t, err, "Failed to initialize consumer")

	// Publish lifecycle message - note: render-finalizer uses workflowId as the identifier
	err = publishJobLifecycleMessage(redisClient, ctx, &JobLifecycleMessage{
		Type:          TypeJob,
		Event:         EventCompleted,
		Queue:         "render-finalizer",
		JobID:         "some-job-id", // Different from workflowId
		Workflow:      "render",
		WorkflowID:    testJobID, // This is what gets used for renders table
		Timestamp:     time.Now().Unix(),
		AttemptNumber: 1,
	})
	require.NoError(t, err, "Failed to publish lifecycle message")

	// Process messages
	err = consumer.processMessages(ctx)
	require.NoError(t, err, "Failed to process messages")

	// Verify database update
	var status string
	var completedAt *time.Time
	err = db.QueryRow("SELECT status, completed_at FROM video2.renders WHERE id = $1", testJobID).
		Scan(&status, &completedAt)
	require.NoError(t, err, "Failed to query updated render record")

	assert.Equal(t, "complete", status, "status should be set to 'complete'")
	assert.NotNil(t, completedAt, "completed_at should be set")
	assert.WithinDuration(t, time.Now(), *completedAt, 5*time.Second, "completed_at should be recent")
}

func testProcessHTMLFinalizerJobCompleted(t *testing.T, db *sql.DB, redisClient *redisclient.Client, logger *zerolog.Logger) {
	ctx := context.Background()
	testJobID := fmt.Sprintf("test-job-%d", time.Now().UnixNano())

	// Clean up before and after
	cleanupRedis(t, redisClient, ctx)
	defer cleanupRedis(t, redisClient, ctx)
	defer cleanupDB(t, db, "video2.process_html", testJobID)

	// Insert test process_html record
	_, err := db.Exec(`
		INSERT INTO video2.process_html (id, org_id, creator_id, api_key_id, html, render_id, started_at, completed_at)
		VALUES ($1, '00000000-0000-0000-0000-000000000001'::uuid, '00000000-0000-0000-0000-000000000001'::uuid, '00000000-0000-0000-0000-000000000001'::uuid, '<html></html>', 'render-id', NOW(), NULL)
	`, testJobID)
	require.NoError(t, err, "Failed to insert test process_html record")

	// Create consumer
	consumer := NewConsumer(redisClient, testConsumerID, db, logger)

	// Initialize consumer group
	err = consumer.initialize(ctx)
	require.NoError(t, err, "Failed to initialize consumer")

	// Publish lifecycle message - note: process-html-finalizer uses workflowId as the identifier
	err = publishJobLifecycleMessage(redisClient, ctx, &JobLifecycleMessage{
		Type:          TypeJob,
		Event:         EventCompleted,
		Queue:         "process-html-finalizer",
		JobID:         "some-job-id", // Different from workflowId
		Workflow:      "process-html",
		WorkflowID:    testJobID, // This is what gets used for process_html table
		Timestamp:     time.Now().Unix(),
		AttemptNumber: 1,
	})
	require.NoError(t, err, "Failed to publish lifecycle message")

	// Process messages
	err = consumer.processMessages(ctx)
	require.NoError(t, err, "Failed to process messages")

	// Verify database update
	var completedAt *time.Time
	err = db.QueryRow("SELECT completed_at FROM video2.process_html WHERE id = $1", testJobID).
		Scan(&completedAt)
	require.NoError(t, err, "Failed to query updated process_html record")

	assert.NotNil(t, completedAt, "completed_at should be set")
	assert.WithinDuration(t, time.Now(), *completedAt, 5*time.Second, "completed_at should be recent")
}

// Helper functions

func publishJobLifecycleMessage(redisClient *redisclient.Client, ctx context.Context, msg *JobLifecycleMessage) error {
	// This mimics the TypeScript publishJobLifecycle function
	return redisClient.XAdd(ctx, &redis.XAddArgs{
		Stream: StreamKey,
		MaxLen: 10000,
		Approx: true,
		Values: map[string]interface{}{
			"jobId":         msg.JobID,
			"attemptNumber": fmt.Sprintf("%d", msg.AttemptNumber),
			"type":          string(msg.Type),
			"queue":         msg.Queue,
			"workflow":      msg.Workflow,
			"workflowId":    msg.WorkflowID,
			"event":         string(msg.Event),
			"timestamp":     fmt.Sprintf("%d", msg.Timestamp),
		},
	}).Err()
}

func publishWorkflowLifecycleMessage(redisClient *redisclient.Client, ctx context.Context, msg *WorkflowLifecycleMessage) error {
	// This mimics the TypeScript publishJobLifecycle function for workflow messages
	values := map[string]interface{}{
		"workflowId":   msg.WorkflowID,
		"workflowName": msg.WorkflowName,
		"orgId":        msg.OrgID,
		"event":        string(msg.Event),
		"type":         string(msg.Type),
		"timestamp":    fmt.Sprintf("%d", msg.Timestamp),
	}

	// Add details if present
	if msg.Details != nil {
		detailsJSON, err := json.Marshal(msg.Details)
		if err != nil {
			return fmt.Errorf("failed to marshal details: %w", err)
		}
		values["details"] = string(detailsJSON)
	}

	return redisClient.XAdd(ctx, &redis.XAddArgs{
		Stream: StreamKey,
		MaxLen: 10000,
		Approx: true,
		Values: values,
	}).Err()
}

func cleanupRedis(t *testing.T, redisClient *redisclient.Client, ctx context.Context) {
	// Delete test stream and consumer group
	redisClient.Del(ctx, StreamKey)
	// Ignore errors as the group might not exist
	redisClient.XGroupDestroy(ctx, StreamKey, ConsumerGroup)
}

func cleanupDB(t *testing.T, db *sql.DB, tableName, jobID string) {
	_, err := db.Exec(fmt.Sprintf("DELETE FROM %s WHERE id = $1", tableName), jobID)
	if err != nil {
		t.Logf("Warning: failed to cleanup test record: %v", err)
	}
}

// TestConsumerGroupErrorDetection tests that the consumer correctly detects and handles NOGROUP errors
func TestConsumerGroupErrorDetection(t *testing.T) {
	_ = testutil.WithTestSpan(t)
	logger := testutil.Logger()

	// Create consumer with mock client (we don't need real Redis for this test)
	consumer := &Consumer{
		client:     nil, // We'll test the error detection logic directly
		consumerID: "test-consumer",
		logger:     logger,
		registry:   nil,
		stopCh:     make(chan struct{}),
	}

	// Test various error scenarios
	testCases := []struct {
		name        string
		err         error
		shouldMatch bool
	}{
		{
			name:        "NOGROUP error should match",
			err:         fmt.Errorf("NOGROUP No such key 'lifecycle:jobs' or consumer group 'default' in XREADGROUP"),
			shouldMatch: true,
		},
		{
			name:        "No such key error should match",
			err:         fmt.Errorf("No such key lifecycle:jobs"),
			shouldMatch: true,
		},
		{
			name:        "Consumer group error should match",
			err:         fmt.Errorf("consumer group does not exist"),
			shouldMatch: true,
		},
		{
			name:        "Redis Nil should not match",
			err:         redis.Nil,
			shouldMatch: false,
		},
		{
			name:        "Generic error should not match",
			err:         fmt.Errorf("connection refused"),
			shouldMatch: false,
		},
		{
			name:        "Nil error should not match",
			err:         nil,
			shouldMatch: false,
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			result := consumer.isConsumerGroupError(tc.err)
			assert.Equal(t, tc.shouldMatch, result, "Error detection mismatch for: %v", tc.err)
		})
	}
}
