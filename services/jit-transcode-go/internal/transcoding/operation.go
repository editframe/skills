package transcoding

import (
	"fmt"
	"sync"
)

type TranscodeResult struct {
	Buffer         []byte
	TranscodeTimeMs int64
	CacheKey       string
	Error          error
}

type TranscodeOperation struct {
	mu          sync.Mutex
	operationKey string
	result      *TranscodeResult
	done        chan struct{}
	refCount    int
	executed    bool
}

var (
	activeOperations sync.Map
)

func GetOrCreateOperation(cacheKey string, executeFn func() TranscodeResult) *TranscodeOperation {
	if existing, ok := activeOperations.Load(cacheKey); ok {
		op := existing.(*TranscodeOperation)
		op.mu.Lock()
		op.refCount++
		op.mu.Unlock()
		return op
	}

	op := &TranscodeOperation{
		operationKey: cacheKey,
		done:         make(chan struct{}),
		refCount:     1,
		executed:     false,
	}

	actual, loaded := activeOperations.LoadOrStore(cacheKey, op)
	if loaded {
		existingOp := actual.(*TranscodeOperation)
		existingOp.mu.Lock()
		existingOp.refCount++
		existingOp.mu.Unlock()
		return existingOp
	}

	go op.execute(executeFn)

	return op
}

func (op *TranscodeOperation) execute(executeFn func() TranscodeResult) {
	op.mu.Lock()
	if op.executed {
		op.mu.Unlock()
		return
	}
	op.executed = true
	op.mu.Unlock()

	result := executeFn()
	
	op.mu.Lock()
	op.result = &result
	op.mu.Unlock()
	
	close(op.done)
}

func (op *TranscodeOperation) Wait() TranscodeResult {
	<-op.done
	
	op.mu.Lock()
	defer op.mu.Unlock()
	
	if op.result == nil {
		return TranscodeResult{
			Error: fmt.Errorf("operation completed without result"),
		}
	}
	
	return *op.result
}

func (op *TranscodeOperation) Release() {
	op.mu.Lock()
	defer op.mu.Unlock()

	op.refCount--
	if op.refCount <= 0 {
		activeOperations.Delete(op.operationKey)
	}
}

func GetActiveOperationCount() int {
	count := 0
	activeOperations.Range(func(key, value interface{}) bool {
		count++
		return true
	})
	return count
}

func ClearActiveOperations() {
	activeOperations.Range(func(key, value interface{}) bool {
		activeOperations.Delete(key)
		return true
	})
}

type OperationStats struct {
	ActiveCount int
	Operations  []OperationInfo
}

type OperationInfo struct {
	CacheKey string
	RefCount int
	Executed bool
}

func GetOperationStats() OperationStats {
	stats := OperationStats{
		Operations: make([]OperationInfo, 0),
	}

	activeOperations.Range(func(key, value interface{}) bool {
		stats.ActiveCount++
		op := value.(*TranscodeOperation)
		op.mu.Lock()
		info := OperationInfo{
			CacheKey: key.(string),
			RefCount: op.refCount,
			Executed: op.executed,
		}
		op.mu.Unlock()
		stats.Operations = append(stats.Operations, info)
		return true
	})

	return stats
}

type CachedSegment struct {
	mu          sync.RWMutex
	data        []byte
	cacheKey    string
	transcodeMs int64
}

var (
	memoryCache sync.Map
)

func GetFromMemoryCache(cacheKey string) ([]byte, int64, bool) {
	if val, ok := memoryCache.Load(cacheKey); ok {
		cached := val.(*CachedSegment)
		cached.mu.RLock()
		defer cached.mu.RUnlock()
		return cached.data, cached.transcodeMs, true
	}
	return nil, 0, false
}

func PutInMemoryCache(cacheKey string, data []byte, transcodeMs int64) {
	cached := &CachedSegment{
		data:        data,
		cacheKey:    cacheKey,
		transcodeMs: transcodeMs,
	}
	memoryCache.Store(cacheKey, cached)
}

func ClearMemoryCache() {
	memoryCache.Range(func(key, value interface{}) bool {
		memoryCache.Delete(key)
		return true
	})
}

func GetMemoryCacheSize() int {
	count := 0
	memoryCache.Range(func(key, value interface{}) bool {
		count++
		return true
	})
	return count
}

func GetMemoryCacheStats() string {
	var totalBytes int64
	count := 0

	memoryCache.Range(func(key, value interface{}) bool {
		count++
		cached := value.(*CachedSegment)
		cached.mu.RLock()
		totalBytes += int64(len(cached.data))
		cached.mu.RUnlock()
		return true
	})

	return fmt.Sprintf("Memory Cache: %d items, %d MB", count, totalBytes/(1024*1024))
}

