import { formatBytes } from "~/ui/formatBytes";

export const ByteSizeDisplay = ({ bytes }: { bytes: number }) => {
  return <code>{formatBytes(bytes)}</code>;
};
