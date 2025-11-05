// generates a hexcode color hash from a string
export const colorHash = (value: string): string => {
  let acc = 0;
  for (let i = 0; i < value.length; i++) {
    acc += (value.charCodeAt(i) + ((acc << 5) - acc)) | 0;
  }
  return `hsl(${acc % 360}, 50%, 75%)`;
};
