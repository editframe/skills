import { TimeAgoInWords } from "~/ui/timeAgoInWords";
import type { ContentBlock } from ".";

export const Name: ContentBlock<{ name: string }> = ({ record: { name } }) => (
  <>{name}</>
);

export const WebhookURL: ContentBlock<{ webhook_url: string | null }> = ({
  record: { webhook_url },
}) => <>{webhook_url ?? "—"}</>;

export const ExpiresIn: ContentBlock<{ expired_at: string | null }> = ({
  record: { expired_at },
}) => {
  if (!expired_at) {
    return <>Never expires</>;
  }

  const expirationDate = new Date(expired_at);
  const isExpired = expirationDate < new Date();

  if (isExpired) {
    return <>Expired</>;
  }

  return (
    <>
      Expires in <TimeAgoInWords date={expired_at} />
    </>
  );
};
