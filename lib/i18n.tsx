"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type Lang = "en" | "it";
export const LANGS: Lang[] = ["en", "it"];
export const LANG_STORAGE_KEY = "cost-emissions-lang";

const en = {
  "brand.sub": "single-seater data registry",
  "nav.main": "Main navigation",
  "nav.home": "Cost & Emissions, home",
  "nav.registry": "Registry",
  "nav.assemblies": "Assemblies",
  "nav.excel": "Excel",
  "auth.signin": "Sign in",
  "auth.signout": "Sign out",
  "lang.label": "Language",

  "home.title": "Cost and emissions registry",
  "home.lede":
    "One place where every team records the car's components with their cost and emissions. Internal site: anyone with the link can add and edit data, and export it to Excel when needed.",
  "home.open": "Open the registry",
  "home.download": "Download Excel",
  "home.meta.assemblies": "assemblies",
  "home.meta.components": "components",
  "home.meta.teams": "teams",
  "home.meta.systems": "systems",
  "home.totals": "Current totals",
  "home.totals.note": "Calculated from the components entered in their assemblies.",
  "home.systems": "Systems",
  "home.systems.note": "Every assembly belongs to one of these systems.",
  "home.systems.empty": "No systems loaded.",
  "footer.registry": "Cost and emissions registry",
  "footer.internal": "Internal team use",

  "kpi.totalCost": "Total cost",
  "kpi.totalCo2": "Total CO₂e",
  "kpi.components": "Components",
  "kpi.verified": "Verified",
  "kpi.componentsHint.one": "component in the registry",
  "kpi.componentsHint.many": "components in the registry",
  "kpi.co2Note": "Sum of the values entered by the teams",
  "kpi.verifiedNote": "{verified} of {total} checked by Cost Management",
  "kpi.assemblies": "Assemblies",
  "kpi.assemblies.none": "No assemblies yet",
  "kpi.assemblies.systems": "across {count} systems",

  "db.empty": "The database is empty: run supabase/schema.sql once in the Supabase SQL editor.",
  "banner.experimental":
    "Experimental phase: the site is open, anyone with the link can add and edit data. Email sign-in is already wired up and will be switched on later.",

  "overview.eyebrow": "Overview",
  "overview.title": "Cost and weight of the car",
  "overview.note":
    "Totals come from the components entered by the teams. Editing a verified row puts it back to draft.",
  "action.exportExcel": "Export Excel",

  "panel.costBySystem": "Cost by system",
  "panel.co2BySystem": "CO₂e by system",
  "panel.teamStatus": "Team status",
  "panel.divisions": "{count} divisions",

  "col.team": "Team",
  "col.components": "Components",
  "col.cost": "Cost",
  "col.co2": "CO₂e",
  "col.verified": "Verified",
  "col.lastUpdate": "Last update",
  "col.total": "Total",
  "col.assembly": "Assembly",
  "col.system": "System",
  "col.status": "Status",
  "col.actions": "Actions",
  "col.code": "Code",
  "col.description": "Description",
  "col.qty": "Qty",
  "col.unitCost": "€ / unit",
  "col.totalCost": "Total €",
  "col.unitCo2": "CO₂e / unit",
  "col.totalCo2": "Total CO₂e",

  "empty.teams.title": "No teams in the database",
  "empty.teams.text": "Run supabase/schema.sql to load systems and divisions.",
  "assemblies.eyebrow": "Assemblies",
  "assemblies.title": "One assembly per group of parts",
  "assemblies.note":
    "Every assembly belongs to one official system and one team. Components live inside the assembly.",
  "action.newAssembly": "+ New assembly",
  "action.addComponentInline": "+ component",
  "empty.assemblies.title": "No assemblies yet",
  "empty.assemblies.text":
    "Start from the groups you know best: front suspension, chassis, brake system. Each assembly collects its components with cost and emissions.",

  "components.eyebrow": "Components registry",
  "components.title": "The BOM, piece by piece",
  "components.note": "Search, filter and export. Total cost and total CO₂e are quantity × unit value.",
  "search.placeholder": "Search description, code, material, supplier…",
  "search.aria": "Search components",
  "filter.system": "Filter by system",
  "filter.allSystems": "All systems",
  "filter.team": "Filter by team",
  "filter.allTeams": "All teams",
  "filter.assembly": "Filter by assembly",
  "filter.allAssemblies": "All assemblies",
  "filter.status": "Filter by status",
  "filter.anyStatus": "Any status",
  "action.addComponent": "+ Component",
  "action.export": "Export",
  "footer.count.one": "{count} component",
  "footer.count.many": "{count} components",
  "footer.filtered": "(filtered from {total})",
  "empty.registry.title": "The registry is empty",
  "empty.registry.text":
    "Create an assembly, then add its components with unit cost and CO₂e. The dashboard fills in from there.",
  "empty.filters.title": "No components match these filters",
  "empty.filters.text": "Try removing one of the filters or changing the search.",
  "footer.overview": "Overview",

  "status.draft": "Draft",
  "status.verified": "Verified",
  "status.change": "Change verification status",

  "flash.componentAdded": "Component added.",
  "flash.componentUpdated": "Component updated.",
  "flash.componentDeleted": "Component deleted.",
  "flash.componentVerified": "Component verified.",
  "flash.backToDraft": "Back to draft.",
  "flash.assemblyCreated": "Assembly created.",
  "flash.assemblyUpdated": "Assembly updated.",
  "flash.assemblyDeleted": "Assembly deleted.",

  "error.permission": "Permission denied: sign in to edit the data.",
  "error.duplicate": "An assembly with this name already exists in that system.",
  "error.signInToSave": "Sign in to save.",
  "error.description": "The description is required.",
  "error.assembly": "Choose the assembly this component belongs to.",
  "error.name": "The assembly name is required.",
  "error.system": "Choose the system.",
  "error.team": "Choose the responsible team.",
  "signin.reason": "Sign in to edit the registry data.",

  "modal.close": "Close",
  "btn.delete": "Delete",
  "btn.cancel": "Cancel",
  "btn.save": "Save",
  "btn.saving": "Saving…",

  "comp.new.eyebrow": "New component",
  "comp.edit.eyebrow": "Edit component",
  "comp.new.title": "Add a component",
  "asm.new.eyebrow": "New assembly",
  "asm.edit.eyebrow": "Edit assembly",
  "asm.new.title": "Add an assembly",

  "field.assembly": "Assembly",
  "option.chooseAssembly": "— choose an assembly —",
  "field.code": "Part code",
  "field.description": "Description",
  "field.quantity": "Quantity",
  "field.unitCost": "Unit cost (€)",
  "field.material": "Material",
  "field.mass": "Unit mass (kg)",
  "field.process": "Process",
  "field.sourcing": "Make / Buy",
  "option.make": "Make (in-house)",
  "option.buy": "Buy (purchased)",
  "field.supplier": "Supplier",
  "field.co2unit": "CO₂e per unit (kg)",
  "field.co2unit.hint": "Value for a single part: the registry calculates the total.",
  "field.co2source": "CO₂e source",
  "field.co2source.hint": "Datasheet, supplier LCA, reference standard.",
  "field.notes": "Notes",
  "field.assemblyName": "Assembly name",
  "field.system": "System",
  "field.team": "Team",
  "option.choose": "— choose —",
  "placeholder.description": "Upper wishbone",
  "placeholder.process": "Laser cutting + TIG welding",
  "placeholder.co2source": "Supplier EPD 2025",
  "placeholder.notes": "Constraints, alternatives considered, references.",
  "placeholder.assemblyName": "Front suspension",
  "confirm.deleteComponent": 'Delete "{name}"? This cannot be undone.',
  "confirm.deleteAssembly": 'Delete the assembly "{name}" and all its components? This cannot be undone.',
  "note.lastEdited": "Last edited by {email}. Editing a verified row puts it back to draft.",

  "auth.eyebrow": "Access",
  "auth.login.title": "Sign in to the registry",
  "auth.signup.title": "Create your account",
  "auth.toSignup": "No account? Sign up",
  "auth.toLogin": "Already have an account? Sign in",
  "auth.wait": "Please wait…",
  "auth.signup": "Sign up",
  "auth.email": "Email",
  "auth.password": "Password",
  "auth.password.hint": "At least 6 characters.",
  "auth.team": "Your team",
  "auth.team.hint": "Only used to personalise the view: it does not limit what you can edit.",
  "auth.badCredentials": "Wrong email or password. If this is your first visit, sign up.",
  "auth.created": "Account created. Check your inbox for the confirmation link.",
} as const;

