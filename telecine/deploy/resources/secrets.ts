import { secretToken } from "../util/secretToken";

export const applicationSecret = secretToken("application");
export const actionSecret = secretToken("action");
export const appJwtSecret = secretToken("app-jwt");
export const hasuraJwtSecretToken = secretToken("jwt");
export const hasuraAdminSecret = secretToken("hasura-admin");
