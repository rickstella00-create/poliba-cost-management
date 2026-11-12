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
          <p className="eyebrow">
            <span className="eyebrow__num">01</span>Formula Student · Politecnico di Bari
          </p>
          <h1 className="display">
            Ogni pezzo ha un prezzo.
            <br />
            <span className="display__accent">Ogni pezzo lascia una traccia.</span>
          </h1>
          <p className="lede">
            Il registro unico di costi ed emissioni della monoposto. Gli otto sistemi inseriscono i
            componenti, il Cost Management verifica, la BOM esce in Excel quando serve.
          </p>
          <div className="hero__actions">
            <Link className="btn btn--primary" href="/registro">
              Apri il registro
            </Link>
            <a className="btn btn--ghost" href="/api/export">
              Scarica la BOM in Excel
            </a>
          </div>
          <div className="hero__meta">
            <span>PC One · 2027</span>
            <span>{num(registry.assemblies.length)} assiemi</span>
            <span>{num(registry.components.length)} componenti</span>
            <span>{num(teams.length)} divisioni</span>
          </div>
        </section>

        <section className="section">
          <div className="section__head">
            <div>
              <p className="eyebrow">
                <span className="eyebrow__num">02</span>Il numero che conta
              </p>
              <h2 className="section__title">Quanto costa, quanto pesa sull&apos;aria</h2>
            </div>
          </div>

          <div className="kpi-grid">
            <div className="kpi kpi--accent">
              <p className="kpi__label">Costo totale</p>
              <p className="kpi__value">{loading ? "—" : eur(totals.cost)}</p>
              <p className="kpi__hint">Somma dei componenti a registro</p>
            </div>
            <div className="kpi">
              <p className="kpi__label">CO₂e totale</p>
              <p className="kpi__value">{loading ? "—" : kg(totals.co2)}</p>
              <p className="kpi__hint">Cradle-to-gate, dato per dato</p>
            </div>
            <div className="kpi">
              <p className="kpi__label">Componenti</p>
              <p className="kpi__value">{loading ? "—" : num(totals.components)}</p>
              <p className="kpi__hint">{num(totals.verified)} già verificati</p>
            </div>
          </div>
        </section>

        <section className="section">
          <div className="section__head">
            <div>
              <p className="eyebrow">
                <span className="eyebrow__num">03</span>Gli otto sistemi
              </p>
              <h2 className="section__title">Come si divide la monoposto</h2>
              <p className="section__note">
                Ogni assieme appartiene a uno di questi sistemi: è la stessa suddivisione che i giudici
                del Cost event si aspettano di trovare.
              </p>
            </div>
          </div>

          <ul className="cards">
            {systems.map((system) => (
              <li key={system.id}>
                <span className="cards__code">{system.code}</span>
                <span className="cards__name">{system.name}</span>
              </li>
            ))}
            {systems.length === 0 && !loading ? <li>Nessun sistema caricato.</li> : null}
          </ul>
        </section>

        <footer className="footer">
          <span>Poliba Corse · Cost Management</span>
          <span>Politecnico di Bari · dal 2006</span>
        </footer>
      </main>
    </>
  );
}
