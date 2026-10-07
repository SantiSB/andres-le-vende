import type { Command, Database } from "../domain/model";
import { SupabaseRepository } from "./supabase-repository";

export interface Repository {
  load(): Promise<Database>;
  execute(command: Command): Promise<Database>;
}
const supabaseRepository: Repository = new SupabaseRepository();

export function repositoryFor(): Repository {
  return supabaseRepository;
}
