"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { loadRegistry, emptyRegistry } from "@/lib/queries";
import { useI18n } from "@/lib/i18n";
import { overallTotals } from "@/lib/metrics";
import type { Registry } from "@/lib/types";
import { AppHeader } from "@/components/app-header";

export default function HomePage() {
  const { t, eur, kg, num } = useI18n();
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
          <h1 className="display">{t("home.title")}</h1>
          <p className="lede">{t("home.lede")}</p>
          <div className="hero__actions">
            <Link className="btn btn--primary" href="/registry">
              {t("home.open")}
            </Link>
            <a className="btn" href="/api/export">
              {t("home.download")}
            </a>
          </div>
          <div className="hero__meta">
            <span>
              {num(registry.assemblies.length)} {t("home.meta.assemblies")}
            </span>
            <span>
              {num(registry.components.length)} {t("home.meta.components")}
            </span>
            <span>
              {num(teams.length)} {t("home.meta.teams")}
            </span>
            <span>
              {num(systems.length)} {t("home.meta.systems")}
            </span>
          </div>
        </section>

        <section className="section">
          <div className="section__head">
            <div>
              <h2 className="section__title">{t("home.totals")}</h2>
              <p className="section__note">{t("home.totals.note")}</p>
            </div>
          </div>

          <div className="kpi-grid">
            <div className="kpi kpi--accent">
              <p className="kpi__label">{t("kpi.totalCost")}</p>
              <p className="kpi__value">{loading ? "—" : eur(totals.cost)}</p>
            </div>
            <div className="kpi">
              <p className="kpi__label">{t("kpi.totalCo2")}</p>
              <p className="kpi__value">{loading ? "—" : kg(totals.co2)}</p>
            </div>
            <div className="kpi">
              <p className="kpi__label">{t("kpi.components")}</p>
              <p className="kpi__value">{loading ? "—" : num(totals.components)}</p>
            </div>
            <div className="kpi">
              <p className="kpi__label">{t("kpi.verified")}</p>
              <p className="kpi__value">
                {loading ? "—" : `${num(totals.verified)} / ${num(totals.components)}`}
              </p>
            </div>
          </div>
        </section>

        <section className="section">
          <div className="section__head">
            <div>
              <h2 className="section__title">{t("home.systems")}</h2>
              <p className="section__note">{t("home.systems.note")}</p>
            </div>
          </div>

          <ul className="cards">
            {systems.map((system) => (
              <li key={system.id}>
                <span className="cards__name">{system.name}</span>
              </li>
            ))}
            {systems.length === 0 && !loading ? <li>{t("home.systems.empty")}</li> : null}
          </ul>
        </section>

        <footer className="footer">
          <span>{t("footer.registry")}</span>
          <span>{t("footer.internal")}</span>
        </footer>
      </main>
    </>
  );
}
