import { makeDataStore } from "./makeDataStore";
import { Queue } from "./Queue";
import { Workflow } from "./Workflow";

export const makeQueues = async () => {
  const storage = await makeDataStore();

  const TestQueue = new Queue({
    name: "test",
    storage,
  });

  const TestQueue2 = new Queue({
    name: "test2",
    storage,
  });

  const TestWorkflow = new Workflow({
    name: "test-workflow",
    storage,
  });

  const TestWorkflow2 = new Workflow({
    name: "test-workflow2",
    storage,
    finalizerQueue: TestQueue2,
  });

  return {
    storage,
    TestQueue,
    TestQueue2,
    TestWorkflow,
    TestWorkflow2,
  };
};
