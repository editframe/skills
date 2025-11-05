import {
  NavLink as RemixNavLink,
  Link as RemixLink,
  useSearchParams,
  type NavLinkProps,
  type LinkProps,
} from "react-router";

// Helper function to add org parameter to the 'to' prop
const addOrgParam = (to: string | Partial<Location>, orgId: string | null) => {
  // Skip adding org param if it already exists in the URL
  if (!orgId || (typeof to === "object" && to.search?.includes("org=")))
    return to;
  if (typeof to === "string" && to.includes("org=")) return to;

  const newTo = typeof to === "string" ? to : { ...to };

  if (typeof newTo === "string") {
    const separator = newTo.includes("?") ? "&" : "?";
    return `${newTo}${separator}org=${orgId}`;
  }

  const separator = newTo.search ? "&" : "?";
  newTo.search = newTo.search
    ? `${newTo.search}${separator}org=${orgId}`
    : `?org=${orgId}`;

  return newTo;
};

export const NavLink = ({ to, ...props }: NavLinkProps) => {
  const [searchParams] = useSearchParams();
  const orgId = searchParams.get("org");

  const newTo = addOrgParam(to, orgId);

  // props.state ??= {};
  // props.state.fullNavigation = false;

  return <RemixNavLink to={newTo} {...props} />;
};

export const Link = ({ to, ...props }: LinkProps) => {
  const [searchParams] = useSearchParams();
  const orgId = searchParams.get("org");

  const newTo = addOrgParam(to, orgId);

  // props.state ??= {};
  // props.state.fullNavigation = false;

  return <RemixLink to={newTo} {...props} />;
};
