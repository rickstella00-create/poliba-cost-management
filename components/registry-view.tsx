"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { AUTH_ENABLED } from "@/lib/config";
import { loadRegistry, emptyRegistry } from "@/lib/queries";
import { dateShort, eur, kg, num, pct, statusLabel, toNumber } from "@/lib/format";
import {
  assemblyTotals,
  bySystem,
  byTeam,
  overallTotals,
  verifiedShare,
  type Totals,
} from "@/lib/metrics";
import type {
  Assembly,
  AssemblyRowDraft,
  ComponentDraft,
  ComponentRow,
  Registry,
} from "@/lib/types";
import { AppHeader } from "./app-header";
import { AssemblyDialog, AuthDialog, ComponentDialog } from "./dialogs";

type Filters = {
  q: string;
  system: string;
  team: string;
  assembly: string;
  status: string;
};

const emptyFilters: Filters = { q: "", system: "", team: "", assembly: "", status: "" };

function friendly(message: string): string {
  if (/row-level security|violates row-level/i.test(message)) {
    return "Permission denied: sign in to edit the data.";
  }
  if (/duplicate key|unique constraint/i.test(message)) {
    return "An assembly with this name already exists in that system.";
  }
  return message;
}

export function RegistryView() {
  const [registry, setRegistry] = useState<Registry>(emptyRegistry);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [filters, setFilters] = useState<Filters>(emptyFilters);
  const [authOpen, setAuthOpen] = useState(false);
  const [authReason, setAuthReason] = useState<string | undefined>();
  const [componentDraft, setComponentDraft] = useState<ComponentRow | "new" | null>(null);
  const [assemblyDraft, setAssemblyDraft] = useState<Assembly | "new" | null>(null);
  const [flash, setFlash] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = supabase.auth.onAuthStateChange((_event, next) => setSession(next));
    return () => data.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    let alive = true;
    loadRegistry(supabase).then((next) => {
      if (!alive) return;
      setRegistry(next);
      setLoading(false);
      if (next.systems.length === 0) {
        setLoadError("The database is empty: run supabase/schema.sql once in the Supabase SQL editor.");
      }
    });
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (!flash) return;
    const timer = setTimeout(() => setFlash(null), 3200);
    return () => clearTimeout(timer);
  }, [flash]);

  const { systems, teams, assemblies, components } = registry;

  const refresh = async () => {
    const next = await loadRegistry(supabase);
    setRegistry(next);
    setLoadError(null);
  };

  const requireSession = (reason: string): boolean => {
    if (!AUTH_ENABLED) return true;
    if (session) return true;
    setAuthReason(reason);
    setAuthOpen(true);
    return false;
  };

  const assemblyById = useMemo(
    () => new Map(assemblies.map((assembly) => [assembly.id, assembly])),
    [assemblies],
  );
  const systemById = useMemo(() => new Map(systems.map((system) => [system.id, system])), [systems]);
  const teamById = useMemo(() => new Map(teams.map((team) => [team.id, team])), [teams]);

  const totals = useMemo(() => overallTotals(components), [components]);
  const systemTotals = useMemo(() => bySystem(systems, assemblies, components), [systems, assemblies, components]);
  const teamTotals = useMemo(() => byTeam(teams, assemblies, components), [teams, assemblies, components]);
  const perAssembly = useMemo(() => assemblyTotals(assemblies, components), [assemblies, components]);

  const maxSystemCost = Math.max(1, ...systemTotals.map((row) => row.cost));
  const maxSystemCo2 = Math.max(1, ...systemTotals.map((row) => row.co2));

  const filtered = useMemo(() => {
    const needle = filters.q.trim().toLowerCase();
    return components.filter((component) => {
      const assembly = assemblyById.get(component.assembly_id);
      if (!assembly) return false;
      if (filters.system && assembly.system_id !== filters.system) return false;
      if (filters.team && assembly.team_id !== filters.team) return false;
      if (filters.assembly && assembly.id !== filters.assembly) return false;
      if (filters.status && component.status !== filters.status) return false;
      if (!needle) return true;
      const haystack = [
        component.description,
        component.code,
        component.material,
        component.process,
        component.supplier,
        component.co2e_source,
        assembly.name,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(needle);
    });
  }, [components, filters, assemblyById]);

  const filteredTotals = useMemo(() => overallTotals(filtered), [filtered]);

  const exportHref = useMemo(() => {
    const params = new URLSearchParams();
    if (filters.system) params.set("system", filters.system);
    if (filters.team) params.set("team", filters.team);
    if (filters.status) params.set("status", filters.status);
    if (filters.q) params.set("q", filters.q);
    const query = params.toString();
    return `/api/export${query ? `?${query}` : ""}`;
  }, [filters]);

  async function saveComponent(draft: ComponentDraft): Promise<string | null> {
    if (!requireSession("Sign in to add and edit registry components.")) {
      return "Sign in to save.";
    }
    const payload = {
      assembly_id: draft.assembly_id,
      code: draft.code.trim() || null,
      description: draft.description.trim(),
      quantity: toNumber(draft.quantity),
      unit_cost: toNumber(draft.unit_cost),
      material: draft.material.trim() || null,
      mass_kg: draft.mass_kg.trim() === "" ? null : toNumber(draft.mass_kg),
      process: draft.process.trim() || null,
      sourcing: draft.sourcing || null,
      supplier: draft.supplier.trim() || null,
      co2e_unit: toNumber(draft.co2e_unit),
      co2e_source: draft.co2e_source.trim() || null,
      notes: draft.notes.trim() || null,
      updated_by_email: session?.user.email ?? null,
    };

    if (!payload.description) return "The description is required.";
    if (!payload.assembly_id) return "Choose the assembly this component belongs to.";

    const { error } = draft.id
      ? await supabase.from("components").update(payload).eq("id", draft.id)
      : await supabase
          .from("components")
          .insert({ ...payload, created_by_email: session?.user.email ?? null });

    if (error) return friendly(error.message);
    await refresh();
    setFlash(draft.id ? "Component updated." : "Component added.");
    return null;
  }

  async function deleteComponent(id: string): Promise<string | null> {
    if (!requireSession("Sign in to delete a component.")) return "Sign in to continue.";
    const { error } = await supabase.from("components").delete().eq("id", id);
    if (error) return friendly(error.message);
    await refresh();
    setFlash("Component deleted.");
    return null;
  }

  async function toggleStatus(component: ComponentRow) {
    if (!requireSession("Sign in to change the verification status.")) return;
    const next = component.status === "verificato" ? "bozza" : "verificato";
    const { error } = await supabase
      .from("components")
      .update({ status: next, updated_by_email: session?.user.email ?? null })
      .eq("id", component.id);
    if (error) {
      setFlash(friendly(error.message));
      return;
    }
    await refresh();
    setFlash(next === "verificato" ? "Component verified." : "Back to draft.");
  }

  async function saveAssembly(draft: AssemblyRowDraft): Promise<string | null> {
    if (!requireSession("Sign in to create or edit assemblies.")) return "Sign in to continue.";
    const payload = {
      name: draft.name.trim(),
      system_id: draft.system_id,
      team_id: draft.team_id,
      notes: draft.notes.trim() || null,
      updated_by_email: session?.user.email ?? null,
    };
    if (!payload.name) return "The assembly name is required.";
    if (!payload.system_id) return "Choose the system.";
    if (!payload.team_id) return "Choose the responsible team.";

    const { error } = draft.id
      ? await supabase.from("assemblies").update(payload).eq("id", draft.id)
      : await supabase
          .from("assemblies")
          .insert({ ...payload, created_by_email: session?.user.email ?? null });

    if (error) return friendly(error.message);
    await refresh();
    setFlash(draft.id ? "Assembly updated." : "Assembly created.");
    return null;
  }

  async function deleteAssembly(id: string): Promise<string | null> {
    if (!requireSession("Sign in to delete an assembly.")) return "Sign in to continue.";
    const { error } = await supabase.from("assemblies").delete().eq("id", id);
    if (error) return friendly(error.message);
    await refresh();
    setFlash("Assembly deleted.");
    return null;
  }

  const defaultAssemblyId = filters.assembly || assemblies[0]?.id || "";

  return (
    <>
      <AppHeader />

      <main className="wrap">
        {loadError ? <p className="notice" style={{ marginTop: 24 }}>{loadError}</p> : null}
        {!AUTH_ENABLED ? (
          <p className="form-note" style={{ marginTop: 24 }}>
            Experimental phase: the site is open, anyone with the link can add and edit data. Email
            sign-in is already wired up and will be switched on later.
          </p>
        ) : null}
        {flash ? <p className="form-ok" style={{ marginTop: 24 }}>{flash}</p> : null}

        {/* ------------------------------------------------------ overview */}
        <section className="section" id="overview">
          <div className="section__head">
            <div>
              <p className="eyebrow">
                <span className="eyebrow__num">01</span>Overview
              </p>
              <h1 className="section__title">Cost and weight of the car</h1>
              <p className="section__note">
                Totals come from the components entered by the teams. Editing a verified row puts it
                back to draft.
              </p>
            </div>
            <a className="btn btn--ghost btn--sm" href={exportHref}>
              Export Excel
            </a>
          </div>

          <div className="kpi-grid">
            <div className="kpi kpi--accent">
              <p className="kpi__label">Total cost</p>
              <p className="kpi__value">{loading ? "—" : eur(totals.cost)}</p>
              <p className="kpi__hint">
                {num(totals.components)} {totals.components === 1 ? "component" : "components"} in the
                registry
              </p>
            </div>
            <div className="kpi">
              <p className="kpi__label">Total CO₂e</p>
              <p className="kpi__value">{loading ? "—" : kg(totals.co2)}</p>
              <p className="kpi__hint">Sum of the values entered by the teams</p>
            </div>
            <div className="kpi">
              <p className="kpi__label">Verified</p>
              <p className="kpi__value">{loading ? "—" : pct(verifiedShare(totals))}</p>
              <p className="kpi__hint">
                {num(totals.verified)} of {num(totals.components)} checked by Cost Management
              </p>
            </div>
            <div className="kpi">
              <p className="kpi__label">Assemblies</p>
              <p className="kpi__value">{loading ? "—" : num(assemblies.length)}</p>
              <p className="kpi__hint">
                {assemblies.length === 0 ? "No assemblies yet" : `across ${num(systems.length)} systems`}
              </p>
            </div>
          </div>

          <div className="split">
            <div className="panel">
              <div className="panel__head">
                <h2 className="panel__title">Cost by system</h2>
                <p className="panel__hint">€</p>
              </div>
              <SystemBars rows={systemTotals} max={maxSystemCost} kind="cost" />
            </div>
            <div className="panel">
              <div className="panel__head">
                <h2 className="panel__title">CO₂e by system</h2>
                <p className="panel__hint">kg CO₂e</p>
              </div>
              <SystemBars rows={systemTotals} max={maxSystemCo2} kind="co2" />
            </div>
          </div>

          <div className="panel panel--table" style={{ marginTop: 12 }}>
            <div className="panel__head">
              <h2 className="panel__title">Team status</h2>
              <p className="panel__hint">{num(teams.length)} divisions</p>
            </div>
            <div className="table-wrap">
              <table className="data">
                <thead>
                  <tr>
                    <th>Team</th>
                    <th className="num">Components</th>
                    <th className="num">Cost</th>
                    <th className="num">CO₂e</th>
                    <th className="num">Verified</th>
                    <th className="num">Last update</th>
                  </tr>
                </thead>
                <tbody>
                  {teamTotals.map((team) => (
                    <tr key={team.id}>
                      <td className="cell-main">{team.name}</td>
                      <td className="num">{num(team.components)}</td>
                      <td className="num">{eur(team.cost)}</td>
                      <td className="num">{kg(team.co2)}</td>
                      <td className="num">{team.components === 0 ? "—" : pct(verifiedShare(team))}</td>
                      <td className="num">{dateShort(team.lastUpdate)}</td>
                    </tr>
                  ))}
                  {teamTotals.length > 0 ? (
                    <tr className="total-row">
                      <td>Total</td>
                      <td className="num">{num(totals.components)}</td>
                      <td className="num">{eur(totals.cost)}</td>
                      <td className="num">{kg(totals.co2)}</td>
                      <td className="num">{pct(verifiedShare(totals))}</td>
                      <td className="num" />
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
            {teams.length === 0 && !loading ? (
              <div className="empty">
                <p className="empty__title">No teams in the database</p>
                <p className="empty__text">Run supabase/schema.sql to load systems and divisions.</p>
              </div>
            ) : null}
          </div>
        </section>

        {/* ----------------------------------------------------- assemblies */}
        <section className="section" id="assemblies">
          <div className="section__head">
            <div>
              <p className="eyebrow">
                <span className="eyebrow__num">02</span>Assemblies
              </p>
              <h2 className="section__title">One assembly per group of parts</h2>
              <p className="section__note">
                Every assembly belongs to one official system and one team. Components live inside the
                assembly.
              </p>
            </div>
            <button
              type="button"
              className="btn btn--primary btn--sm"
              onClick={() => (requireSession("Sign in to create an assembly.") ? setAssemblyDraft("new") : null)}
            >
              + New assembly
            </button>
          </div>

          <div className="panel panel--table">
            <div className="table-wrap">
              <table className="data">
                <thead>
                  <tr>
                    <th>Assembly</th>
                    <th>System</th>
                    <th>Team</th>
                    <th className="num">Components</th>
                    <th className="num">Cost</th>
                    <th className="num">CO₂e</th>
                    <th>Status</th>
                    <th className="row-actions">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {assemblies.map((assembly) => {
                    const sums = perAssembly.get(assembly.id) ?? {
                      cost: 0,
                      co2: 0,
                      components: 0,
                      verified: 0,
                    };
                    return (
                      <tr
                        key={assembly.id}
                        className="is-clickable"
                        onClick={() =>
                          requireSession("Sign in to edit assemblies.") ? setAssemblyDraft(assembly) : null
                        }
                      >
                        <td className="cell-main">{assembly.name}</td>
                        <td>{systemById.get(assembly.system_id)?.name ?? "—"}</td>
                        <td>{teamById.get(assembly.team_id)?.name ?? "—"}</td>
                        <td className="num">{num(sums.components)}</td>
                        <td className="num">{eur(sums.cost)}</td>
                        <td className="num">{kg(sums.co2)}</td>
                        <td>
                          <span className={`chip chip--${assembly.status}`}>
                            <span className="chip__dot" aria-hidden="true" />
                            {statusLabel(assembly.status)}
                          </span>
                        </td>
                        <td className="row-actions">
                          <button
                            type="button"
                            className="btn btn--quiet btn--sm"
                            onClick={(event) => {
                              event.stopPropagation();
                              if (!requireSession("Sign in to add components.")) return;
                              setFilters((current) => ({ ...current, assembly: assembly.id }));
                              setComponentDraft("new");
                            }}
                          >
                            + component
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {assemblies.length === 0 && !loading ? (
              <div className="empty">
                <p className="empty__title">No assemblies yet</p>
                <p className="empty__text">
                  Start from the groups you know best: front suspension, chassis, brake system. Each
                  assembly collects its components with cost and emissions.
                </p>
              </div>
            ) : null}
          </div>
        </section>

        {/* ----------------------------------------------------- components */}
        <section className="section" id="components">
          <div className="section__head">
            <div>
              <p className="eyebrow">
                <span className="eyebrow__num">03</span>Components registry
              </p>
              <h2 className="section__title">The BOM, piece by piece</h2>
              <p className="section__note">
                Search, filter and export. Total cost and total CO₂e are quantity × unit value.
              </p>
            </div>
          </div>

          <div className="toolbar">
            <div className="filters">
              <input
                className="input input--search"
                placeholder="Search description, code, material, supplier…"
                value={filters.q}
                onChange={(event) => setFilters((current) => ({ ...current, q: event.target.value }))}
                aria-label="Search components"
              />
              <select
                className="select"
                value={filters.system}
                onChange={(event) => setFilters((current) => ({ ...current, system: event.target.value }))}
                aria-label="Filter by system"
              >
                <option value="">All systems</option>
                {systems.map((system) => (
                  <option key={system.id} value={system.id}>
                    {system.name}
                  </option>
                ))}
              </select>
              <select
                className="select"
                value={filters.team}
                onChange={(event) => setFilters((current) => ({ ...current, team: event.target.value }))}
                aria-label="Filter by team"
              >
                <option value="">All teams</option>
                {teams.map((team) => (
                  <option key={team.id} value={team.id}>
                    {team.name}
                  </option>
                ))}
              </select>
              <select
                className="select"
                value={filters.assembly}
                onChange={(event) => setFilters((current) => ({ ...current, assembly: event.target.value }))}
                aria-label="Filter by assembly"
              >
                <option value="">All assemblies</option>
                {assemblies.map((assembly) => (
                  <option key={assembly.id} value={assembly.id}>
                    {assembly.name}
                  </option>
                ))}
              </select>
              <select
                className="select"
                value={filters.status}
                onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value }))}
                aria-label="Filter by status"
              >
                <option value="">Any status</option>
                <option value="bozza">Draft</option>
                <option value="verificato">Verified</option>
              </select>
            </div>
            <div className="toolbar__actions">
              <button
                type="button"
                className="btn btn--primary btn--sm"
                onClick={() =>
                  requireSession("Sign in to add a component.") ? setComponentDraft("new") : null
                }
              >
                + Component
              </button>
              <a className="btn btn--ghost btn--sm" href={exportHref}>
                Export
              </a>
            </div>
          </div>

          <div className="panel panel--table">
            <div className="table-wrap">
              <table className="data">
                <thead>
                  <tr>
                    <th>Code</th>
                    <th>Description</th>
                    <th className="num">Qty</th>
                    <th className="num">€ / unit</th>
                    <th className="num">Total €</th>
                    <th className="num">CO₂e / unit</th>
                    <th className="num">Total CO₂e</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((component) => {
                    const assembly = assemblyById.get(component.assembly_id);
                    const systemName = assembly ? systemById.get(assembly.system_id)?.name : null;
                    const teamName = assembly ? teamById.get(assembly.team_id)?.name : null;
                    return (
                      <tr
                        key={component.id}
                        className="is-clickable"
                        onClick={() => {
                          if (requireSession("Sign in to edit components.")) {
                            setComponentDraft(component);
                          }
                        }}
                      >
                        <td className="cell-code">{component.code || "—"}</td>
                        <td>
                          <span className="cell-main">{component.description}</span>
                          <span className="cell-sub">
                            {assembly?.name ?? "—"}
                            {systemName ? ` · ${systemName}` : ""}
                            {teamName ? ` · ${teamName}` : ""}
                          </span>
                        </td>
                        <td className="num">{num(component.quantity)}</td>
                        <td className="num">{eur(component.unit_cost, true)}</td>
                        <td className="num">{eur(Number(component.quantity) * Number(component.unit_cost), true)}</td>
                        <td className="num">{num(component.co2e_unit)}</td>
                        <td className="num">{num(Number(component.quantity) * Number(component.co2e_unit))}</td>
                        <td>
                          <button
                            type="button"
                            className={`chip chip--${component.status}`}
                            onClick={(event) => {
                              event.stopPropagation();
                              toggleStatus(component);
                            }}
                            title="Change verification status"
                          >
                            <span className="chip__dot" aria-hidden="true" />
                            {statusLabel(component.status)}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                {filtered.length > 0 ? (
                  <tfoot>
                    <tr className="total-row">
                      <td colSpan={4}>
                        {num(filtered.length)} {filtered.length === 1 ? "component" : "components"}
                        {filtered.length !== components.length ? ` (filtered from ${num(components.length)})` : ""}
                      </td>
                      <td className="num">{eur(filteredTotals.cost, true)}</td>
                      <td className="num" />
                      <td className="num">{num(filteredTotals.co2)}</td>
                      <td />
                    </tr>
                  </tfoot>
                ) : null}
              </table>
            </div>
            {filtered.length === 0 && !loading ? (
              <div className="empty">
                <p className="empty__title">
                  {components.length === 0 ? "The registry is empty" : "No components match these filters"}
                </p>
                <p className="empty__text">
                  {components.length === 0
                    ? "Create an assembly, then add its components with unit cost and CO₂e. The dashboard fills in from there."
                    : "Try removing one of the filters or changing the search."}
                </p>
              </div>
            ) : null}
          </div>
        </section>

        <footer className="footer">
          <span>Poliba Corse · Cost Management</span>
          <span>
            <Link href="/">Overview</Link> · <a href={exportHref}>Excel</a>
          </span>
        </footer>
      </main>

      {authOpen ? (
        <AuthDialog
          onClose={() => setAuthOpen(false)}
          teams={teams}
          reason={authReason ?? "Sign in to add and edit registry data."}
        />
      ) : null}

      {componentDraft ? (
        <ComponentDialog
          component={componentDraft === "new" ? null : componentDraft}
          defaultAssemblyId={defaultAssemblyId}
          assemblies={assemblies}
          onClose={() => setComponentDraft(null)}
          onSubmit={saveComponent}
          onDelete={componentDraft === "new" ? undefined : deleteComponent}
        />
      ) : null}

      {assemblyDraft ? (
        <AssemblyDialog
          assembly={assemblyDraft === "new" ? null : assemblyDraft}
          systems={systems}
          teams={teams}
          onClose={() => setAssemblyDraft(null)}
          onSubmit={saveAssembly}
          onDelete={assemblyDraft === "new" ? undefined : deleteAssembly}
        />
      ) : null}
    </>
  );
}

function SystemBars({
  rows,
  max,
  kind,
}: {
  rows: Array<Totals & { id: string; name: string; code: string }>;
  max: number;
  kind: "cost" | "co2";
}) {
  if (rows.length === 0) {
    return (
      <div className="empty">
        <p className="empty__title">No systems</p>
        <p className="empty__text">Run supabase/schema.sql to load the eight official systems.</p>
      </div>
    );
  }

  return (
    <div className="bars">
      {rows.map((row) => {
        const value = kind === "cost" ? row.cost : row.co2;
        const width = Math.max(0, Math.min(100, (value / max) * 100));
        return (
          <div key={row.id} className={`bars__row${value === 0 ? " bars__row--empty" : ""}`}>
            <span className="bars__label">
              <span className="bars__code">{row.code}</span>
              {row.name}
            </span>
            <span className="bars__track">
              <span
                className={`bars__fill${kind === "co2" ? " bars__fill--co2" : ""}`}
                style={{ width: `${value === 0 ? 100 : width}%` }}
              />
            </span>
            <span className="bars__value">
              {value === 0 ? "—" : kind === "cost" ? eur(value) : `${num(value)} kg`}
            </span>
          </div>
        );
      })}
    </div>
  );
}
