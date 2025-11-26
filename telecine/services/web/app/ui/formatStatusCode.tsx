export const FormatStatusCode: React.FC<{ statusCode: number }> = ({
  statusCode,
}) => {
  if (statusCode >= 200 && statusCode < 300) {
    return (
      <span className="inline-flex items-center rounded-md bg-green-100 px-2 py-1 text-xs font-medium text-green-700">
        {statusCode}
      </span>
    );
  }

  if (statusCode >= 300 && statusCode < 400) {
    return (
      <span className="inline-flex items-center rounded-md bg-yellow-100 px-2 py-1 text-xs font-medium text-yellow-600">
        {statusCode}
      </span>
    );
  }

  if (statusCode >= 400 && statusCode < 500) {
    return (
      <span className="inline-flex items-center rounded-md bg-red-100 px-2 py-1 text-xs font-medium text-red-600">
        {statusCode}
      </span>
    );
  }

  if (statusCode >= 500) {
    return (
      <span className="inline-flex items-center rounded-md bg-yellow-100 px-2 py-1 text-xs font-medium text-yellow-700">
        {statusCode}
      </span>
    );
  }

  return (
    <span className="inline-flex items-center rounded-md bg-waikawa-gray-100 px-2 py-1 text-xs font-medium text-waikawa-gray-700">
      ⦰
    </span>
  );
};
