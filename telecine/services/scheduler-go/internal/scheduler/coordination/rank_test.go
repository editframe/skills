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

func BenchmarkCalculateFairShare(b *testing.B) {
	for i := 0; i < b.N; i++ {
		_ = CalculateFairShare(3, 7, 100)
	}
}
