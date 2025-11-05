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
