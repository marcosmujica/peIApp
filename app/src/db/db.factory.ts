import { Platform } from "react-native";
import { ILocalDB } from "./ILocalDB";

let dbInstance: ILocalDB | null = null;

export async function getLocalDB(): Promise<ILocalDB> {
  if (dbInstance) return dbInstance;

  if (Platform.OS === "web") {
    const { DexieAdapter } = await import("./adapters/dexie.adapter");
    dbInstance = new DexieAdapter();
  } else {
    const { SqliteAdapter } = await import("./adapters/sqlite.adapter");
    dbInstance = new SqliteAdapter();
  }

  await dbInstance.init();
  return dbInstance;
}
