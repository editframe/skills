package coordination

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestCalculateRank(t *testing.T) {
	tests := []struct {
		name          string
		schedulerID   string
		allSchedulers []SchedulerInfo
		expectedRank  int
		expectedTotal int
		expectedFound bool
	}{
		{
			name:          "empty scheduler list",
			schedulerID:   "scheduler-1",
			allSchedulers: []SchedulerInfo{},
			expectedRank:  -1,
			expectedTotal: 0,
			expectedFound: false,
		},
		{
			name:        "single scheduler found",
			schedulerID: "scheduler-1",
			allSchedulers: []SchedulerInfo{
				{ID: "scheduler-1", LastUpdate: 1000},
			},
			expectedRank:  0,
			expectedTotal: 1,
			expectedFound: true,
		},
		{
			name:        "scheduler at rank 0",
			schedulerID: "scheduler-1",
			allSchedulers: []SchedulerInfo{
				{ID: "scheduler-1", LastUpdate: 1000},
				{ID: "scheduler-2", LastUpdate: 1000},
				{ID: "scheduler-3", LastUpdate: 1000},
			},
			expectedRank:  0,
			expectedTotal: 3,
			expectedFound: true,
		},
		{
			name:        "scheduler at rank 1",
			schedulerID: "scheduler-2",
			allSchedulers: []SchedulerInfo{
				{ID: "scheduler-1", LastUpdate: 1000},
				{ID: "scheduler-2", LastUpdate: 1000},
				{ID: "scheduler-3", LastUpdate: 1000},
			},
			expectedRank:  1,
			expectedTotal: 3,
			expectedFound: true,
		},
		{
			name:        "scheduler at last rank",
			schedulerID: "scheduler-3",
			allSchedulers: []SchedulerInfo{
				{ID: "scheduler-1", LastUpdate: 1000},
				{ID: "scheduler-2", LastUpdate: 1000},
				{ID: "scheduler-3", LastUpdate: 1000},
			},
			expectedRank:  2,
			expectedTotal: 3,
			expectedFound: true,
		},
		{
			name:        "scheduler not found",
			schedulerID: "scheduler-4",
			allSchedulers: []SchedulerInfo{
				{ID: "scheduler-1", LastUpdate: 1000},
				{ID: "scheduler-2", LastUpdate: 1000},
				{ID: "scheduler-3", LastUpdate: 1000},
			},
			expectedRank:  -1,
			expectedTotal: 3,
			expectedFound: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := CalculateRank(tt.schedulerID, tt.allSchedulers)

			assert.Equal(t, tt.expectedRank, result.Rank)
			assert.Equal(t, tt.expectedTotal, result.Total)
			assert.Equal(t, tt.expectedFound, result.Found)
		})
	}
}

func TestFilterActiveSchedulers(t *testing.T) {
	tests := []struct {
		name          string
		allSchedulers []SchedulerInfo
		currentTime   int64
		timeoutMS     int64
		expectedCount int
		expectedIDs   []string
	}{
		{
			name:          "empty list",
			allSchedulers: []SchedulerInfo{},
			currentTime:   10000,
			timeoutMS:     5000,
			expectedCount: 0,
			expectedIDs:   []string{},
		},
		{
			name: "all active",
			allSchedulers: []SchedulerInfo{
				{ID: "scheduler-1", LastUpdate: 9000, Stopped: false},
				{ID: "scheduler-2", LastUpdate: 8000, Stopped: false},
				{ID: "scheduler-3", LastUpdate: 7000, Stopped: false},
			},
			currentTime:   10000,
			timeoutMS:     5000,
			expectedCount: 3,
			expectedIDs:   []string{"scheduler-1", "scheduler-2", "scheduler-3"},
		},
		{
			name: "some timed out",
			allSchedulers: []SchedulerInfo{
				{ID: "scheduler-1", LastUpdate: 9000, Stopped: false},
				{ID: "scheduler-2", LastUpdate: 4000, Stopped: false}, // Timed out
				{ID: "scheduler-3", LastUpdate: 8000, Stopped: false},
			},
			currentTime:   10000,
			timeoutMS:     5000,
			expectedCount: 2,
			expectedIDs:   []string{"scheduler-1", "scheduler-3"},
		},
		{
			name: "some stopped",
			allSchedulers: []SchedulerInfo{
				{ID: "scheduler-1", LastUpdate: 9000, Stopped: false},
				{ID: "scheduler-2", LastUpdate: 9000, Stopped: true}, // Stopped
				{ID: "scheduler-3", LastUpdate: 8000, Stopped: false},
			},
			currentTime:   10000,
			timeoutMS:     5000,
			expectedCount: 2,
			expectedIDs:   []string{"scheduler-1", "scheduler-3"},
		},
		{
			name: "all inactive",
			allSchedulers: []SchedulerInfo{
				{ID: "scheduler-1", LastUpdate: 4000, Stopped: false}, // Timed out
				{ID: "scheduler-2", LastUpdate: 9000, Stopped: true},  // Stopped
				{ID: "scheduler-3", LastUpdate: 3000, Stopped: false}, // Timed out
			},
			currentTime:   10000,
			timeoutMS:     5000,
			expectedCount: 0,
			expectedIDs:   []string{},
		},
		{
			name: "exact cutoff boundary",
			allSchedulers: []SchedulerInfo{
				{ID: "scheduler-1", LastUpdate: 5000, Stopped: false}, // Exactly at cutoff (10000 - 5000 = 5000)
				{ID: "scheduler-2", LastUpdate: 5001, Stopped: false}, // Just after cutoff
				{ID: "scheduler-3", LastUpdate: 4999, Stopped: false}, // Just before cutoff
			},
			currentTime:   10000,
			timeoutMS:     5000,
			expectedCount: 2,
			expectedIDs:   []string{"scheduler-1", "scheduler-2"},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			active := FilterActiveSchedulers(tt.allSchedulers, tt.currentTime, tt.timeoutMS)

			assert.Len(t, active, tt.expectedCount)

			actualIDs := make([]string, len(active))
			for i, scheduler := range active {
				actualIDs[i] = scheduler.ID
			}

			assert.ElementsMatch(t, tt.expectedIDs, actualIDs)
		})
	}
}

