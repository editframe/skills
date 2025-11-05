import { createContext } from "mobx-keystone";
import { StorageProvider } from "./StorageProvider";

export const storageContext = createContext<StorageProvider>();
