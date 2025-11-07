import { Fragment } from "react";
import { RenderStatus } from "~/components/RenderStatus";
import type { ContentBlock } from ".";
import { WebhookTopicBadge } from "~/components/Webhooks";
import { Bell } from "@phosphor-icons/react";
import { FormatStatusCode } from "~/ui/formatStatusCode";
import { ColumnHead, TableCell, TableHead, TableRow } from "~/components/Table";
import { TimeAgoInWords } from "~/ui/timeAgoInWords";

export const Status: ContentBlock<{
  failed_at: string | null;
  delivered_at: string | null;
}> = ({ record: { failed_at, delivered_at } }) => {
  return (
    <RenderStatus status={getDeliveryStatus({ failed_at, delivered_at })} />
  );
};

export const Topic: ContentBlock<{ topic: string }> = ({
  record: { topic },
}) => <WebhookTopicBadge topic={topic} />;

export const DeliveriesCount: ContentBlock<{
  deliveries_aggregate?: { aggregate: { count: number } };
}> = ({ record: { deliveries_aggregate } }) => {
  return <>{deliveries_aggregate?.aggregate?.count ?? 0} deliveries</>;
};
type WebhookStatus = "failed" | "delivered" | "pending";

export const Payload: ContentBlock<{ json_payload: string }> = ({
  record: { json_payload },
}) => {
  return <code>{JSON.stringify(JSON.parse(json_payload), null, 2)}</code>;
};

export const getDeliveryStatus = (event: {
  failed_at: any | null;
  delivered_at: any | null;
}): WebhookStatus => {
  return event.failed_at
    ? "failed"
    : event.delivered_at
      ? "delivered"
      : "pending";
};

interface HeadersTableProps {
  headers: string;
  type: "request" | "response";
}
function HeadersTable({ headers, type }: HeadersTableProps) {
  const jsonHeaders = JSON.parse(headers);
  return (
    <table className="w-full table-fixed border-collapse">
      <TableHead>
        <ColumnHead className="w-1/3">
          {type === "request" ? "Request Header" : "Response Header"}
        </ColumnHead>
        <ColumnHead className="w-2/3">Value</ColumnHead>
      </TableHead>
      <tbody>
        {Object.entries(jsonHeaders).map(([key, value]) => (
          <TableRow key={key}>
            <TableCell className="border-r px-2 py-1 align-baseline w-1/3 overflow-scroll">
              {key}
            </TableCell>
            <TableCell className="px-2 py-1 align-baseline w-2/3 overflow-scroll">
              {String(value)}
            </TableCell>
          </TableRow>
        ))}
      </tbody>
    </table>
  );
}

export const DeliveriesTable: ContentBlock<{
  deliveries: {
    id: string;
    created_at: string;
    request_headers: string;
    response_headers: string;
    response_status: number;
    response_text: string;
  }[];
}> = ({ record: { deliveries } }) => {
  return (
    <table className="w-full border-collapse">
      <TableHead>
        <ColumnHead>Status</ColumnHead>
        <ColumnHead>Created At</ColumnHead>
        <ColumnHead>Response</ColumnHead>
      </TableHead>
      <tbody>
        {deliveries.length === 0 && (
          <TableRow noHighlight>
            <TableCell colSpan={3}>
              <div className="flex items-baseline justify-center gap-2 py-4">
                <Bell className="h-8 w-8 text-orange-500" />
                <div className="flex flex-col gap-2">
                  <p className="text-orange-500 text-4xl">
                    No deliveries yet...
                  </p>
                  <p className="text-slate-800 text-lg">
                    This webhook has not been delivered yet.
                  </p>
                  <p className="text-slate-800 text-md max-w-md">
                    If it's been more than a minute or two since the webhook
                    event was created, it's possible there is an issue with the
                    platform.
                  </p>
                </div>
              </div>
            </TableCell>
          </TableRow>
        )}
        {deliveries.map((delivery) => {
          return (
            <Fragment key={delivery.id}>
              <TableRow>
                <TableCell>
                  <code>
                    <FormatStatusCode statusCode={delivery.response_status} />
                  </code>
                </TableCell>
                <TableCell>
                  <TimeAgoInWords date={new Date(delivery.created_at)} />
                </TableCell>
                <TableCell className="max-w-48 max-h-12 overflow-scroll">
                  <code>{delivery.response_text}</code>
                </TableCell>
              </TableRow>
              <TableRow noHighlight>
                <TableCell colSpan={3}>
                  <HeadersTable
                    headers={delivery.request_headers}
                    type="request"
                  />
                </TableCell>
              </TableRow>
              <TableRow noHighlight>
                <TableCell colSpan={3}>
                  <HeadersTable
                    headers={delivery.response_headers}
                    type="response"
                  />
                </TableCell>
              </TableRow>
            </Fragment>
          );
        })}
      </tbody>
    </table>
  );
};
