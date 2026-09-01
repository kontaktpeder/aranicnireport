import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";

export type Lang = "no" | "en";

const STORAGE_KEY = "gos.lang";

const dict = {
  // Login
  login_title: { no: "Logg inn", en: "Sign in" },
  login_sub: {
    no: "Skiftrapportering for partnere",
    en: "Shift reporting for partners",
  },
  username: { no: "Brukernavn", en: "Username" },
  password: { no: "Passord", en: "Password" },
  sign_in: { no: "LOGG INN", en: "SIGN IN" },
  signing_in: { no: "Logger inn …", en: "Signing in …" },
  login_failed: {
    no: "Feil brukernavn eller passord.",
    en: "Wrong username or password.",
  },
  login_missing: {
    no: "Fyll inn brukernavn og passord.",
    en: "Enter username and password.",
  },
  no_access: {
    no: "Kontoen din er ikke koblet til et utsalgssted. Kontakt Gold of Sicily.",
    en: "Your account is not linked to a venue. Please contact Gold of Sicily.",
  },
  sign_out: { no: "Logg ut", en: "Sign out" },

  // Report
  report_title: { no: "60 SEKUNDERS SKIFTRAPPORT", en: "60 SECOND SHIFT REPORT" },
  q_delivery: { no: "Levering", en: "Delivery" },
  delivered_intro_1: { no: "Vi leverte", en: "We delivered" },
  delivered_intro_2: { no: "stk.", en: "pcs." },
  delivery_correct_q: { no: "Fikk dere riktig antall?", en: "Did you receive the correct quantity?" },
  no_delivery: {
    no: "Ingen levering registrert ennå.",
    en: "No delivery registered yet.",
  },
  yes: { no: "JA", en: "YES" },
  no: { no: "NEI", en: "NO" },
  actual_received_q: {
    no: "Hvor mange mottok dere faktisk?",
    en: "How many did you actually receive?",
  },
  q_sales: { no: "Salg", en: "Sales" },
  sold_q: { no: "Hvor mange ble solgt dette skiftet?", en: "How many were sold this shift?" },
  q_stock: { no: "Lager nå", en: "Current stock" },
  stock_q: { no: "Hvor mange har dere igjen nå?", en: "How many are left now?" },
  q_feedback: { no: "Gjestenes tilbakemelding", en: "Guest feedback" },
  feedback_q: { no: "Hva sa gjestene?", en: "What did guests think?" },
  positive: { no: "Positivt", en: "Positive" },
  mixed: { no: "Blandet", en: "Mixed" },
  negative: { no: "Negativt", en: "Negative" },
  feedback_text_q: { no: "Noe vi burde vite?", en: "Anything we should know?" },
  optional: { no: "Valgfritt", en: "Optional" },
  q_prep: { no: "Tilberedning", en: "Preparation" },
  prep_q: { no: "Noen problemer med tilberedningen?", en: "Any preparation issues?" },
  prep_text_q: { no: "Hva skjedde?", en: "What happened?" },
  q_next: { no: "Neste behov", en: "Next requirement" },
  next_q: {
    no: "Hvor mange trenger dere til neste levering/helg?",
    en: "How many do you need for the next delivery/weekend?",
  },
  submit: { no: "SEND RAPPORT", en: "SUBMIT REPORT" },
  submitting: { no: "Sender …", en: "Sending …" },
  submit_error: {
    no: "Kunne ikke sende rapporten. Prøv igjen.",
    en: "Could not send the report. Please try again.",
  },
  success: { no: "Rapport mottatt. Takk.", en: "Report received. Thank you." },
  success_sub: {
    no: "Vi tar det videre herfra.",
    en: "We'll take it from here.",
  },
  new_report: { no: "Ny rapport", en: "New report" },

  // History
  history: { no: "Historikk", en: "History" },
  history_reports: { no: "Skiftrapporter", en: "Shift reports" },
  history_deliveries: { no: "Leveringer", en: "Deliveries" },
  history_empty: { no: "Ingenting registrert ennå.", en: "Nothing registered yet." },
  sold: { no: "Solgt", en: "Sold" },
  stock: { no: "Lager", en: "Stock" },
  next_need: { no: "Neste behov", en: "Next need" },
  pcs: { no: "stk", en: "pcs" },
  back_to_report: { no: "Til rapport", en: "To report" },

  // Admin
  dashboard: { no: "Oversikt", en: "Dashboard" },
  customers: { no: "Kunder", en: "Customers" },
  reports: { no: "Rapporter", en: "Reports" },
  deliveries: { no: "Leveringer", en: "Deliveries" },
  sold_this_week: { no: "Solgt denne uken", en: "Sold this week" },
  stock_at_customers: { no: "Lager hos kunder", en: "Current customer stock" },
  requested_next: { no: "Ønsket neste levering", en: "Requested next delivery" },
  awaiting_report: { no: "Venter på rapport", en: "Customers awaiting a report" },
  customer: { no: "Kunde", en: "Customer" },
  last_report: { no: "Siste rapport", en: "Last report" },
  current_stock: { no: "Lager nå", en: "Current stock" },
  next_requirement: { no: "Neste behov", en: "Next requirement" },
  status: { no: "Status", en: "Status" },
  overview: { no: "Oversikt", en: "Overview" },
  account: { no: "Konto", en: "Account" },
  new_customer: { no: "Ny kunde", en: "New customer" },
  customer_name: { no: "Kundenavn", en: "Customer name" },
  location: { no: "Sted", en: "Location" },
  language: { no: "Språk", en: "Language" },
  active: { no: "Aktiv", en: "Active" },
  inactive: { no: "Inaktiv", en: "Inactive" },
  save: { no: "Lagre", en: "Save" },
  create: { no: "Opprett", en: "Create" },
  cancel: { no: "Avbryt", en: "Cancel" },
  quantity: { no: "Antall", en: "Quantity" },
  date: { no: "Dato", en: "Date" },
  note: { no: "Notat", en: "Note" },
  register_delivery: { no: "Registrer levering", en: "Register delivery" },
  new_password: { no: "Nytt passord", en: "New password" },
  reset_password: { no: "Bytt passord", en: "Reset password" },
  needs_review: { no: "Til gjennomgang", en: "Needs review" },
  never: { no: "Aldri", en: "Never" },
  est_stock: { no: "Estimert lager", en: "Estimated stock" },
  latest_feedback: { no: "Siste tilbakemelding", en: "Latest guest feedback" },
  latest_prep_issue: { no: "Siste tilberedningsproblem", en: "Latest preparation issue" },
  none: { no: "Ingen", en: "None" },
  sales_this_week: { no: "Salg denne uken", en: "Sales this week" },
  no_customers: { no: "Ingen kunder ennå.", en: "No customers yet." },
  today: { no: "I dag", en: "Today" },
} satisfies Record<string, Record<Lang, string>>;

export type TranslationKey = keyof typeof dict;

type Ctx = {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (key: TranslationKey) => string;
};

const I18nContext = createContext<Ctx | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("no");

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === "no" || stored === "en") setLangState(stored);
  }, []);

  const setLang = useCallback((next: Lang) => {
    setLangState(next);
    window.localStorage.setItem(STORAGE_KEY, next);
  }, []);

  const t = useCallback((key: TranslationKey) => dict[key][lang], [lang]);

  const value = useMemo(() => ({ lang, setLang, t }), [lang, setLang, t]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used inside I18nProvider");
  return ctx;
}
