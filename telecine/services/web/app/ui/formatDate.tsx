export function formatDate(dateString: string | Date, withTime = false) {
  const date = new Date(dateString);
  if (withTime) {
    return date.toLocaleString("en-US", {
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "numeric",
      minute: "numeric",
      second: "numeric",
      hour12: false,
      timeZoneName: "short",
    });
  }
  return date.toLocaleDateString("en-US", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}
