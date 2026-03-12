interface HasuraEvent<T> {
  created_at: string;
  id: string;
  table: {
    name: string;
    schema: string;
  };
  trigger: {
    name: string;
  };
  delivery_info: {
    current_retry: number;
    max_retries: number;
  };
  event: {
    data: {
      new: T;
      old?: T;
    };
    op: "INSERT" | "UPDATE" | "DELETE";
  };
}
