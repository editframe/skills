import { ShowDocItemByName } from "~/components/docs/typedoc";

import type { Route } from "./+types/SymbolReference";

export const loader = async ({ params }: Route.LoaderArgs) => {
  const { getDocItem } = await import("~/components/docs/typedoc");
  const symbol = await getDocItem(params.symbol);
  if (!symbol) {
    throw new Response("Not found", { status: 404 });
  }
  return { symbol };
};

export default function ReferencePage({ params }: Route.ComponentProps) {
  return (
    <div>
      @editframe/{params.package}: {params.symbol}
      <ShowDocItemByName name={params.symbol} />
    </div>
  );
}