export type MessageKey = keyof typeof en;

const it: Record<MessageKey, string> = {
  "brand.sub": "registro dati monoposto",
  "nav.main": "Navigazione principale",
  "nav.home": "Cost & Emissions, home",
  "nav.registry": "Registro",
  "nav.assemblies": "Assiemi",
  "nav.excel": "Excel",
  "auth.signin": "Accedi",
  "auth.signout": "Esci",
  "lang.label": "Lingua",

  "home.title": "Registro costi ed emissioni",
  "home.lede":
    "Un unico posto dove ogni team inserisce i componenti della monoposto con costo ed emissioni. Sito interno: chi ha il link inserisce e modifica i dati direttamente, e li esporta in Excel quando serve.",
  "home.open": "Apri il registro",
  "home.download": "Scarica Excel",
  "home.meta.assemblies": "assiemi",
  "home.meta.components": "componenti",
  "home.meta.teams": "team",
  "home.meta.systems": "sistemi",
  "home.totals": "Totali attuali",
  "home.totals.note": "Calcolati dai componenti inseriti nei rispettivi assiemi.",
  "home.systems": "Sistemi",
  "home.systems.note": "Ogni assieme appartiene a uno di questi sistemi.",
  "home.systems.empty": "Nessun sistema caricato.",
  "footer.registry": "Registro costi ed emissioni",
  "footer.internal": "Uso interno al team",

  "kpi.totalCost": "Costo totale",
  "kpi.totalCo2": "CO₂e totale",
  "kpi.components": "Componenti",
  "kpi.verified": "Verificati",
  "kpi.componentsHint.one": "componente a registro",
  "kpi.componentsHint.many": "componenti a registro",
  "kpi.co2Note": "Somma dei valori inseriti dai team",
  "kpi.verifiedNote": "{verified} su {total} controllati dal Cost Management",
  "kpi.assemblies": "Assiemi",
  "kpi.assemblies.none": "Nessun assieme creato",
  "kpi.assemblies.systems": "su {count} sistemi",

  "db.empty": "Il database è vuoto: esegui una volta supabase/schema.sql nell'SQL Editor di Supabase.",
  "banner.experimental":
    "Fase sperimentale: il sito è aperto, chiunque abbia il link può inserire e modificare i dati. L'accesso con email resta predisposto e verrà attivato più avanti.",

  "overview.eyebrow": "Panoramica",
  "overview.title": "Il costo e il peso della monoposto",
  "overview.note":
    "Totali calcolati dai componenti inseriti dai team. Modificare un dato verificato lo riporta in bozza.",
  "action.exportExcel": "Esporta Excel",

  "panel.costBySystem": "Costo per sistema",
  "panel.co2BySystem": "CO₂e per sistema",
  "panel.teamStatus": "Stato dei team",
  "panel.divisions": "{count} divisioni",

  "col.team": "Team",
  "col.components": "Componenti",
  "col.cost": "Costo",
  "col.co2": "CO₂e",
  "col.verified": "Verificati",
  "col.lastUpdate": "Ultima modifica",
  "col.total": "Totale",
  "col.assembly": "Assieme",
  "col.system": "Sistema",
  "col.status": "Stato",
  "col.actions": "Azioni",
  "col.code": "Codice",
  "col.description": "Descrizione",
  "col.qty": "Q.tà",
  "col.unitCost": "€ / unità",
  "col.totalCost": "€ totale",
  "col.unitCo2": "CO₂e / unità",
  "col.totalCo2": "CO₂e totale",

  "empty.teams.title": "Nessun team nel database",
  "empty.teams.text": "Esegui supabase/schema.sql per caricare sistemi e divisioni.",
  "assemblies.eyebrow": "Assiemi",
  "assemblies.title": "Un assieme per ogni gruppo di pezzi",
  "assemblies.note":
    "Ogni assieme appartiene a un sistema ufficiale e a un team. I componenti vivono dentro l'assieme.",
  "action.newAssembly": "+ Nuovo assieme",
  "action.addComponentInline": "+ componente",
  "empty.assemblies.title": "Nessun assieme ancora",
  "empty.assemblies.text":
    "Inizia dai gruppi che conoscete meglio: sospensioni anteriori, telaio, impianto frenante. Ogni assieme raccoglie i suoi componenti con costo ed emissioni.",

  "components.eyebrow": "Registro componenti",
  "components.title": "La BOM, pezzo per pezzo",
  "components.note": "Cerca, filtra ed esporta. Il costo totale e la CO₂e totale sono quantità × valore unitario.",
  "search.placeholder": "Cerca descrizione, codice, materiale, fornitore…",
  "search.aria": "Cerca componenti",
  "filter.system": "Filtra per sistema",
  "filter.allSystems": "Tutti i sistemi",
  "filter.team": "Filtra per team",
  "filter.allTeams": "Tutti i team",
  "filter.assembly": "Filtra per assieme",
  "filter.allAssemblies": "Tutti gli assiemi",
  "filter.status": "Filtra per stato",
  "filter.anyStatus": "Ogni stato",
  "action.addComponent": "+ Componente",
  "action.export": "Esporta",
  "footer.count.one": "{count} componente",
  "footer.count.many": "{count} componenti",
  "footer.filtered": "(filtrati da {total})",
  "empty.registry.title": "Il registro è vuoto",
  "empty.registry.text":
    "Crea un assieme, poi aggiungi i componenti con costo unitario e CO₂e. Da lì la dashboard si popola da sola.",
  "empty.filters.title": "Nessun componente con questi filtri",
  "empty.filters.text": "Prova a rimuovere uno dei filtri o a cambiare la ricerca.",
  "footer.overview": "Panoramica",

  "status.draft": "Bozza",
  "status.verified": "Verificato",
  "status.change": "Cambia stato di verifica",

  "flash.componentAdded": "Componente aggiunto.",
  "flash.componentUpdated": "Componente aggiornato.",
  "flash.componentDeleted": "Componente eliminato.",
  "flash.componentVerified": "Componente verificato.",
  "flash.backToDraft": "Riportato in bozza.",
  "flash.assemblyCreated": "Assieme creato.",
  "flash.assemblyUpdated": "Assieme aggiornato.",
  "flash.assemblyDeleted": "Assieme eliminato.",

  "error.permission": "Permesso negato: accedi per modificare i dati.",
  "error.duplicate": "Esiste già un assieme con questo nome nello stesso sistema.",
  "error.signInToSave": "Accedi per salvare.",
  "error.description": "La descrizione è obbligatoria.",
  "error.assembly": "Scegli l'assieme a cui appartiene il componente.",
  "error.name": "Il nome dell'assieme è obbligatorio.",
  "error.system": "Scegli il sistema.",
  "error.team": "Scegli il team responsabile.",
  "signin.reason": "Accedi per modificare i dati del registro.",

  "modal.close": "Chiudi",
  "btn.delete": "Elimina",
  "btn.cancel": "Annulla",
  "btn.save": "Salva",
  "btn.saving": "Salvo…",

  "comp.new.eyebrow": "Nuovo componente",
  "comp.edit.eyebrow": "Modifica componente",
  "comp.new.title": "Aggiungi un componente",
  "asm.new.eyebrow": "Nuovo assieme",
  "asm.edit.eyebrow": "Modifica assieme",
  "asm.new.title": "Aggiungi un assieme",

  "field.assembly": "Assieme",
  "option.chooseAssembly": "— scegli un assieme —",
  "field.code": "Codice parte",
  "field.description": "Descrizione",
  "field.quantity": "Quantità",
  "field.unitCost": "Costo unitario (€)",
  "field.material": "Materiale",
  "field.mass": "Massa unitaria (kg)",
  "field.process": "Processo",
  "field.sourcing": "Make / Buy",
  "option.make": "Make (in casa)",
  "option.buy": "Buy (comprato)",
  "field.supplier": "Fornitore",
  "field.co2unit": "CO₂e unitario (kg)",
  "field.co2unit.hint": "Valore per singolo pezzo: il totale lo calcola il registro.",
  "field.co2source": "Fonte CO₂e",
  "field.co2source.hint": "Datasheet, LCA del fornitore, norma di riferimento.",
  "field.notes": "Note",
  "field.assemblyName": "Nome assieme",
  "field.system": "Sistema",
  "field.team": "Team",
  "option.choose": "— scegli —",
  "placeholder.description": "Braccio oscillante superiore",
  "placeholder.process": "Taglio laser + saldatura TIG",
  "placeholder.co2source": "EPD fornitore 2025",
  "placeholder.notes": "Vincoli, alternative valutate, riferimenti.",
  "placeholder.assemblyName": "Sospensioni anteriori",
  "confirm.deleteComponent": 'Eliminare "{name}"? L\'operazione non si può annullare.',
  "confirm.deleteAssembly":
    'Eliminare l\'assieme "{name}" e tutti i suoi componenti? L\'operazione non si può annullare.',
  "note.lastEdited":
    "Ultima modifica di {email}. Modificare un dato verificato lo riporta in bozza.",

  "auth.eyebrow": "Accesso",
  "auth.login.title": "Entra nel registro",
  "auth.signup.title": "Crea il tuo account",
  "auth.toSignup": "Non hai un account? Registrati",
  "auth.toLogin": "Hai già un account? Accedi",
  "auth.wait": "Attendi…",
  "auth.signup": "Registrati",
  "auth.email": "Email",
  "auth.password": "Password",
  "auth.password.hint": "Almeno 6 caratteri.",
  "auth.team": "Il tuo team",
  "auth.team.hint": "Serve solo a personalizzare la vista, non limita cosa puoi modificare.",
  "auth.badCredentials": "Email o password non corretti. Se è il primo accesso, registrati.",
  "auth.created": "Account creato. Controlla la posta: ti abbiamo inviato il link di conferma.",
};

