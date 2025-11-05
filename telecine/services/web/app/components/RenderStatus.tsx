import clsx from "clsx";

const Disk = () => {
  return (
    <svg
      viewBox="-8 -8 16 16"
      className="inline-block h-[.8rem] w-[.8rem] relative top-[2px]"
    >
      <circle cx="0" cy="0" r="8" />
    </svg>
  );
};

export type RenderStatusProps = {
  status:
    | "created"
    | "queued"
    | "pending"
    | "rendering"
    | "complete"
    | "failed"
    | string;
};
export type EnumRenderStatus =
  | "created"
  | "queued"
  | "pending"
  | "rendering"
  | "complete"
  | "failed";

export const RenderStatus = ({ status }: RenderStatusProps) => {
  const color = {
    created: "neutral",
    queued: "waikawa-gray",
    pending: "waikawa-gray",
    rendering: "purple",
    failed: "wewak",
    complete: "mantis",
  }[status];

  const text = {
    created: "Created",
    queued: "Queued",
    pending: "Pending",
    rendering: "Rendering",
    failed: "Failed",
    complete: "Completed",
  }[status];

  const fill = `fill-${color}-400`;
  const bg = `bg-${color}-100`;
  const textColor = `text-${color}-700`;

  return (
    <span
      className={clsx(
        "inline-flex gap-2 space-x-1 items-center rounded-md px-2 py-1 text-xs font-medium",
        fill,
        bg,
        textColor,
      )}
    >
      <Disk /> {text}
    </span>
  );
};
