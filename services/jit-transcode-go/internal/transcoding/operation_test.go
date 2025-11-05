package transcoding

import (
	"sync"
	"testing"
	"time"
)

func TestGetOrCreateOperation(t *testing.T) {
	ClearActiveOperations()
	defer ClearActiveOperations()

	cacheKey := "test-key-1"
	executed := false
	var mu sync.Mutex

	executeFn := func() TranscodeResult {
		mu.Lock()
		executed = true
		mu.Unlock()
		time.Sleep(10 * time.Millisecond)
		return TranscodeResult{
			Buffer:          []byte("test data"),
			TranscodeTimeMs: 10,
			CacheKey:        cacheKey,
		}
	}

	op1 := GetOrCreateOperation(cacheKey, executeFn)
	op2 := GetOrCreateOperation(cacheKey, executeFn)

	if op1 != op2 {
		t.Error("Expected same operation for same cache key")
	}

	var wg sync.WaitGroup
	var result1, result2 TranscodeResult

	wg.Add(2)
	go func() {
		defer wg.Done()
		result1 = op1.Wait()
	}()
	go func() {
		defer wg.Done()
		result2 = op2.Wait()
	}()
	wg.Wait()

	if result1.Error != nil {
		t.Errorf("Unexpected error in result1: %v", result1.Error)
	}

	if result2.Error != nil {
		t.Errorf("Unexpected error in result2: %v", result2.Error)
	}

	if string(result1.Buffer) != "test data" {
		t.Errorf("Expected 'test data', got '%s' (len=%d)", string(result1.Buffer), len(result1.Buffer))
	}

	if string(result2.Buffer) != "test data" {
		t.Errorf("Expected 'test data', got '%s' (len=%d)", string(result2.Buffer), len(result2.Buffer))
	}

	mu.Lock()
	wasExecuted := executed
	mu.Unlock()

	if !wasExecuted {
		t.Error("Execute function should have been called")
	}

	op1.Release()
	op2.Release()

	count := GetActiveOperationCount()
	if count != 0 {
		t.Errorf("Expected 0 active operations after release, got %d", count)
	}
}

func TestOperationDeduplication(t *testing.T) {
	ClearActiveOperations()
	defer ClearActiveOperations()

	cacheKey := "test-dedup"
	executionCount := 0
	var mu sync.Mutex

	executeFn := func() TranscodeResult {
		mu.Lock()
		executionCount++
		mu.Unlock()
		time.Sleep(50 * time.Millisecond)
		return TranscodeResult{
			Buffer:          []byte("result"),
			TranscodeTimeMs: 50,
			CacheKey:        cacheKey,
		}
	}

	const numGoroutines = 10
	var wg sync.WaitGroup
	results := make([]TranscodeResult, numGoroutines)

	for i := 0; i < numGoroutines; i++ {
		wg.Add(1)
		go func(index int) {
			defer wg.Done()
			op := GetOrCreateOperation(cacheKey, executeFn)
			results[index] = op.Wait()
			op.Release()
		}(i)
	}

	wg.Wait()

	mu.Lock()
	finalCount := executionCount
	mu.Unlock()

	if finalCount != 1 {
		t.Errorf("Expected execute function to be called once, got %d times", finalCount)
	}

	for i, result := range results {
		if string(result.Buffer) != "result" {
			t.Errorf("Result %d has wrong data: %s", i, string(result.Buffer))
		}
	}
}

func TestMemoryCache(t *testing.T) {
	ClearMemoryCache()
	defer ClearMemoryCache()

	cacheKey := "memory-test"
	data := []byte("cached data")
	transcodeMs := int64(100)

	_, _, found := GetFromMemoryCache(cacheKey)
	if found {
		t.Error("Expected cache miss for new key")
	}

	PutInMemoryCache(cacheKey, data, transcodeMs)

	cachedData, cachedMs, found := GetFromMemoryCache(cacheKey)
	if !found {
		t.Error("Expected cache hit after putting data")
	}

	if string(cachedData) != string(data) {
		t.Errorf("Expected %s, got %s", string(data), string(cachedData))
	}

	if cachedMs != transcodeMs {
		t.Errorf("Expected %d ms, got %d ms", transcodeMs, cachedMs)
	}

	size := GetMemoryCacheSize()
	if size != 1 {
		t.Errorf("Expected cache size 1, got %d", size)
	}

	ClearMemoryCache()

	size = GetMemoryCacheSize()
	if size != 0 {
		t.Errorf("Expected cache size 0 after clear, got %d", size)
	}
}

func TestGetOperationStats(t *testing.T) {
	ClearActiveOperations()
	defer ClearActiveOperations()

	executeFn := func() TranscodeResult {
		time.Sleep(100 * time.Millisecond)
		return TranscodeResult{Buffer: []byte("test")}
	}

	op1 := GetOrCreateOperation("key1", executeFn)
	op2 := GetOrCreateOperation("key2", executeFn)

	stats := GetOperationStats()

	if stats.ActiveCount != 2 {
		t.Errorf("Expected 2 active operations, got %d", stats.ActiveCount)
	}

	if len(stats.Operations) != 2 {
		t.Errorf("Expected 2 operations in stats, got %d", len(stats.Operations))
	}

	op1.Release()
	op2.Release()

	op1.Wait()
	op2.Wait()
}