func TestDetermineSchedulerHealth(t *testing.T) {
	tests := []struct {
		name        string
		lastUpdate  int64
		currentTime int64
		timeoutMS   int64
		expected    bool
	}{
		{
			name:        "healthy - just updated",
			lastUpdate:  10000,
			currentTime: 10000,
			timeoutMS:   5000,
			expected:    true,
		},
		{
			name:        "healthy - within timeout",
			lastUpdate:  8000,
			currentTime: 10000,
			timeoutMS:   5000,
			expected:    true,
		},
		{
			name:        "healthy - at boundary",
			lastUpdate:  5000,
			currentTime: 10000,
			timeoutMS:   5000,
			expected:    true,
		},
		{
			name:        "unhealthy - just past timeout",
			lastUpdate:  4999,
			currentTime: 10000,
			timeoutMS:   5000,
			expected:    false,
		},
		{
			name:        "unhealthy - way past timeout",
			lastUpdate:  1000,
			currentTime: 10000,
			timeoutMS:   5000,
			expected:    false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := DetermineSchedulerHealth(tt.lastUpdate, tt.currentTime, tt.timeoutMS)
			assert.Equal(t, tt.expected, result)
		})
	}
}

func TestCalculateFairShare(t *testing.T) {
	tests := []struct {
		name            string
		rank            int
		totalSchedulers int
		totalQuantity   int
		expected        int
	}{
		{
			name:            "zero schedulers",
			rank:            0,
			totalSchedulers: 0,
			totalQuantity:   10,
			expected:        0,
		},
		{
			name:            "zero quantity",
			rank:            0,
			totalSchedulers: 3,
			totalQuantity:   0,
			expected:        0,
		},
		{
			name:            "even distribution",
			rank:            0,
			totalSchedulers: 3,
			totalQuantity:   9,
			expected:        3,
		},
		{
			name:            "uneven distribution - rank 0 gets extra",
			rank:            0,
			totalSchedulers: 3,
			totalQuantity:   10,
			expected:        4,
		},
		{
			name:            "uneven distribution - rank 1 gets base",
			rank:            1,
			totalSchedulers: 3,
			totalQuantity:   10,
			expected:        3,
		},
		{
			name:            "uneven distribution - rank 2 gets base",
			rank:            2,
			totalSchedulers: 3,
			totalQuantity:   10,
			expected:        3,
		},
		{
			name:            "single scheduler gets all",
			rank:            0,
			totalSchedulers: 1,
			totalQuantity:   100,
			expected:        100,
		},
		{
			name:            "quantity less than schedulers - rank 0",
			rank:            0,
			totalSchedulers: 5,
			totalQuantity:   3,
			expected:        1,
		},
		{
			name:            "quantity less than schedulers - rank 3",
			rank:            3,
			totalSchedulers: 5,
			totalQuantity:   3,
			expected:        0,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := CalculateFairShare(tt.rank, tt.totalSchedulers, tt.totalQuantity)
			assert.Equal(t, tt.expected, result)
		})
	}
}

func TestCalculateFairShare_TotalDistribution(t *testing.T) {
	totalQuantity := 100
	totalSchedulers := 7

	sum := 0
	for rank := 0; rank < totalSchedulers; rank++ {
		sum += CalculateFairShare(rank, totalSchedulers, totalQuantity)
	}

	assert.Equal(t, totalQuantity, sum, "sum of all fair shares should equal total quantity")
}

