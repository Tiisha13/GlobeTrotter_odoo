import { createContext, useContext, useMemo, useState } from "react";
import { LocaleCode } from "@/types";
import { getLanguage, setLanguage } from "@/lib/storage";

type Messages = Record<string, string>;

const messages: Record<LocaleCode, Messages> = {
  en: {
    startPlanning: "Start Planning",
    viewTrips: "View My Trips",
    planNewTrip: "Plan New Trip",
    budgetSnapshot: "Budget snapshot",
    recentTrips: "Recent trips",
  },
  es: {
    startPlanning: "Comenzar planificación",
    viewTrips: "Ver mis viajes",
    planNewTrip: "Planear nuevo viaje",
    budgetSnapshot: "Resumen de presupuesto",
    recentTrips: "Viajes recientes",
  },
  fr: {
    startPlanning: "Commencer à planifier",
    viewTrips: "Voir mes voyages",
    planNewTrip: "Planifier un nouveau voyage",
    budgetSnapshot: "Aperçu du budget",
    recentTrips: "Voyages récents",
  },
};

type I18nContextValue = {
  locale: LocaleCode;
  t: (key: keyof typeof messages['en']) => string;
  setLocale: (l: LocaleCode) => void;
};

const I18nContext = createContext<I18nContextValue | undefined>(undefined);

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within I18nProvider");
  return ctx;
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<LocaleCode>(getLanguage());

  const t = (key: keyof typeof messages['en']) => messages[locale][key] ?? messages['en'][key] ?? key;

  const setLocale = (l: LocaleCode) => {
    setLocaleState(l);
    setLanguage(l);
  };

  const value = useMemo(() => ({ locale, t, setLocale }), [locale]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}


