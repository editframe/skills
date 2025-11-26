import { type LinkProps, type Path, useSearchParams } from "react-router";
import { Link } from "./Link";

export const LinkWithSearch = ({
  children,
  ...props
}: LinkProps & { to: string | number }) => {
  if (typeof props.to === "number") {
    return <Link {...props} to={props.to} />;
  }

  const [searchParams] = useSearchParams();

  const mergedParams = new URLSearchParams();

  Array.from(new Set(searchParams.entries())).forEach(([key, value]) => {
    if (mergedParams.has(key)) {
      return;
    }
    mergedParams.append(key, value);
  });

  const linkDescriptor: Partial<Path> = {
    pathname: props.to,
    search: mergedParams.toString(),
  };

  return (
    <Link {...props} to={linkDescriptor}>
      {children}
    </Link>
  );
};
