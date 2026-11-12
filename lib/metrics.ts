import type { Assembly, ComponentRow, TeamRow, SystemRow } from "./types";

export type Totals = {
  cost: number;
  co2: number;
  components: number;
  verified: number;
};

export const emptyTotals = (): Totals => ({ cost: 0, co2: 0, components: 0, verified: 0 });

export function componentCost(row: ComponentRow): number {
  return Number(row.quantity ?? 0) * Number(row.unit_cost ?? 0);
}

export function componentCo2(row: ComponentRow): number {
  return Number(row.quantity ?? 0) * Number(row.co2e_unit ?? 0);
}

function add(totals: Totals, row: ComponentRow) {
  totals.cost += componentCost(row);
  totals.co2 += componentCo2(row);
  totals.components += 1;
  if (row.status === "verificato") totals.verified += 1;
}

export function overallTotals(components: ComponentRow[]): Totals {
  const totals = emptyTotals();
  components.forEach((row) => add(totals, row));
  return totals;
}

export function verifiedShare(totals: Totals): number {
  return totals.components === 0 ? 0 : (totals.verified / totals.components) * 100;
}

export function bySystem(
  systems: SystemRow[],
  assemblies: Assembly[],
  components: ComponentRow[],
): Array<Totals & { id: string; name: string; code: string }> {
  const systemOfAssembly = new Map<string, string>();
  assemblies.forEach((assembly) => systemOfAssembly.set(assembly.id, assembly.system_id));

  const buckets = new Map<string, Totals>();
  systems.forEach((system) => buckets.set(system.id, emptyTotals()));

  components.forEach((row) => {
    const systemId = systemOfAssembly.get(row.assembly_id);
    if (!systemId) return;
    const bucket = buckets.get(systemId) ?? emptyTotals();
    add(bucket, row);
    buckets.set(systemId, bucket);
  });

  return systems.map((system) => ({
    id: system.id,
    name: system.name,
    code: system.code,
    ...(buckets.get(system.id) ?? emptyTotals()),
  }));
}

export function byTeam(
  teams: TeamRow[],
  assemblies: Assembly[],
  components: ComponentRow[],
): Array<Totals & { id: string; name: string; lastUpdate: string | null }> {
  const teamOfAssembly = new Map<string, string>();
  assemblies.forEach((assembly) => teamOfAssembly.set(assembly.id, assembly.team_id));

  const totals = new Map<string, Totals>();
  const lastUpdate = new Map<string, string>();
  teams.forEach((team) => totals.set(team.id, emptyTotals()));

  components.forEach((row) => {
    const teamId = teamOfAssembly.get(row.assembly_id);
    if (!teamId) return;
    const bucket = totals.get(teamId) ?? emptyTotals();
    add(bucket, row);
    totals.set(teamId, bucket);

    const current = lastUpdate.get(teamId);
    if (!current || row.updated_at > current) lastUpdate.set(teamId, row.updated_at);
  });

  return teams.map((team) => ({
    id: team.id,
    name: team.name,
    ...(totals.get(team.id) ?? emptyTotals()),
    lastUpdate: lastUpdate.get(team.id) ?? null,
  }));
}

export function assemblyTotals(
  assemblies: Assembly[],
  components: ComponentRow[],
): Map<string, Totals> {
  const map = new Map<string, Totals>();
  assemblies.forEach((assembly) => map.set(assembly.id, emptyTotals()));
  components.forEach((row) => {
    const bucket = map.get(row.assembly_id);
    if (!bucket) return;
    add(bucket, row);
  });
  return map;
}
