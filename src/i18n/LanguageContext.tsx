import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { type LangCode } from "./index";

const STORAGE_KEY = "app_language";

interface LanguageContextValue {
  lang: LangCode;
  setLang: (l: LangCode) => void;
}

const LanguageContext = createContext<LanguageContextValue>({
  lang: "en",
  setLang: () => {},
});

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<LangCode>(() => {
    const stored = localStorage.getItem(STORAGE_KEY) as LangCode | null;
    return stored ?? (navigator.language.startsWith("es") ? "es"
      : navigator.language.startsWith("zh") ? "zh"
      : navigator.language.startsWith("hi") ? "hi"
      : navigator.language.startsWith("fr") ? "fr"
      : navigator.language.startsWith("it") ? "it"
      : navigator.language.startsWith("pt-BR") ? "pt-BR"
      : navigator.language.startsWith("pt") ? "pt"
      : navigator.language.startsWith("ar") ? "ar"
      : navigator.language.startsWith("tr") ? "tr"
      : navigator.language.startsWith("ru") ? "ru"
      : navigator.language.startsWith("mr") ? "mr"
      : navigator.language.startsWith("bn") ? "bn"
      : "en");
  });

  const setLang = (l: LangCode) => {
    setLangState(l);
    localStorage.setItem(STORAGE_KEY, l);
    // RTL for Arabic
    document.documentElement.dir = l === "ar" ? "rtl" : "ltr";
  };

  useEffect(() => {
    document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
  }, [lang]);

  return (
    <LanguageContext.Provider value={{ lang, setLang }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLang() {
  return useContext(LanguageContext);
}
