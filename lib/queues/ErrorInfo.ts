export interface ErrorInfo {
  message: string;
  stack?: string;
  name?: string;
}
export const errorToErrorInfo = (error: unknown) => {
  if (error instanceof Error) {
    return {
      message: error.message,
      stack: error.stack,
      name: error.name,
    };
  }
  return {
    message: String(error),
    stack: "stacktrace not available",
    name: "error has no name",
  };
};
