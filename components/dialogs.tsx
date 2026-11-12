"use client";

import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { supabase } from "@/lib/supabase";
import type { AssemblyRowDraft, ComponentDraft, Assembly, ComponentRow, TeamRow } from "@/lib/types";
import type { SystemRow } from "@/lib/types";

/* ------------------------------------------------------------------ modal */

export function Modal({
  eyebrow,
  title,
  children,
  footer,
  onClose,
  wide,
}: {
  eyebrow: string;
  title: string;
  children: ReactNode;
  footer: ReactNode;
  onClose: () => void;
  wide?: boolean;
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [onClose]);

  if (!mounted) return null;

  return createPortal(
    <div
      className="modal-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        style={wide ? { width: "min(860px, 100%)" } : undefined}
      >
        <div className="modal__head">
          <div>
            <p className="eyebrow">{eyebrow}</p>
            <h2 className="modal__title">{title}</h2>
          </div>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Chiudi">
            ✕
          </button>
        </div>
        <div className="modal__body">{children}</div>
        <div className="modal__foot">{footer}</div>
      </div>
    </div>,
    document.body,
  );
}

function Field({
  label,
  hint,
  children,
  full,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
  full?: boolean;
}) {
  return (
    <label className={`field${full ? " field--full" : ""}`}>
      <span className="field__label">{label}</span>
      {children}
      {hint ? <span className="field__hint">{hint}</span> : null}
    </label>
  );
}

/* ------------------------------------------------------------------- auth */

export function AuthDialog({
  onClose,
  teams,
  reason,
}: {
  onClose: () => void;
  teams?: TeamRow[];
  reason?: string;
}) {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [teamId, setTeamId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setNotice(null);

    if (mode === "login") {
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (signInError) {
        setError(
          signInError.message === "Invalid login credentials"
            ? "Email o password non corretti. Se è il primo accesso, registrati."
            : signInError.message,
        );
        setBusy(false);
        return;
      }
      setBusy(false);
      onClose();
      return;
    }

    const { data, error: signUpError } = await supabase.auth.signUp({ email, password });
    if (signUpError) {
      setError(signUpError.message);
      setBusy(false);
      return;
    }

    if (data.user && teamId) {
      await supabase.from("profiles").update({ team_id: teamId }).eq("id", data.user.id);
    }

    if (!data.session) {
      setNotice("Account creato. Controlla la posta: ti abbiamo inviato il link di conferma.");
      setBusy(false);
      return;
    }

    setBusy(false);
    onClose();
  }

  return (
    <Modal
      eyebrow="Accesso"
      title={mode === "login" ? "Entra nel registro" : "Crea il tuo account"}
      onClose={onClose}
      footer={
        <>
          <button
            type="button"
            className="btn btn--quiet btn--sm"
            onClick={() => {
              setMode(mode === "login" ? "signup" : "login");
              setError(null);
              setNotice(null);
            }}
          >
            {mode === "login" ? "Non hai un account? Registrati" : "Hai già un account? Accedi"}
          </button>
          <div className="modal__actions">
            <button type="submit" form="auth-form" className="btn btn--primary" disabled={busy}>
              {busy ? "Attendi…" : mode === "login" ? "Accedi" : "Registrati"}
            </button>
          </div>
        </>
      }
    >
      {reason ? <p className="form-note">{reason}</p> : null}

      <form id="auth-form" onSubmit={submit} className="form-grid" style={{ marginTop: 16 }}>
        <Field label="Email" full>
          <input
            className="input"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="nome@poliba.it"
          />
        </Field>
        <Field label="Password" hint="Almeno 6 caratteri." full>
          <input
            className="input"
            type="password"
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            required
            minLength={6}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </Field>
        {mode === "signup" && teams && teams.length > 0 ? (
          <Field label="Il tuo team" hint="Serve solo a personalizzare la vista, non limita cosa puoi modificare." full>
            <select className="select" value={teamId} onChange={(event) => setTeamId(event.target.value)}>
              <option value="">— scegli —</option>
              {teams.map((team) => (
                <option key={team.id} value={team.id}>
                  {team.name}
                </option>
              ))}
            </select>
          </Field>
        ) : null}
      </form>

      {error ? <p className="form-error">{error}</p> : null}
      {notice ? <p className="form-ok">{notice}</p> : null}
    </Modal>
  );
}

/* -------------------------------------------------------------- componente */

const emptyComponent = (assemblyId: string): ComponentDraft => ({
  assembly_id: assemblyId,
  code: "",
  description: "",
  quantity: "1",
  unit_cost: "0",
  material: "",
  mass_kg: "",
  process: "",
  sourcing: "",
  supplier: "",
  co2e_unit: "0",
  co2e_source: "",
  notes: "",
});