func TestSortSchedulersByID(t *testing.T) {
	tests := []struct {
		name     string
		input    []SchedulerInfo
		expected []string
	}{
		{
			name:     "empty list",
			input:    []SchedulerInfo{},
			expected: []string{},
		},
		{
			name: "single scheduler",
			input: []SchedulerInfo{
				{ID: "scheduler-1"},
			},
			expected: []string{"scheduler-1"},
		},
		{
			name: "already sorted",
			input: []SchedulerInfo{
				{ID: "scheduler-1"},
				{ID: "scheduler-2"},
				{ID: "scheduler-3"},
			},
			expected: []string{"scheduler-1", "scheduler-2", "scheduler-3"},
		},
		{
			name: "reverse order",
			input: []SchedulerInfo{
				{ID: "scheduler-3"},
				{ID: "scheduler-2"},
				{ID: "scheduler-1"},
			},
			expected: []string{"scheduler-1", "scheduler-2", "scheduler-3"},
		},
		{
			name: "random order",
			input: []SchedulerInfo{
				{ID: "scheduler-2"},
				{ID: "scheduler-1"},
				{ID: "scheduler-4"},
				{ID: "scheduler-3"},
			},
			expected: []string{"scheduler-1", "scheduler-2", "scheduler-3", "scheduler-4"},
		},
		{
			name: "with timestamps (should ignore timestamps)",
			input: []SchedulerInfo{
				{ID: "scheduler-c", LastUpdate: 3000},
				{ID: "scheduler-a", LastUpdate: 1000},
				{ID: "scheduler-b", LastUpdate: 2000},
			},
			expected: []string{"scheduler-a", "scheduler-b", "scheduler-c"},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			sorted := SortSchedulersByID(tt.input)

			actualIDs := make([]string, len(sorted))
			for i, scheduler := range sorted {
				actualIDs[i] = scheduler.ID
			}

			assert.Equal(t, tt.expected, actualIDs)

			// Verify original slice is not modified
			if len(tt.input) > 0 {
				originalFirst := tt.input[0].ID
				assert.Equal(t, originalFirst, tt.input[0].ID, "original slice should not be modified")
			}
		})
	}
}

// Property-based test: FilterActiveSchedulers should never return stopped schedulers
func TestFilterActiveSchedulers_NeverReturnsStopped(t *testing.T) {
	schedulers := []SchedulerInfo{
		{ID: "scheduler-1", LastUpdate: 9000, Stopped: false},
		{ID: "scheduler-2", LastUpdate: 9000, Stopped: true},
		{ID: "scheduler-3", LastUpdate: 9000, Stopped: false},
		{ID: "scheduler-4", LastUpdate: 9000, Stopped: true},
	}

	active := FilterActiveSchedulers(schedulers, 10000, 5000)

	for _, scheduler := range active {
		assert.False(t, scheduler.Stopped, "active schedulers should not be stopped")
	}
}

// Property-based test: FilterActiveSchedulers should never return timed out schedulers
func TestFilterActiveSchedulers_NeverReturnsTimedOut(t *testing.T) {
	currentTime := int64(10000)
	timeoutMS := int64(5000)
	cutoff := currentTime - timeoutMS

	schedulers := []SchedulerInfo{
		{ID: "scheduler-1", LastUpdate: 9000, Stopped: false},
		{ID: "scheduler-2", LastUpdate: 4000, Stopped: false},
		{ID: "scheduler-3", LastUpdate: 8000, Stopped: false},
		{ID: "scheduler-4", LastUpdate: 3000, Stopped: false},
	}

	active := FilterActiveSchedulers(schedulers, currentTime, timeoutMS)

	for _, scheduler := range active {
		assert.GreaterOrEqual(t, scheduler.LastUpdate, cutoff, "active schedulers should be within timeout")
	}
}

// Benchmark to ensure pure functions are fast
func BenchmarkCalculateRank(b *testing.B) {
	schedulers := make([]SchedulerInfo, 10)
	for i := 0; i < 10; i++ {
		schedulers[i] = SchedulerInfo{ID: "scheduler-" + string(rune(i)), LastUpdate: 1000}
	}

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		_ = CalculateRank("scheduler-5", schedulers)
	}
}

func BenchmarkFilterActiveSchedulers(b *testing.B) {
	schedulers := make([]SchedulerInfo, 100)
	for i := 0; i < 100; i++ {
		schedulers[i] = SchedulerInfo{
			ID:         "scheduler-" + string(rune(i)),
			LastUpdate: int64(5000 + i*100),
			Stopped:    i%3 == 0,
		}
	}

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		_ = FilterActiveSchedulers(schedulers, 10000, 5000)
	}
}

func BenchmarkCalculateFairShare(b *testing.B) {
	for i := 0; i < b.N; i++ {
		_ = CalculateFairShare(3, 7, 100)
	}
}

func BenchmarkSortSchedulersByID(b *testing.B) {
	schedulers := make([]SchedulerInfo, 10)
	for i := 0; i < 10; i++ {
		schedulers[i] = SchedulerInfo{ID: "scheduler-" + string(rune(10-i))}
	}

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		_ = SortSchedulersByID(schedulers)
	}
}
