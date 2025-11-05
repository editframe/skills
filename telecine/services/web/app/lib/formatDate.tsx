export const getHours = (date: Date, withTimeZone = false) => {
  const hours = new Date(date).getHours();
  if(!withTimeZone) {
    return `${hours}:00`;
  }
  const offset = -date.getTimezoneOffset();
  const offsetHours = Math.floor(Math.abs(offset) / 60).toString().padStart(2, '0');
  const offsetMinutes = (Math.abs(offset) % 60).toString().padStart(2, '0');
  const offsetSign = offset >= 0 ? '+' : '-';
  
  return `${hours}:00 GMT${offsetSign}${offsetHours}:${offsetMinutes}`;
};
export const getDay = (date: Date) => {
  return new Date(date).getDate();
};

export const getDateFormat = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};
