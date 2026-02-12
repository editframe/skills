import { formatBytes } from "~/ui/formatBytes";

export const ByteSizeDisplay = ({ bytes }: { bytes: number | null | undefined }) => {
  return <code>{formatBytes(bytes)}</code>;
};
