import type { ContentBlock } from ".";

export const UserName: ContentBlock<{
  first_name: string | null;
  last_name: string | null;
}> = ({ record: { first_name, last_name } }) => (
  <span>
    {first_name ?? ""} {last_name ?? ""}
  </span>
);
export const UserEmail: ContentBlock<{
  email_passwords: { email_address: string }[];
}> = ({ record: { email_passwords } }) => (
  <span>
    {email_passwords?.map(({ email_address }) => email_address).join(", ")}
  </span>
);
