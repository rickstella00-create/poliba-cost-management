export type ReviewStatus = "bozza" | "verificato";
export type Sourcing = "make" | "buy";

export type SystemRow = {
  id: string;
  code: string;
  name: string;
  sort_order: number;
};

export type TeamRow = {
  id: string;
  slug: string;
  name: string;
  sort_order: number;
};

export type Assembly = {
  id: string;
  name: string;
  system_id: string;
  team_id: string;
  status: ReviewStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
  created_by_email: string | null;
  updated_by_email: string | null;
};

export type ComponentRow = {
  id: string;
  assembly_id: string;
  code: string | null;
  description: string;
  quantity: number;
  unit_cost: number;
  material: string | null;
  mass_kg: number | null;
  process: string | null;
  sourcing: Sourcing | null;
  supplier: string | null;
  co2e_unit: number;
  co2e_source: string | null;
  notes: string | null;
  status: ReviewStatus;
  created_at: string;
  updated_at: string;
  created_by_email: string | null;
  updated_by_email: string | null;
};

export type Registry = {
  systems: SystemRow[];
  teams: TeamRow[];
  assemblies: Assembly[];
  components: ComponentRow[];
};

export type ComponentDraft = {
  id?: string;
  assembly_id: string;
  code: string;
  description: string;
  quantity: string;
  unit_cost: string;
  material: string;
  mass_kg: string;
  process: string;
  sourcing: Sourcing | "";
  supplier: string;
  co2e_unit: string;
  co2e_source: string;
  notes: string;
};

export type AssemblyRowDraft = {
  id?: string;
  name: string;
  system_id: string;
  team_id: string;
  notes: string;
};
