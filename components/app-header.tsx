"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { AUTH_ENABLED } from "@/lib/config";
import { LANGS, useI18n, type Lang } from "@/lib/i18n";
import { AuthDialog } from "./dialogs";
import styles from "./language-switch.module.css";
import headerStyles from "./app-header.module.css";

const LANG_LABELS: Record<Lang, string> = { en: "EN", it: "IT" };

function LanguageSwitch() {
  const { lang, setLang, t } = useI18n();
  return (
    <div className={styles.switch} role="group" aria-label={t("lang.label")}>
      {LANGS.map((code) => (
        <button
          key={code}
          type="button"
          className={`${styles.button}${lang === code ? ` ${styles.active}` : ""}`}
          aria-pressed={lang === code}
          onClick={() => setLang(code)}
        >
          {LANG_LABELS[code]}
        </button>
      ))}
    </div>
  );
}

export function AppHeader() {
  const { t, lang } = useI18n();
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
          <Link href="/" className="brand" aria-label={t("nav.home")}>
            <span className="brand__text">
              <span className="brand__title">Cost &amp; Emissions</span>
              <span className={`brand__sub ${headerStyles.brandSub}`}>{t("brand.sub")}</span>
            </span>
          </Link>

          <nav className="nav" aria-label={t("nav.main")}>
            <Link className="nav__link" href="/registry">
              {t("nav.registry")}
            </Link>
            <Link className="nav__link" href="/registry#assemblies">
              {t("nav.assemblies")}
            </Link>
            <a className="nav__link" href={`/api/export?lang=${lang}`}>
              {t("nav.excel")}
            </a>
          </nav>

          <div className="header-actions">
            <LanguageSwitch />
            {!AUTH_ENABLED ? null : email ? (
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
                  {t("auth.signout")}
                </button>
              </>
            ) : (
              <button type="button" className="btn btn--sm" onClick={() => setAuthOpen(true)}>
                {t("auth.signin")}
              </button>
            )}
          </div>
        </div>
      </header>

      {AUTH_ENABLED && authOpen && <AuthDialog onClose={() => setAuthOpen(false)} />}
    </>
  );
}
