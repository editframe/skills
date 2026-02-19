package claim

import (
	"context"
	"os"
	"testing"
	"time"

	"github.com/redis/go-redis/v9"
	"github.com/rs/zerolog"
)

func testClient(t *testing.T) *redis.Client {
	t.Helper()
	addr := os.Getenv("VALKEY_ADDR")
	if addr == "" {
		addr = "localhost:6379"
	}
	client := redis.NewClient(&redis.Options{Addr: addr})
	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()
	if err := client.Ping(ctx).Err(); err != nil {
		t.Skipf("Valkey not available at %s: %v", addr, err)
	}
	t.Cleanup(func() { client.Close() })
	return client
}

func TestSetAndGetClaim(t *testing.T) {
	client := testClient(t)
	ctx := context.Background()
	logger := zerolog.Nop()

	// Clean up test keys
	client.Del(ctx, aliveKey, claimKeyPrefix+"test-q")
	t.Cleanup(func() {
		client.Del(ctx, aliveKey, claimKeyPrefix+"test-q")
	})

	mgr := NewManager("instance-A", client, []string{"test-q"}, logger)
	mgr.Start(ctx)
	defer mgr.Stop(ctx)

	// Wait for first heartbeat
	time.Sleep(50 * time.Millisecond)

	if err := mgr.SetClaim(ctx, "test-q", 5); err != nil {
		t.Fatalf("SetClaim: %v", err)
	}

	myClaim, err := mgr.GetMyClaim(ctx, "test-q")
	if err != nil {
		t.Fatalf("GetMyClaim: %v", err)
	}
	if myClaim != 5 {
		t.Fatalf("expected claim 5, got %d", myClaim)
	}

	total, err := mgr.GetTotalClaimed(ctx, "test-q")
	if err != nil {
		t.Fatalf("GetTotalClaimed: %v", err)
	}
	if total != 5 {
		t.Fatalf("expected total 5, got %d", total)
	}
}

func TestMultipleInstances(t *testing.T) {
	client := testClient(t)
	ctx := context.Background()
	logger := zerolog.Nop()

	client.Del(ctx, aliveKey, claimKeyPrefix+"test-q")
	t.Cleanup(func() {
		client.Del(ctx, aliveKey, claimKeyPrefix+"test-q")
	})

	mgrA := NewManager("instance-A", client, []string{"test-q"}, logger)
	mgrA.Start(ctx)
	defer mgrA.Stop(ctx)

	mgrB := NewManager("instance-B", client, []string{"test-q"}, logger)
	mgrB.Start(ctx)
	defer mgrB.Stop(ctx)

	time.Sleep(50 * time.Millisecond)

	mgrA.SetClaim(ctx, "test-q", 5)
	mgrB.SetClaim(ctx, "test-q", 3)

	total, err := mgrA.GetTotalClaimed(ctx, "test-q")
	if err != nil {
		t.Fatalf("GetTotalClaimed: %v", err)
	}
	if total != 8 {
		t.Fatalf("expected total 8 (5+3), got %d", total)
	}
}

func TestStaleCleanup(t *testing.T) {
	client := testClient(t)
	ctx := context.Background()
	logger := zerolog.Nop()

	client.Del(ctx, aliveKey, claimKeyPrefix+"test-q")
	t.Cleanup(func() {
		client.Del(ctx, aliveKey, claimKeyPrefix+"test-q")
	})

	// Simulate a stale instance: write presence with old timestamp
	client.ZAdd(ctx, aliveKey, redis.Z{
		Score:  float64(time.Now().Add(-20 * time.Second).UnixMilli()),
		Member: "stale-instance",
	})
	client.HSet(ctx, claimKeyPrefix+"test-q", "stale-instance", "10")

	mgr := NewManager("live-instance", client, []string{"test-q"}, logger)
	mgr.Start(ctx)
	defer mgr.Stop(ctx)

	time.Sleep(50 * time.Millisecond)
	mgr.SetClaim(ctx, "test-q", 5)

	// Before cleanup: total includes stale claims
	// But GetTotalClaimed only counts live instances
	total, err := mgr.GetTotalClaimed(ctx, "test-q")
	if err != nil {
		t.Fatalf("GetTotalClaimed: %v", err)
	}
	if total != 5 {
		t.Fatalf("expected total 5 (stale excluded), got %d", total)
	}

	// Trigger cleanup manually
	mgr.cleanupStale(ctx)

	// Stale instance's claim should be removed from hash
	val, err := client.HGet(ctx, claimKeyPrefix+"test-q", "stale-instance").Result()
	if err != redis.Nil {
		t.Fatalf("expected stale claim to be deleted, got val=%q err=%v", val, err)
	}
}

func TestStopRemovesPresence(t *testing.T) {
	client := testClient(t)
	ctx := context.Background()
	logger := zerolog.Nop()

	client.Del(ctx, aliveKey, claimKeyPrefix+"test-q")
	t.Cleanup(func() {
		client.Del(ctx, aliveKey, claimKeyPrefix+"test-q")
	})

	mgr := NewManager("instance-X", client, []string{"test-q"}, logger)
	mgr.Start(ctx)

	time.Sleep(50 * time.Millisecond)
	mgr.SetClaim(ctx, "test-q", 7)

	mgr.Stop(ctx)

	// Presence should be removed
	score, err := client.ZScore(ctx, aliveKey, "instance-X").Result()
	if err != redis.Nil {
		t.Fatalf("expected presence removed, got score=%f err=%v", score, err)
	}

	// Claim should be removed
	val, err := client.HGet(ctx, claimKeyPrefix+"test-q", "instance-X").Result()
	if err != redis.Nil {
		t.Fatalf("expected claim removed, got val=%q err=%v", val, err)
	}
}
