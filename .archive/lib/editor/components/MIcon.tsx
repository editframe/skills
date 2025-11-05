import { type ReactNode, type PropsWithChildren } from "react";

export const MIcon = (props: PropsWithChildren): ReactNode => (
  <span
    className="material-symbols-outlined"
    style={{ fontSize: "100%", margin: 2 }}
  >
    {props.children}
  </span>
);
