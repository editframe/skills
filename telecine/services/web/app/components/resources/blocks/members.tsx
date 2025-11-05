import { Menu, MenuButton, MenuItems, MenuItem } from "@headlessui/react";
import { useFetcher } from "react-router";
import type { ContentBlock } from ".";
import { ChevronDownIcon } from "@heroicons/react/20/solid";

export const Email: ContentBlock<{
  user: { email_passwords: { email_address: string }[] };
}> = ({ record: { user } }) => (
  <>{user.email_passwords[0]?.email_address ?? "—"}</>
);

const ROLES = ["admin", "editor", "reader"] as const;

export const Role: ContentBlock<{
  role: string;
  org: { primary_user_id: string };
  id: string;
  user: { id: string };
}> = ({ record: { role, user, org, id } }) => {
  const fetcher = useFetcher();
  const isLoading = fetcher.state !== "idle";
  const isPrimaryUser = user.id === org.primary_user_id;

  if (isPrimaryUser) {
    return (
      <span className="bg-orange-100 px-1.5 py-0.5 rounded-md font-normal text-gray-600">
        Primary User
      </span>
    );
  }

  return (
    <Menu as="div" className="inline-block relative text-left">
      <MenuButton
        disabled={isLoading || isPrimaryUser}
        onClick={(e) => e.stopPropagation()}
        className="inline-flex items-center gap-0.5 hover:bg-gray-50 rounded text-xs capitalize"
      >
        {role.replace("org-", "")}
        {!isPrimaryUser && <ChevronDownIcon className="ml-0.5 w-3 h-3" />}
      </MenuButton>
      {!isPrimaryUser && (
        <MenuItems className="z-10 absolute bg-white ring-opacity-5 shadow-lg mt-1 rounded-md ring-1 ring-black w-28">
          <div className="py-0.5" onClick={(e) => e.stopPropagation()}>
            {ROLES.map((roleOption) => (
              <MenuItem key={roleOption}>
                {({ active }) => (
                  <button
                    className={`${active ? "bg-gray-50" : ""} 
                      ${role === roleOption ? "font-medium" : ""} 
                      w-full text-left px-3 py-1 text-xs capitalize`}
                    onClick={() => {
                      if (role !== roleOption) {
                        fetcher.submit(
                          { role: roleOption },
                          {
                            method: "POST",
                            action: `/memberships/${id}/update-role`,
                          },
                        );
                      }
                    }}
                  >
                    {roleOption.replace("org-", "")}
                  </button>
                )}
              </MenuItem>
            ))}
          </div>
        </MenuItems>
      )}
    </Menu>
  );
};
