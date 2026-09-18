
import { useTranslation } from "react-i18next";

const LANGS = ["de", "en", "uk"] as const;

export function LanguageSwitch() {
  const { i18n } = useTranslation();

  return (
    <div className="lang-switch">
      {LANGS.map((lng) => (
        <button
          key={lng}
          type="button"
          className={i18n.resolvedLanguage === lng ? "active" : ""}
          onClick={() => void i18n.changeLanguage(lng)}
        >
          {lng.toUpperCase()}
        </button>
      ))}
    </div>
  );
}