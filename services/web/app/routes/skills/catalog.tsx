import { redirect } from "react-router";

export const loader = async () => {
  return redirect("/skills/editframe-create/getting-started", { status: 302 });
};
