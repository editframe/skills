export type DateRange =
  | "all_time"
  | "today"
  | "yesterday"
  | "last_7_days"
  | "last_month"
  | "this_month"
  | "this_year";

export const getDateRange = (range: DateRange) => {
  const today = new Date();
  today.setHours(23, 59, 59, 999);
  let startDate = new Date(today);
  let endDate = new Date(today);

  switch (range) {
    case "today":
      startDate.setHours(0, 0, 0, 0);
      break;
    case "yesterday":
      startDate.setDate(today.getDate() - 1);
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(startDate);
      endDate.setHours(23, 59, 59, 999);
      break;
    case "last_7_days":
      startDate.setDate(today.getDate() - 6);
      startDate.setHours(0, 0, 0, 0);
      break;
    case "last_month":
      startDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      endDate = new Date(today.getFullYear(), today.getMonth() - 1, 31);
      endDate.setHours(23, 59, 59, 999);
      break;
    case "this_month":
      startDate = new Date(today.getFullYear(), today.getMonth(), 1);
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(today.getFullYear(), today.getMonth(), 31);
      endDate.setHours(23, 59, 59, 999);
      break;
    case "this_year":
      startDate = new Date(today.getFullYear(), 0, 1);
      startDate.setHours(0, 0, 0, 0);

      endDate = new Date(today.getFullYear(), 11, 31);
      endDate.setHours(23, 59, 59, 999);
      break;
    default:
      startDate = new Date(0);
  }

  return { startDate, endDate };
};

export const getPreviousDateRange = (range: DateRange): {
  startDate: Date;
  endDate: Date;
} => {
  const today = new Date();
  today.setHours(23, 59, 59, 999);
  let startDate = new Date(today);
  let endDate = new Date(today);
  switch (range) {
    case "today":
      startDate.setDate(today.getDate() - 1);
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(startDate);
      endDate.setHours(23, 59, 59, 999);
      break;
    case "yesterday":
      startDate.setDate(today.getDate() - 2);
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(startDate);
      endDate.setHours(23, 59, 59, 999);
      break;
    case "last_7_days":
      startDate.setDate(today.getDate() - 13);
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(today);
      endDate.setDate(today.getDate() - 7);
      endDate.setHours(23, 59, 59, 999);
      break;
    case "last_month":
      startDate = new Date(today.getFullYear(), today.getMonth() - 2, 1);
      endDate = new Date(today.getFullYear(), today.getMonth() - 2, 31);
      endDate.setHours(23, 59, 59, 999);
      break;
    case "this_month":
      startDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(today.getFullYear(), today.getMonth() - 1, 31);
      endDate.setHours(23, 59, 59, 999);
      break;
    case "this_year":
      startDate = new Date(today.getFullYear() - 1, 0, 1);
      startDate.setHours(0, 0, 0, 0);

      endDate = new Date(today.getFullYear() - 1, 11, 31);
      endDate.setHours(23, 59, 59, 999);
      break;
    default:
      startDate = new Date(0);

      break;
  }
  return { startDate, endDate };
};

export const getDateRangeString = (range: DateRange) => {
  switch (range) {
    case "today":
      return "Today";
    case "yesterday":
      return "Yesterday";
    case "last_7_days":
      return "Last 7 days";
    case "last_month":
      return "Last month";
    case "this_year":
      return "This year";
    default:
      return "All time";
  }
};
