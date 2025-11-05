```mermaid
graph TD
  2["@editframe/cli"] -- depends on --> 1["@editframe/assets"]
  2["@editframe/cli"] -- depends on --> 3["@editframe/elements"]
  2["@editframe/cli"] -- depends on --> 4["@editframe/vite-plugin"]
  3["@editframe/elements"] -- depends on --> 1["@editframe/assets"]
  4["@editframe/vite-plugin"] -- depends on --> 1["@editframe/assets"]
```
