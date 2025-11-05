import { Roles_Enum } from "~/roles";

export const formatRole = (role: string) => {
  if (role === Roles_Enum.Editor) {
    return (
      <span className="inline-flex items-center rounded-md bg-waikawa-gray-100 px-2 py-1 text-xs font-medium text-waikawa-gray-700">
        Editor
      </span>
    );
  }
  if (role === Roles_Enum.Admin) {
    return (
      <span className="inline-flex items-center rounded-md bg-mantis-100 px-2 py-1 text-xs font-medium text-mantis-700">
        Admin
      </span>
    );
  }
  if (role === "owner") {
    return (
      <span className="inline-flex items-center rounded-md bg-wewak-100 px-2 py-1 text-xs font-medium text-wewak-700">
        Owner
      </span>
    );
  }
  if (role === Roles_Enum.Reader) {
    return (
      <span className="inline-flex items-center rounded-md bg-purple-100 px-2 py-1 text-xs font-medium text-purple-700">
        Reader
      </span>
    );
  }
};
