import { useNavigate, useSearchParams } from "react-router";
import type { NavigateOptions } from "react-router";

export const useNavigateWithSearch = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  return (to: string | number, options?: NavigateOptions) => {
    if (typeof to === "number") {
      navigate(to);
      return;
    }
    options ??= {};
    options.state ??= {};
    options.state.fullNavigation ??= false;
    navigate(`${to}?${searchParams.toString()}`, options);
  };
};
