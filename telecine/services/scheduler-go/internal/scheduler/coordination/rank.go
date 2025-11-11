package coordination

// CalculateRank determines the rank of a specific scheduler among all active schedulers.
// Pure function: deterministic, no side effects.
// Returns rank (-1 if not found), total count, and whether the scheduler was found.
func CalculateRank(schedulerID string, allSchedulers []SchedulerInfo) RankResult {
	if len(allSchedulers) == 0 {
		return RankResult{
			Rank:  -1,
			Total: 0,
			Found: false,
		}
	}

	rank := -1
	for i, scheduler := range allSchedulers {
		if scheduler.ID == schedulerID {
			rank = i
			break
		}
	}

	return RankResult{
		Rank:  rank,
		Total: len(allSchedulers),
		Found: rank != -1,
	}
}

// FilterActiveSchedulers filters schedulers based on timeout threshold.
// Pure function: deterministic, no side effects.
// Returns only schedulers that have updated within the timeout period.
func FilterActiveSchedulers(allSchedulers []SchedulerInfo, currentTime int64, timeoutMS int64) []SchedulerInfo {
	cutoff := currentTime - timeoutMS
	active := make([]SchedulerInfo, 0, len(allSchedulers))

	for _, scheduler := range allSchedulers {
		if scheduler.LastUpdate >= cutoff && !scheduler.Stopped {
			active = append(active, scheduler)
		}
	}

	return active
}

// DetermineSchedulerHealth checks if a scheduler is healthy based on its last update.
// Pure function: deterministic, no side effects.
func DetermineSchedulerHealth(lastUpdate int64, currentTime int64, timeoutMS int64) bool {
	return currentTime-lastUpdate <= timeoutMS
}

// CalculateFairShare determines the fair share of work for a scheduler at a given rank.
// Pure function: deterministic, no side effects.
// This is the same logic as in scaling.CalculateFairShare but duplicated here for
// the coordination domain (we could consolidate later if needed).
func CalculateFairShare(rank, totalSchedulers, totalQuantity int) int {
	if totalSchedulers == 0 || totalQuantity == 0 {
		return 0
	}

	baseShare := totalQuantity / totalSchedulers
	remainder := totalQuantity % totalSchedulers

	if rank < remainder {
		return baseShare + 1
	}
	return baseShare
}

// SortSchedulersByID sorts schedulers by ID for deterministic ordering.
// Pure function: deterministic, no side effects.
// Returns a new slice without modifying the input.
func SortSchedulersByID(schedulers []SchedulerInfo) []SchedulerInfo {
	sorted := make([]SchedulerInfo, len(schedulers))
	copy(sorted, schedulers)

	// Simple insertion sort (fine for small lists of schedulers)
	for i := 1; i < len(sorted); i++ {
		key := sorted[i]
		j := i - 1
		for j >= 0 && sorted[j].ID > key.ID {
			sorted[j+1] = sorted[j]
			j--
		}
		sorted[j+1] = key
	}

	return sorted
}
