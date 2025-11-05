const durationInWords = (milliseconds: number) => {
  const seconds = Math.floor(milliseconds / 1000);
  const intervals = [
    { label: "year", seconds: 31536000 },
    { label: "month", seconds: 2592000 },
    { label: "day", seconds: 86400 },
    { label: "hour", seconds: 3600 },
    { label: "minute", seconds: 60 },
    { label: "second", seconds: 1 },
  ];

  for (const interval of intervals) {
    const count = Math.floor(seconds / interval.seconds);
    if (count > 0) {
      return `${count} ${interval.label}${count !== 1 ? "s" : ""}`;
    }
  }
  return "just now";
};

export const timeAgoInWords = (input: Date | string) => {
  const date = typeof input === "string" ? new Date(input) : input;
  const duration = Date.now() - date.getTime();
  const isFuture = duration < 0;
  return `${durationInWords(Math.abs(duration))} ${isFuture ? "from now" : "ago"}`;
};

export const TimeAgoInWords = ({ date }: { date: Date | string }) => {
  const parsedDate = typeof date === "string" ? new Date(date) : date;
  if (parsedDate === undefined) {
    return <span>N/A</span>;
  }
  // title={parsedDate.toLocaleString()}
  // Need to figure out how to get the date localization to work with server rendering
  return (
    <time dateTime={parsedDate.toISOString()}>
      {timeAgoInWords(parsedDate)}
    </time>
  );
};

interface ProcessDurationProps {
  startedAt: string;
  completedAt: string | null;
  failedAt?: string | null;
}

export const ProcessDuration = ({
  startedAt,
  completedAt,
  failedAt,
}: ProcessDurationProps) => {
  const start = new Date(startedAt).getTime();
  const end = completedAt
    ? new Date(completedAt).getTime()
    : failedAt
      ? new Date(failedAt).getTime()
      : Date.now();

  const duration = end - start;
  const formattedDuration = durationInWords(duration);

  if (completedAt) {
    return <span>{formattedDuration} (Completed)</span>;
  }
  if (failedAt) {
    return <span>{formattedDuration} (Failed)</span>;
  }
  return <span>{formattedDuration} (Ongoing)</span>;
};
