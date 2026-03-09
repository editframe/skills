import { program } from "commander";
import "dotenv/config";
import { Client } from "@editframe/api";

let client: Client;

export const getClient = () => {
  if (!client) {
    const programOpts = program.opts();
    const token = programOpts.token || process.env.EF_TOKEN;
    const efHost = programOpts.efHost || process.env.EF_HOST;
    if (!token) {
      throw new Error("EF_TOKEN must be set or supplied as command line argument");
    }
    client = new Client(token, efHost);
  }
  return client;
};
