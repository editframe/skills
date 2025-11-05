export const PrettyTime = ({ dateTime }: { dateTime: string }) => {
  const date = new Date(dateTime);
  return (
    <time dateTime={dateTime}>
      {date.toLocaleDateString(undefined, { dateStyle: "medium" })}{" "}
      {date.toLocaleTimeString(undefined, { timeStyle: "short" })}
    </time>
  );
};
