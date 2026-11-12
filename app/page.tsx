"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { loadRegistry, emptyRegistry } from "@/lib/queries";
import { eur, kg, num } from "@/lib/format";
import { overallTotals } from "@/lib/metrics";
import type { Registry } from "@/lib/types";
import { AppHeader } from "@/components/app-header";

export default function HomePage() {
  const [registry, setRegistry] = useState<Registry>(emptyRegistry);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    loadRegistry(supabase).then((next) => {
      if (!alive) return;
      setRegistry(next);
      setLoading(false);
    });
    return () => {
      alive = false;
    };
  }, []);

  const totals = overallTotals(registry.components);
  const { systems, teams } = registry;

  return (
    <>
      <AppHeader />

      <main className="wrap">
        <section className="hero">
          <h1 className="display">Registro costi ed emissioni</h1>
          <p className="lede">
            Un unico posto dove ogni team inserisce i componenti della monoposto con costo ed emissioni.
            Sito interno: chi ha il link inserisce e modifica i dati direttamente, e li esporta in Excel
            quando serve.
          </p>
          <div className="hero__actions">
            <Link className="btn btn--primary" href="/registro">
              Apri il registro
            </Link>
            <a className="btn" href="/api/export">
              Scarica Excel
            </a>
          </div>
          <div className="hero__meta">
            <span>{num(registry.assemblies.length)} assiemi</span>
            <span>{num(registry.components.length)} componenti</span>
            <span>{num(teams.length)} team</span>
            <span>{num(systems.length)} sistemi</span>
          </div>
        </section>

        <section className="section">
          <div className="section__head">
            <div>
              <h2 className="section__title">Totali attuali</h2>
              <p className="section__note">Calcolati dai componenti inseriti nei rispettivi assiemi.</p>
            </div>
          </div>

          <div className="kpi-grid">
            <div className="kpi kpi--accent">
              <p className="kpi__label">Costo totale</p>
              <p className="kpi__value">{loading ? "—" : eur(totals.cost)}</p>
            </div>
            <div className="kpi">
              <p className="kpi__label">CO₂e totale</p>
              <p className="kpi__value">{loading ? "—" : kg(totals.co2)}</p>
            </div>
            <div className="kpi">
              <p className="kpi__label">Componenti</p>
              <p className="kpi__value">{loading ? "—" : num(totals.components)}</p>
            </div>
            <div className="kpi">
              <p className="kpi__label">Verificati</p>
              <p className="kpi__value">
                {loading ? "—" : `${num(totals.verified)} / ${num(totals.components)}`}
              </p>
            </div>
          </div>
        </section>

        <section className="section">
          <div className="section__head">
            <div>
              <h2 className="section__title">Sistemi</h2>
              <p className="section__note">Ogni assieme appartiene a uno di questi sistemi.</p>
            </div>
          </div>

          <ul className="cards">
            {systems.map((system) => (
              <li key={system.id}>
                <span className="cards__name">{system.name}</span>
              </li>
            ))}
            {systems.length === 0 && !loading ? <li>Nessun sistema caricato.</li> : null}
          </ul>
        </section>

        <footer className="footer">
          <span>Registro costi ed emissioni</span>
          <span>Uso interno al team</span>
        </footer>
      </main>
    </>
  );
}
