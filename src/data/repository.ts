import type { Command, Database } from "../domain/model";
import { executeCommand, validateDatabase } from "../domain/logic";
import { createSeed } from "../domain/seed";

export interface Repository {
  load(): Promise<Database>;
  execute(command: Command): Promise<Database>;
  reset(): Promise<Database>;
  subscribe(listener: () => void): () => void;
}
export const STORAGE_KEY = "andres-le-vende:v1";
export class LocalRepository implements Repository {
  private read(): Database {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === null) {
      const db = createSeed();
      this.write(db);
      return db;
    }
    const envelope = JSON.parse(raw);
    if (envelope.version !== 1)
      throw Error(
        "Esta versión de los datos no es compatible. No se han sobrescrito.",
      );
    return validateDatabase(envelope.data);
  }
  private write(data: Database) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, data }));
  }
  async load() {
    return this.read();
  }
  async execute(command: Command) {
    const db = executeCommand(this.read(), command);
    this.write(db);
    return db;
  }
  async reset() {
    const db = createSeed();
    this.write(db);
    return db;
  }
  subscribe(listener: () => void) {
    const handler = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY || e.key === null) listener();
    };
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }
}
export const repository: Repository = new LocalRepository();
