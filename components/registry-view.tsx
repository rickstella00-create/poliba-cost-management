"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { AUTH_ENABLED } from "@/lib/config";
import { loadRegistry, emptyRegistry } from "@/lib/queries";
import { dateIt, eur, kg, num, pct, toNumber } from "@/lib/format";
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
    return "Permesso negato: accedi per modificare i dati.";
  }
  if (/duplicate key|unique constraint/i.test(message)) {
    return "Esiste già un assieme con questo nome nello stesso sistema.";
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
        setLoadError(
          "Il database è vuoto: esegui una volta supabase/schema.sql nell'SQL Editor di Supabase.",
        );
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
    if (!requireSession("Accedi per inserire e modificare i componenti del registro.")) {
      return "Accedi per salvare.";
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

    if (!payload.description) return "La descrizione è obbligatoria.";
    if (!payload.assembly_id) return "Scegli l'assieme a cui appartiene il componente.";

    const { error } = draft.id
      ? await supabase.from("components").update(payload).eq("id", draft.id)
      : await supabase
          .from("components")
          .insert({ ...payload, created_by_email: session?.user.email ?? null });

    if (error) return friendly(error.message);
    await refresh();
    setFlash(draft.id ? "Componente aggiornato." : "Componente aggiunto.");
    return null;
  }

  async function deleteComponent(id: string): Promise<string | null> {
    if (!requireSession("Accedi per eliminare un componente.")) return "Accedi per continuare.";
    const { error } = await supabase.from("components").delete().eq("id", id);
    if (error) return friendly(error.message);
    await refresh();
    setFlash("Componente eliminato.");
    return null;
  }

  async function toggleStatus(component: ComponentRow) {
    if (!requireSession("Accedi per cambiare lo stato di verifica.")) return;
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
    setFlash(next === "verificato" ? "Componente verificato." : "Riportato in bozza.");
  }

  async function saveAssembly(draft: AssemblyRowDraft): Promise<string | null> {
    if (!requireSession("Accedi per creare o modificare gli assiemi.")) return "Accedi per continuare.";
    const payload = {
      name: draft.name.trim(),
      system_id: draft.system_id,
      team_id: draft.team_id,
      notes: draft.notes.trim() || null,
      updated_by_email: session?.user.email ?? null,
    };
    if (!payload.name) return "Il nome dell'assieme è obbligatorio.";
    if (!payload.system_id) return "Scegli il sistema.";
    if (!payload.team_id) return "Scegli il team responsabile.";

    const { error } = draft.id
      ? await supabase.from("assemblies").update(payload).eq("id", draft.id)
      : await supabase
          .from("assemblies")
          .insert({ ...payload, created_by_email: session?.user.email ?? null });

    if (error) return friendly(error.message);
    await refresh();
    setFlash(draft.id ? "Assieme aggiornato." : "Assieme creato.");
    return null;
  }

  async function deleteAssembly(id: string): Promise<string | null> {
    if (!requireSession("Accedi per eliminare un assieme.")) return "Accedi per continuare.";
    const { error } = await supabase.from("assemblies").delete().eq("id", id);
    if (error) return friendly(error.message);
    await refresh();
    setFlash("Assieme eliminato.");
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
            Fase sperimentale: il sito è aperto, chiunque abbia il link può inserire e modificare i dati.
            L&apos;accesso con email resta predisposto e verrà attivato più avanti.
          </p>
        ) : null}
        {flash ? <p className="form-ok" style={{ marginTop: 24 }}>{flash}</p> : null}

        {/* ---------------------------------------------------- panoramica */}
        <section className="section" id="panoramica">
          <div className="section__head">
            <div>
              <p className="eyebrow">
                <span className="eyebrow__num">01</span>Panoramica
              </p>
              <h1 className="section__title">Il costo e il peso della monoposto</h1>
              <p className="section__note">
                Totali calcolati dai componenti inseriti dai team. Modificare un dato verificato lo riporta
                in bozza.
              </p>
            </div>
            <a className="btn btn--ghost btn--sm" href={exportHref}>
              Esporta Excel
            </a>
          </div>

          <div className="kpi-grid">
            <div className="kpi kpi--accent">
              <p className="kpi__label">Costo totale</p>
              <p className="kpi__value">{loading ? "—" : eur(totals.cost)}</p>
              <p className="kpi__hint">
                {num(totals.components)} {totals.components === 1 ? "componente" : "componenti"} a registro
              </p>
            </div>
            <div className="kpi">
              <p className="kpi__label">CO₂e totale</p>
              <p className="kpi__value">{loading ? "—" : kg(totals.co2)}</p>
              <p className="kpi__hint">Somma dei valori inseriti dai team</p>
            </div>
            <div className="kpi">
              <p className="kpi__label">Verificati</p>
              <p className="kpi__value">{loading ? "—" : pct(verifiedShare(totals))}</p>
              <p className="kpi__hint">
                {num(totals.verified)} su {num(totals.components)} controllati dal Cost Management
              </p>
            </div>
            <div className="kpi">
              <p className="kpi__label">Assiemi</p>
              <p className="kpi__value">{loading ? "—" : num(assemblies.length)}</p>
              <p className="kpi__hint">
                {assemblies.length === 0 ? "Nessun assieme creato" : `su ${num(systems.length)} sistemi`}
              </p>
            </div>
          </div>

          <div className="split">
            <div className="panel">
              <div className="panel__head">
                <h2 className="panel__title">Costo per sistema</h2>
                <p className="panel__hint">€</p>
              </div>
              <SystemBars rows={systemTotals} max={maxSystemCost} kind="cost" />
            </div>
            <div className="panel">
              <div className="panel__head">
                <h2 className="panel__title">CO₂e per sistema</h2>
                <p className="panel__hint">kg CO₂e</p>
              </div>
              <SystemBars rows={systemTotals} max={maxSystemCo2} kind="co2" />
            </div>
          </div>

          <div className="panel panel--table" style={{ marginTop: 12 }}>
            <div className="panel__head">
              <h2 className="panel__title">Stato dei team</h2>
              <p className="panel__hint">{num(teams.length)} divisioni</p>
            </div>
            <div className="table-wrap">
              <table className="data">
                <thead>
                  <tr>
                    <th>Team</th>
                    <th className="num">Componenti</th>
                    <th className="num">Costo</th>
                    <th className="num">CO₂e</th>
                    <th className="num">Verificati</th>
                    <th className="num">Ultima modifica</th>
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
                      <td className="num">{dateIt(team.lastUpdate)}</td>
                    </tr>
                  ))}
                  {teamTotals.length > 0 ? (
                    <tr className="total-row">
                      <td>Totale</td>
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
                <p className="empty__title">Nessun team nel database</p>
                <p className="empty__text">Esegui supabase/schema.sql per caricare sistemi e divisioni.</p>
              </div>
            ) : null}
          </div>
        </section>

        {/* -------------------------------------------------------- assiemi */}
        <section className="section" id="assiemi">
          <div className="section__head">
            <div>
              <p className="eyebrow">
                <span className="eyebrow__num">02</span>Assiemi
              </p>
              <h2 className="section__title">Un assieme per ogni gruppo di pezzi</h2>
              <p className="section__note">
                Ogni assieme appartiene a un sistema ufficiale e a un team. I componenti vivono dentro
                l'assieme.
              </p>
            </div>
            <button
              type="button"
              className="btn btn--primary btn--sm"
              onClick={() => (requireSession("Accedi per creare un assieme.") ? setAssemblyDraft("new") : null)}
            >
              + Nuovo assieme
            </button>
          </div>

          <div className="panel panel--table">
            <div className="table-wrap">
              <table className="data">
                <thead>
                  <tr>
                    <th>Assieme</th>
                    <th>Sistema</th>
                    <th>Team</th>
                    <th className="num">Componenti</th>
                    <th className="num">Costo</th>
                    <th className="num">CO₂e</th>
                    <th>Stato</th>
                    <th className="row-actions">
                      <span className="sr-only">Azioni</span>
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
                          requireSession("Accedi per modificare gli assiemi.")
                            ? setAssemblyDraft(assembly)
                            : null
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
                            {assembly.status}
                          </span>
                        </td>
                        <td className="row-actions">
                          <button
                            type="button"
                            className="btn btn--quiet btn--sm"
                            onClick={(event) => {
                              event.stopPropagation();
                              if (!requireSession("Accedi per inserire componenti.")) return;
                              setFilters((current) => ({ ...current, assembly: assembly.id }));
                              setComponentDraft("new");
                            }}
                          >
                            + componente
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
                <p className="empty__title">Nessun assieme ancora</p>
                <p className="empty__text">
                  Inizia dai gruppi che conoscete meglio: sospensioni anteriori, telaio, impianto frenante.
                  Ogni assieme raccoglie i suoi componenti con costo ed emissioni.
                </p>
              </div>
            ) : null}
          </div>
        </section>

        {/* ----------------------------------------------------- componenti */}
        <section className="section" id="componenti">
          <div className="section__head">
            <div>
              <p className="eyebrow">
                <span className="eyebrow__num">03</span>Registro componenti
              </p>
              <h2 className="section__title">La BOM, pezzo per pezzo</h2>
              <p className="section__note">
                Cerca, filtra ed esporta. Il costo totale e la CO₂e totale sono quantità × valore unitario.
              </p>
            </div>
          </div>

          <div className="toolbar">
            <div className="filters">
              <input
                className="input input--search"
                placeholder="Cerca descrizione, codice, materiale, fornitore…"
                value={filters.q}
                onChange={(event) => setFilters((current) => ({ ...current, q: event.target.value }))}
                aria-label="Cerca componenti"
              />
              <select
                className="select"
                value={filters.system}
                onChange={(event) => setFilters((current) => ({ ...current, system: event.target.value }))}
                aria-label="Filtra per sistema"
              >
                <option value="">Tutti i sistemi</option>
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
                aria-label="Filtra per team"
              >
                <option value="">Tutti i team</option>
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
                aria-label="Filtra per assieme"
              >
                <option value="">Tutti gli assiemi</option>
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
                aria-label="Filtra per stato"
              >
                <option value="">Ogni stato</option>
                <option value="bozza">Bozza</option>
                <option value="verificato">Verificato</option>
              </select>
            </div>
            <div className="toolbar__actions">
              <button
                type="button"
                className="btn btn--primary btn--sm"
                onClick={() =>
                  requireSession("Accedi per inserire un componente.")
                    ? setComponentDraft("new")
                    : null
                }
              >
                + Componente
              </button>
              <a className="btn btn--ghost btn--sm" href={exportHref}>
                Esporta
              </a>
            </div>
          </div>

          <div className="panel panel--table">
            <div className="table-wrap">
              <table className="data">
                <thead>
                  <tr>
                    <th>Codice</th>
                    <th>Descrizione</th>
                    <th className="num">Q.tà</th>
                    <th className="num">€ / unità</th>
                    <th className="num">€ totale</th>
                    <th className="num">CO₂e / unità</th>
                    <th className="num">CO₂e totale</th>
                    <th>Stato</th>
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
                          if (requireSession("Accedi per modificare i componenti.")) {
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
                            title="Cambia stato di verifica"
                          >
                            <span className="chip__dot" aria-hidden="true" />
                            {component.status}
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
                        {num(filtered.length)} {filtered.length === 1 ? "componente" : "componenti"}
                        {filtered.length !== components.length ? ` (filtrati da ${num(components.length)})` : ""}
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
                  {components.length === 0 ? "Il registro è vuoto" : "Nessun componente con questi filtri"}
                </p>
                <p className="empty__text">
                  {components.length === 0
                    ? "Crea un assieme, poi aggiungi i componenti con costo unitario e CO₂e. Da lì la dashboard si popola da sola."
                    : "Prova a rimuovere uno dei filtri o a cambiare la ricerca."}
                </p>
              </div>
            ) : null}
          </div>
        </section>

        <footer className="footer">
          <span>Poliba Corse · Cost Management</span>
          <span>
            <Link href="/">Panoramica pubblica</Link> · <a href={exportHref}>Excel</a>
          </span>
        </footer>
      </main>

      {authOpen ? (
        <AuthDialog
          onClose={() => setAuthOpen(false)}
          teams={teams}
          reason={authReason ?? "Accedi per inserire e modificare i dati del registro."}
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
        <p className="empty__title">Nessun sistema</p>
        <p className="empty__text">Esegui supabase/schema.sql per caricare gli otto sistemi ufficiali.</p>
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
