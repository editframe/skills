import { useState, useEffect } from "react";
import { useRevalidator } from "react-router";

const useAutoRefresh = (intervalMs = 1000) => {
  const [refresh, setRefresh] = useState(false);
  const [percentage, setPercentage] = useState(100);
  const [enabled, setEnabled] = useState(true);
  const revalidator = useRevalidator();

  useEffect(() => {
    if (!enabled) {
      return;
    }

    let lastRefresh = Date.now();

    // Update percentage more frequently than the actual refresh
    const percentageInterval = setInterval(() => {
      const elapsed = Date.now() - lastRefresh;
      const newPercentage =
        100 - Math.min(100, Math.floor((elapsed / intervalMs) * 100));
      setPercentage(newPercentage);
    }, 50);

    // Handle the actual data refresh
    const refreshInterval = setInterval(() => {
      lastRefresh = Date.now();
      setRefresh((prev) => !prev);
      setPercentage(100);
      revalidator.revalidate();
    }, intervalMs);

    return () => {
      clearInterval(percentageInterval);
      clearInterval(refreshInterval);
    };
  }, [revalidator, intervalMs, enabled]);

  return { refresh, percentage, enabled, setEnabled };
};

export const AutoRefresh = () => {
  const { percentage, enabled, setEnabled } = useAutoRefresh(2500);

  return (
    <div className="flex items-center gap-3 text-xs text-gray-600 p-1">
      {enabled && (
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-gray-200 rounded-full overflow-hidden flex items-center justify-center">
            <div
              className="w-4 h-4 bg-blue-500 rounded-full transition-transform duration-50 ease-linear"
              style={{ transform: `scale(${percentage / 100})` }}
            />
          </div>
        </div>
      )}
      <div className="flex items-center gap-1.5">
        <input
          type="checkbox"
          id="auto-refresh"
          checked={enabled}
          onChange={(e) => setEnabled(e.target.checked)}
          className="h-3.5 w-3.5"
        />
        <label htmlFor="auto-refresh" className="font-medium">
          Auto-refresh
        </label>
      </div>
    </div>
  );
};
