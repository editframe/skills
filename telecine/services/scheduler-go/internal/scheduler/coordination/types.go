package coordination

// SchedulerInfo represents immutable scheduler information
type SchedulerInfo struct {
	ID         string
	CreatedAt  int64
	Stopped    bool
	LastUpdate int64
}

// RankResult represents the result of rank calculation
type RankResult struct {
	Rank  int
	Total int
	Found bool
}
