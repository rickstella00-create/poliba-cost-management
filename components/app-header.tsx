"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { AuthDialog } from "./dialogs";

export function AppHeader() {
  const [session, setSession] = useState<Session | null>(null);
  const [authOpen, setAuthOpen] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = supabase.auth.onAuthStateChange((_event, next) => setSession(next));
    return () => data.subscription.unsubscribe();
  }, []);

  const email = session?.user.email ?? null;

  return (
    <>
      <header className="site-header">
        <div className="wrap site-header__inner">
          <Link href="/" className="brand" aria-label="Cost & Emissions, home">
            <span className="brand__text">
              <span className="brand__title">Cost &amp; Emissions</span>
              <span className="brand__sub">registro dati monoposto</span>
            </span>
          </Link>

          <nav className="nav" aria-label="Navigazione principale">
            <Link className="nav__link" href="/registro">
              Registro
            </Link>
            <Link className="nav__link" href="/registro#assiemi">
              Assiemi
            </Link>
            <a className="nav__link" href="/api/export">
              Excel
            </a>
          </nav>

          <div className="header-actions">
            {email ? (
              <>
                <span className="session-chip" title={email}>
                  <span className="session-chip__dot" aria-hidden="true" />
                  {email}
                </span>
                <button
                  type="button"
                  className="btn btn--quiet btn--sm"
                  onClick={() => supabase.auth.signOut()}
                >
                  Esci
                </button>
              </>
            ) : (
              <button type="button" className="btn btn--sm" onClick={() => setAuthOpen(true)}>
                Accedi
              </button>
            )}
          </div>
        </div>
      </header>

      {authOpen && <AuthDialog onClose={() => setAuthOpen(false)} />}
    </>
  );
}
