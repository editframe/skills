import { valkey } from "@/valkey/valkey";
import { Workflow } from "../../Workflow";
import { TestFastFinalizerQueue } from "./Finalizer";

export interface TestFastWorkflowData {
  testId: string;
  jobCount: number;
}

export const TestFastWorkflow = new Workflow<TestFastWorkflowData>({
  name: "test-fast-workflow",
  storage: valkey,
  finalizerQueue: TestFastFinalizerQueue,
});
