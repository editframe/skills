export function Prose<T extends React.ElementType = "div">({
  as,
  className,
  ...props
}: React.ComponentPropsWithoutRef<T> & {
  as?: T;
}) {
  const Component = as ?? "div";

  return <Component {...props} />;
}
