import { safeCreateOrg } from "@/sql-client.server/safeCreateOrg";
import { safeRegisterUser } from "@/sql-client.server/safeRegisterUser";

const userData = [
  {
    email_address: "collin@editframe.com",
  },
  {
    email_address: "jeremy@editframe.com",
  },
];

const users = await Promise.all(
  userData.map(async (user) => {
    return await safeRegisterUser(user.email_address, "password123");
  }),
);

await safeCreateOrg({
  primary: users[0]!,
  displayName: "Editframe",
  admins: users,
  editors: [],
  readers: [],
});

process.exit(1);
