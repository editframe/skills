import { colorHash } from "@/util/colorHash";

export const WebhookTopicBadge = ({ topic }: { topic: string }) => {
  return (
    <span
      className="flex w-max gap-2 space-x-1 items-center rounded-md px-2 py-1 text-xs font-medium"
      style={{ backgroundColor: colorHash(topic) }}
    >
      {topic}
    </span>
  );
};
