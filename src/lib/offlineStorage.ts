import { openDB } from "idb";

const DB_NAME = "nck-offline-db";
const DB_VERSION = 1;
const STORE_NAME = "downloads";

export const initDB = async () => {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    },
  });
};

export const saveFile = async (id: string, data: Blob | object) => {
  const db = await initDB();
  await db.put(STORE_NAME, { id, data });
};

export const getFile = async (id: string) => {
  const db = await initDB();
  const record = await db.get(STORE_NAME, id);
  return record?.data || null;
};

export const getAllFiles = async () => {
  const db = await initDB();
  return db.getAll(STORE_NAME);
};
