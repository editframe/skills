import { useState, useEffect } from "react";
import { useRevalidator } from "react-router";
import clsx from "clsx";

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
    <div
      className={clsx(
        "flex items-center gap-3 text-xs p-1 transition-colors",
        "text-slate-600 dark:text-slate-400",
      )}
    >
      {enabled && (
        <div className="flex items-center gap-2">
          <div
            className={clsx(
              "w-4 h-4 rounded-full overflow-hidden flex items-center justify-center transition-colors",
              "bg-slate-200 dark:bg-slate-700",
            )}
          >
            <div
              className={clsx(
                "w-4 h-4 rounded-full transition-all duration-50 ease-linear",
                "bg-blue-500 dark:bg-blue-400",
              )}
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
          className={clsx(
            "h-3.5 w-3.5 transition-colors",
            "accent-blue-500 dark:accent-blue-400",
          )}
        />
        <label
          htmlFor="auto-refresh"
          className={clsx(
            "font-medium transition-colors",
            "text-slate-700 dark:text-slate-300",
          )}
        >
          Auto-refresh
        </label>
      </div>
    </div>
  );
};
