import type { Route } from "./+types/home";
import { TraceViewer } from "../components/TraceViewer";

export function meta({ }: Route.MetaArgs) {
  return [{ title: "OTEL Relay - Performance Panel" }];
}

export default function Home() {
  return <TraceViewer />;
}