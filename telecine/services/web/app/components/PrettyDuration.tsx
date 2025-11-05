export const PrettyDuration = ({ durationMs }: { durationMs: number }) => {
  const totalSeconds = Math.round(durationMs / 1000);

  // Less than 60 seconds: just show seconds
  if (totalSeconds < 60) {
    return <span>{totalSeconds}s</span>;
  }

  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  // Between 1 minute and 1 hour
  if (minutes < 60) {
    return (
      <span>
        {minutes}m {seconds}s
      </span>
    );
  }

  // Over 1 hour
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return (
    <span>
      {hours}hr {remainingMinutes}m
    </span>
  );
};
