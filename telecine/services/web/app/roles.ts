export enum Roles_Enum {
  Admin = "admin",
  Editor = "editor",
  Reader = "reader",
}

export const Roles_List = Object.values(Roles_Enum) as [string, ...string[]];
