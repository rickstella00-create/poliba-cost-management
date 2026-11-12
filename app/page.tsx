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
          <h1 className="display">Cost and emissions registry</h1>
          <p className="lede">
            One place where every team records the car&apos;s components with their cost and emissions.
            Internal site: anyone with the link can add and edit data, and export it to Excel when
            needed.
          </p>
          <div className="hero__actions">
            <Link className="btn btn--primary" href="/registry">
              Open the registry
            </Link>
            <a className="btn" href="/api/export">
              Download Excel
            </a>
          </div>
          <div className="hero__meta">
            <span>{num(registry.assemblies.length)} assemblies</span>
            <span>{num(registry.components.length)} components</span>
            <span>{num(teams.length)} teams</span>
            <span>{num(systems.length)} systems</span>
          </div>
        </section>

        <section className="section">
          <div className="section__head">
            <div>
              <h2 className="section__title">Current totals</h2>
              <p className="section__note">Calculated from the components entered in their assemblies.</p>
            </div>
          </div>

          <div className="kpi-grid">
            <div className="kpi kpi--accent">
              <p className="kpi__label">Total cost</p>
              <p className="kpi__value">{loading ? "—" : eur(totals.cost)}</p>
            </div>
            <div className="kpi">
              <p className="kpi__label">Total CO₂e</p>
              <p className="kpi__value">{loading ? "—" : kg(totals.co2)}</p>
            </div>
            <div className="kpi">
              <p className="kpi__label">Components</p>
              <p className="kpi__value">{loading ? "—" : num(totals.components)}</p>
            </div>
            <div className="kpi">
              <p className="kpi__label">Verified</p>
              <p className="kpi__value">
                {loading ? "—" : `${num(totals.verified)} / ${num(totals.components)}`}
              </p>
            </div>
          </div>
        </section>

        <section className="section">
          <div className="section__head">
            <div>
              <h2 className="section__title">Systems</h2>
              <p className="section__note">Every assembly belongs to one of these systems.</p>
            </div>
          </div>

          <ul className="cards">
            {systems.map((system) => (
              <li key={system.id}>
                <span className="cards__name">{system.name}</span>
              </li>
            ))}
            {systems.length === 0 && !loading ? <li>No systems loaded.</li> : null}
          </ul>
        </section>

        <footer className="footer">
          <span>Cost and emissions registry</span>
          <span>Internal team use</span>
        </footer>
      </main>
    </>
  );
}
