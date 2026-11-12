import type { SupabaseClient } from "@supabase/supabase-js";
import type { Assembly, ComponentRow, Registry, SystemRow, TeamRow } from "./types";

export const emptyRegistry: Registry = {
  systems: [],
  teams: [],
  assemblies: [],
  components: [],
};

/** Carica l'intero registro. Le letture sono pubbliche: nessuna sessione richiesta. */
export async function loadRegistry(client: SupabaseClient): Promise<Registry> {
  const [systems, teams, assemblies, components] = await Promise.all([
    client.from("systems").select("id, code, name, sort_order").order("sort_order"),
    client.from("teams").select("id, slug, name, sort_order").order("sort_order"),
    client.from("assemblies").select("*").order("name"),
    client.from("components").select("*").order("description"),
  ]);

  return {
    systems: (systems.data as SystemRow[] | null) ?? [],
    teams: (teams.data as TeamRow[] | null) ?? [],
    assemblies: (assemblies.data as Assembly[] | null) ?? [],
    components: (components.data as ComponentRow[] | null) ?? [],
  };
}
