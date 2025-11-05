import { TaskStatus } from "@lit/task";

export const printTaskStatus = (status: TaskStatus) => {
  switch (status) {
    case TaskStatus.INITIAL:
      return "INITIAL";
    case TaskStatus.ERROR:
      return "ERROR";
    case TaskStatus.PENDING:
      return "PENDING";
    case TaskStatus.COMPLETE:
      return "COMPLETE";
    default:
      return "UNKNOWN";
  }
};
