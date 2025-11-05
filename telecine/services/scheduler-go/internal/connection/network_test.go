package connection

import (
	"context"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestMockNetworkDialer_Success(t *testing.T) {
	dialer := NewMockNetworkDialer(false, 0)
	ctx := context.Background()

	conn, err := dialer.Dial(ctx, "ws://test:8080")
	require.NoError(t, err)
	require.NotNil(t, conn)

	// Verify connection works
	err = conn.WriteMessage(1, []byte("test"))
	assert.NoError(t, err)

	err = conn.Close()
	assert.NoError(t, err)
}

func TestMockNetworkDialer_Failure(t *testing.T) {
	dialer := NewMockNetworkDialer(true, 2)
	ctx := context.Background()

	// First 2 connections should succeed
	conn1, err := dialer.Dial(ctx, "ws://test:8080")
	require.NoError(t, err)
	require.NotNil(t, conn1)

	conn2, err := dialer.Dial(ctx, "ws://test:8080")
	require.NoError(t, err)
	require.NotNil(t, conn2)

	// Third connection should fail
	conn3, err := dialer.Dial(ctx, "ws://test:8080")
	require.Error(t, err)
	require.Nil(t, conn3)
	assert.Contains(t, err.Error(), "mock connection failed")
}

func TestMockNetworkConn_Operations(t *testing.T) {
	conn := &mockNetworkConn{}

	// Test write
	err := conn.WriteMessage(1, []byte("test"))
	assert.NoError(t, err)

	// Test pong handler
	conn.SetPongHandler(func(appData string) error {
		return nil
	})
	assert.NotNil(t, conn.pongHandler)

	// Test deadline
	err = conn.SetReadDeadline(time.Now().Add(time.Second))
	assert.NoError(t, err)

	// Test control message
	err = conn.WriteControl(1, []byte("ping"), time.Now().Add(time.Second))
	assert.NoError(t, err)

	// Test close
	err = conn.Close()
	assert.NoError(t, err)
	assert.True(t, conn.closed)

	// Test read after close (should return error immediately)
	msgType, data, err := conn.ReadMessage()
	assert.Error(t, err)
	assert.Equal(t, 0, msgType)
	assert.Nil(t, data)

	// Operations after close should fail
	err = conn.WriteMessage(1, []byte("test"))
	assert.Error(t, err)
}

func TestRealNetworkDialer_Creation(t *testing.T) {
	dialer := NewRealNetworkDialer(20 * time.Second)
	assert.NotNil(t, dialer)
	assert.Equal(t, 20*time.Second, dialer.handshakeTimeout)
}