export function ComponentDialog({
  component,
  defaultAssemblyId,
  assemblies,
  onClose,
  onSubmit,
  onDelete,
}: {
  component: ComponentRow | null;
  defaultAssemblyId: string;
  assemblies: Assembly[];
  onClose: () => void;
  onSubmit: (draft: ComponentDraft) => Promise<string | null>;
  onDelete?: (id: string) => Promise<string | null>;
}) {
  const [draft, setDraft] = useState<ComponentDraft>(
    component
      ? {
          id: component.id,
          assembly_id: component.assembly_id,
          code: component.code ?? "",
          description: component.description,
          quantity: String(component.quantity),
          unit_cost: String(component.unit_cost),
          material: component.material ?? "",
          mass_kg: component.mass_kg === null ? "" : String(component.mass_kg),
          process: component.process ?? "",
          sourcing: component.sourcing ?? "",
          supplier: component.supplier ?? "",
          co2e_unit: String(component.co2e_unit),
          co2e_source: component.co2e_source ?? "",
          notes: component.notes ?? "",
        }
      : emptyComponent(defaultAssemblyId),
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = <K extends keyof ComponentDraft>(key: K, value: ComponentDraft[K]) =>
    setDraft((current) => ({ ...current, [key]: value }));

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    const message = await onSubmit(draft);
    setBusy(false);
    if (message) setError(message);
    else onClose();
  }

  async function remove() {
    if (!component || !onDelete) return;
    if (!window.confirm(`Eliminare "${component.description}"? L'operazione non si può annullare.`)) return;
    setBusy(true);
    const message = await onDelete(component.id);
    setBusy(false);
    if (message) setError(message);
    else onClose();
  }

  return (
    <Modal
      eyebrow={component ? "Modifica componente" : "Nuovo componente"}
      title={component ? component.description : "Aggiungi un componente"}
      onClose={onClose}
      wide
      footer={
        <>
          {component && onDelete ? (
            <button type="button" className="btn btn--danger btn--sm" onClick={remove} disabled={busy}>
              Elimina
            </button>
          ) : (
            <span />
          )}
          <div className="modal__actions">
            <button type="button" className="btn btn--ghost" onClick={onClose} disabled={busy}>
              Annulla
            </button>
            <button type="submit" form="component-form" className="btn btn--primary" disabled={busy}>
              {busy ? "Salvo…" : "Salva"}
            </button>
          </div>
        </>
      }
    >
      <form id="component-form" onSubmit={submit} className="form-grid">
        <Field label="Assieme" full>
          <select
            className="select"
            required
            value={draft.assembly_id}
            onChange={(event) => set("assembly_id", event.target.value)}
          >
            <option value="">— scegli un assieme —</option>
            {assemblies.map((assembly) => (
              <option key={assembly.id} value={assembly.id}>
                {assembly.name}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Codice parte">
          <input
            className="input"
            value={draft.code}
            onChange={(event) => set("code", event.target.value)}
            placeholder="SUS-014"
          />
        </Field>

        <Field label="Descrizione" full>
          <input
            className="input"
            required
            value={draft.description}
            onChange={(event) => set("description", event.target.value)}
            placeholder="Braccio oscillante superiore"
          />
        </Field>

        <Field label="Quantità">
          <input
            className="input"
            inputMode="decimal"
            value={draft.quantity}
            onChange={(event) => set("quantity", event.target.value)}
          />
        </Field>

        <Field label="Costo unitario (€)">
          <input
            className="input"
            inputMode="decimal"
            value={draft.unit_cost}
            onChange={(event) => set("unit_cost", event.target.value)}
          />
        </Field>

        <Field label="Materiale">
          <input
            className="input"
            value={draft.material}
            onChange={(event) => set("material", event.target.value)}
            placeholder="AISI 4130"
          />
        </Field>

        <Field label="Massa unitaria (kg)">
          <input
            className="input"
            inputMode="decimal"
            value={draft.mass_kg}
            onChange={(event) => set("mass_kg", event.target.value)}
          />
        </Field>

        <Field label="Processo">
          <input
            className="input"
            value={draft.process}
            onChange={(event) => set("process", event.target.value)}
            placeholder="Taglio laser + saldatura TIG"
          />
        </Field>

        <Field label="Make / Buy">
          <select
            className="select"
            value={draft.sourcing}
            onChange={(event) => set("sourcing", event.target.value as ComponentDraft["sourcing"])}
          >
            <option value="">—</option>
            <option value="make">Make (in casa)</option>
            <option value="buy">Buy (comprato)</option>
          </select>
        </Field>

        <Field label="Fornitore">
          <input
            className="input"
            value={draft.supplier}
            onChange={(event) => set("supplier", event.target.value)}
          />
        </Field>

        <Field label="CO₂e unitario (kg)" hint="Valore per singolo pezzo: il totale lo calcola il registro.">
          <input
            className="input"
            inputMode="decimal"
            value={draft.co2e_unit}
            onChange={(event) => set("co2e_unit", event.target.value)}
          />
        </Field>

        <Field label="Fonte CO₂e" hint="Datasheet, LCA del fornitore, norma di riferimento.">
          <input
            className="input"
            value={draft.co2e_source}
            onChange={(event) => set("co2e_source", event.target.value)}
            placeholder="EPD fornitore 2025"
          />
        </Field>

        <Field label="Note" full>
          <textarea
            className="input"
            value={draft.notes}
            onChange={(event) => set("notes", event.target.value)}
            placeholder="Vincoli, alternative valutate, riferimenti."
          />
        </Field>
      </form>

      {component?.updated_by_email ? (
        <p className="form-note">
          Ultima modifica di {component.updated_by_email}. Modificare un dato verificato lo riporta in bozza.
        </p>
      ) : null}

      {error ? <p className="form-error">{error}</p> : null}
    </Modal>
  );
}

/* --------------------------------------------------------------- assieme */

export function AssemblyDialog({
  assembly,
  systems,
  teams,
  onClose,
  onSubmit,
  onDelete,
}: {
  assembly: Assembly | null;
  systems: SystemRow[];
  teams: TeamRow[];
  onClose: () => void;
  onSubmit: (draft: AssemblyRowDraft) => Promise<string | null>;
  onDelete?: (id: string) => Promise<string | null>;
}) {
  const [draft, setDraft] = useState<AssemblyRowDraft>(
    assembly
      ? {
          id: assembly.id,
          name: assembly.name,
          system_id: assembly.system_id,
          team_id: assembly.team_id,
          notes: assembly.notes ?? "",
        }
      : { name: "", system_id: "", team_id: "", notes: "" },
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = <K extends keyof AssemblyRowDraft>(key: K, value: AssemblyRowDraft[K]) =>
    setDraft((current) => ({ ...current, [key]: value }));

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    const message = await onSubmit(draft);
    setBusy(false);
    if (message) setError(message);
    else onClose();
  }

  async function remove() {
    if (!assembly || !onDelete) return;
    if (
      !window.confirm(
        `Eliminare l'assieme "${assembly.name}" e tutti i suoi componenti? L'operazione non si può annullare.`,
      )
    )
      return;
    setBusy(true);
    const message = await onDelete(assembly.id);
    setBusy(false);
    if (message) setError(message);
    else onClose();
  }

  return (
    <Modal
      eyebrow={assembly ? "Modifica assieme" : "Nuovo assieme"}
      title={assembly ? assembly.name : "Aggiungi un assieme"}
      onClose={onClose}
      footer={
        <>
          {assembly && onDelete ? (
            <button type="button" className="btn btn--danger btn--sm" onClick={remove} disabled={busy}>
              Elimina
            </button>
          ) : (
            <span />
          )}
          <div className="modal__actions">
            <button type="button" className="btn btn--ghost" onClick={onClose} disabled={busy}>
              Annulla
            </button>
            <button type="submit" form="assembly-form" className="btn btn--primary" disabled={busy}>
              {busy ? "Salvo…" : "Salva"}
            </button>
          </div>
        </>
      }
    >
      <form id="assembly-form" onSubmit={submit} className="form-grid">
        <Field label="Nome assieme" full>
          <input
            className="input"
            required
            value={draft.name}
            onChange={(event) => set("name", event.target.value)}
            placeholder="Sospensioni anteriori"
          />
        </Field>
        <Field label="Sistema">
          <select
            className="select"
            required
            value={draft.system_id}
            onChange={(event) => set("system_id", event.target.value)}
          >
            <option value="">— scegli —</option>
            {systems.map((system) => (
              <option key={system.id} value={system.id}>
                {system.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Team">
          <select
            className="select"
            required
            value={draft.team_id}
            onChange={(event) => set("team_id", event.target.value)}
          >
            <option value="">— scegli —</option>
            {teams.map((team) => (
              <option key={team.id} value={team.id}>
                {team.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Note" full>
          <textarea
            className="input"
            value={draft.notes}
            onChange={(event) => set("notes", event.target.value)}
          />
        </Field>
      </form>

      {error ? <p className="form-error">{error}</p> : null}
    </Modal>
  );
}
