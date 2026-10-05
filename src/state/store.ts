"use client";
import { create } from "zustand";
import type { Command, Database } from "../domain/model";
import { repository } from "../data/repository";
interface Store {
  data: Database | null;
  error: string | null;
  busy: boolean;
  load: () => Promise<void>;
  run: (command: Command) => Promise<void>;
  reset: () => Promise<void>;
}
const errorMessage = (error: unknown) =>
  error instanceof Error
    ? error.message
    : "No se pudieron guardar los cambios.";
export const useStore = create<Store>((set, get) => ({
  data: null,
  error: null,
  busy: false,
  load: async () => {
    try {
      set({ data: await repository.load(), error: null });
    } catch (error) {
      set({ error: errorMessage(error) });
    }
  },
  run: async (command) => {
    if (get().busy) throw Error("Espera a que termine la operación anterior.");
    set({ busy: true });
    try {
      const data = await repository.execute(command);
      set({ data, error: null });
    } finally {
      set({ busy: false });
    }
  },
  reset: async () => {
    const data = await repository.reset();
    set({ data, error: null });
  },
}));
