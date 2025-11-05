import { XCircleIcon } from "@heroicons/react/24/outline";

export const ErrorMessage = ({
  message,
  note,
}: { message: string; note?: string }) => {
  return (
    <div className="bg-white my-6 rounded-lg w-full overflow-hidden pointer-events-auto">
      <div className="py-4">
        <div className="flex justify-center items-center">
          <div className="flex-shrink-0">
            <XCircleIcon className="w-6 h-6 text-red-400 fill-red-100" aria-hidden="true" />
          </div>
          <div className="flex-1 ml-3 pt-0.5 w-0">
            <h3 className="font-medium text-gray-900 text-sm">{message}</h3>
            <p className="mt-1 text-gray-500 text-sm">{note}</p>
          </div>
          <div className="flex flex-shrink-0 ml-4" />
        </div>
      </div>
    </div>
  );
};
