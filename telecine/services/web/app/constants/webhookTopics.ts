export const webhookTopics: {
  topic: string;
  description: string;
}[] = [
    {
      topic: "render.created",
      description: "Receive a webhook when a render is created",
    },
    {
      topic: "render.failed",
      description: "Receive a webhook when a render is updated",
    },
    {
      topic: "render.completed",
      description: "Receive a webhook when a render is completed  ",
    },
    {
      topic: "render.pending",
      description: "Receive a webhook when a render is pending",
    },
    {
      topic: "render.rendering",
      description: "Receive a webhook when a render is processing",
    },
    {
      topic: "unprocessed_file.created",
      description: "Receive a webhook when an file is created",
    },
    {
      topic: "unprocessed_file.processed",
      description: "Receive a webhook when an file has been processed",
    }
  ];
