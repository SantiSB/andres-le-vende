"use client";
import { create } from "zustand";
import type { Command, Database } from "../domain/model";
import { repositoryFor } from "../data/repository";
import type { DataSource } from "../data/source";
interface Store {
  source: DataSource | null;
  data: Database | null;
  error: string | null;
  busy: boolean;
  load: (source: DataSource) => Promise<void>;
  run: (command: Command) => Promise<void>;
  clear: () => void;
}
const errorMessage = (error: unknown) =>
  error instanceof Error
    ? error.message
    : "No se pudieron guardar los cambios.";
export const useStore = create<Store>((set, get) => ({
  source: null,
  data: null,
  error: null,
  busy: false,
  load: async (source) => {
    set((state) => ({
      source,
      data: state.source === source ? state.data : null,
      error: null,
    }));
    try {
      const data = await repositoryFor().load();
      if (get().source === source) set({ data, error: null });
    } catch (error) {
      if (get().source === source) set({ error: errorMessage(error) });
    }
  },
  run: async (command) => {
    if (get().busy) throw Error("Espera a que termine la operación anterior.");
    const source = get().source;
    if (!source) throw Error("Espera a que se carguen los datos.");
    set({ busy: true });
    try {
      const data = await repositoryFor().execute(command);
      if (get().source === source) set({ data, error: null });
    } finally {
      set({ busy: false });
    }
  },
  clear: () => set({ source: null, data: null, error: null }),
}));
