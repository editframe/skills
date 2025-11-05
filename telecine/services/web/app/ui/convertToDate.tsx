export const convertToDate = (time: string | null): string | null => {
  if (time === "1 day") {
    return new Date(new Date().setDate(new Date().getDate() + 1)).toISOString();
  }
  if (time === "1 week") {
    return new Date(new Date().setDate(new Date().getDate() + 7)).toISOString();
  }
  if (time === "1 month") {
    return new Date(
      new Date().setMonth(new Date().getMonth() + 1),
    ).toISOString();
  }
  if (time === "1 year") {
    return new Date(
      new Date().setFullYear(new Date().getFullYear() + 1),
    ).toISOString();
  }
  return null;
};

export const convertBackToDate = (
  expired_at: string | Date,
  updated_at: string,
): string | null => {
  const expiredDate = new Date(expired_at);
  const updatedDate = new Date(updated_at);
  const differenceInTime = expiredDate.getTime() - updatedDate.getTime();
  const differenceInDays = Math.round(differenceInTime / (1000 * 3600 * 24));
  if (differenceInDays <= 1) {
    return "1 day";
  }
  if (differenceInDays > 1 && differenceInDays <= 7) {
    return "1 week";
  }
  if (differenceInDays > 7 && differenceInDays <= 31) {
    return "1 month";
  }
  if (differenceInDays > 30 && differenceInDays <= 365) {
    return "1 year";
  }
  return null;
};
