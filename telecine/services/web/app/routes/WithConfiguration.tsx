import { Outlet } from "react-router";
import { ClientConfiguration } from "~/components/ClientConfiguration";

const WEB_HOST = import.meta.env.VITE_WEB_HOST || "http://localhost:3000";

export default function WithConfiguration() {
  return (
    <ClientConfiguration
      apiHost={WEB_HOST}
      signingUrl={`${WEB_HOST}/ef-sign-url`}
    >
      <Outlet />
    </ClientConfiguration>
  );
}