export const messages: Record<Lang, Record<MessageKey, string>> = { en, it };

type Vars = Record<string, string | number>;

function format(template: string, vars?: Vars): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in vars ? String(vars[key]) : match,
  );
}

type I18n = {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (key: MessageKey, vars?: Vars) => string;
  eur: (value: number | null | undefined, precise?: boolean) => string;
  kg: (value: number | null | undefined) => string;
  num: (value: number | null | undefined) => string;
  pct: (value: number) => string;
  date: (value: string | null | undefined) => string;
  statusLabel: (status: string) => string;
};

const I18nContext = createContext<I18n | null>(null);

function detectInitialLang(): Lang {
  if (typeof window === "undefined") return "en";
  const stored = window.localStorage.getItem(LANG_STORAGE_KEY);
  if (stored === "it" || stored === "en") return stored;
  const browser = window.navigator.language?.toLowerCase() ?? "en";
  return browser.startsWith("it") ? "it" : "en";
}

export function LangProvider({ children }: { children: ReactNode }) {
  // The server renders English; the stored/browser choice is applied on mount.
  const [lang, setLangState] = useState<Lang>("en");

  useEffect(() => {
    setLangState(detectInitialLang());
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const value = useMemo<I18n>(() => {
    const locale = lang === "it" ? "it-IT" : "en-GB";
    const money = new Intl.NumberFormat(locale, {
      style: "currency",
      currency: "EUR",
      maximumFractionDigits: 0,
    });
    const moneyPrecise = new Intl.NumberFormat(locale, {
      style: "currency",
      currency: "EUR",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    const weight = new Intl.NumberFormat(locale, { minimumFractionDigits: 1, maximumFractionDigits: 1 });
    const plain = new Intl.NumberFormat(locale, { maximumFractionDigits: 2 });
    const date = new Intl.DateTimeFormat(locale, { day: "2-digit", month: "short", year: "numeric" });
    const dict = messages[lang];

    return {
      lang,
      setLang: (next: Lang) => {
        setLangState(next);
        try {
          window.localStorage.setItem(LANG_STORAGE_KEY, next);
        } catch {
          // Storage can be unavailable: the choice still applies for this visit.
        }
      },
      t: (key, vars) => format(dict[key], vars),
      eur: (value, precise = false) => (precise ? moneyPrecise : money).format(Number(value ?? 0)),
      kg: (value) => `${weight.format(Number(value ?? 0))} kg`,
      num: (value) => plain.format(Number(value ?? 0)),
      pct: (value) => `${Math.round(value)}%`,
      date: (value) => {
        if (!value) return "—";
        const parsed = new Date(value);
        return Number.isNaN(parsed.getTime()) ? "—" : date.format(parsed);
      },
      statusLabel: (status) => (status === "verificato" ? dict["status.verified"] : dict["status.draft"]),
    };
  }, [lang]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18n {
  const context = useContext(I18nContext);
  if (!context) throw new Error("useI18n must be used inside LangProvider");
  return context;
}
