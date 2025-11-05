import { XMarkIcon } from "@heroicons/react/20/solid";
import { useState } from "react";

export default function Banner() {
  const [open, setOpen] = useState(
    typeof window !== "undefined"
      ? window.localStorage.getItem("feedbackBanner") !== "dismissed"
      : false,
  );
  const handleClose = () => {
    setOpen(false);
    if (typeof window !== "undefined") {
      window.localStorage.setItem("feedbackBanner", "dismissed");
    }
  };

  if (!open) return null;
  return (
    <div className="flex items-center gap-x-6 bg-editframe-900 px-6 py-2.5 sm:px-3.5 sm:before:flex-1">
      <p className="text-sm leading-6 text-white">
        <a href="mailto:team@editframe.com">
          <strong className="font-semibold">Your feedback matters!</strong>
          <svg
            viewBox="0 0 2 2"
            className="mx-2 inline h-0.5 w-0.5 fill-current"
            aria-hidden="true"
          >
            <circle cx={1} cy={1} r={1} />
          </svg>
          Connect with our engineers to share your experience&nbsp;
          <svg
            viewBox="0 0 2 2"
            className="mx-2 inline h-0.5 w-0.5 fill-current"
            aria-hidden="true"
          >
            <circle cx={1} cy={1} r={1} />
          </svg>
          <span className="font-semibold">
            Let's chat&nbsp;<span aria-hidden="true">&rarr;</span>
          </span>
        </a>
      </p>
      <div className="flex flex-1 justify-end">
        <button
          type="button"
          className="-m-3 p-3 focus-visible:outline-offset-[-4px]"
          onClick={handleClose}
        >
          <span className="sr-only">Dismiss</span>
          <XMarkIcon className="h-5 w-5 text-white" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
