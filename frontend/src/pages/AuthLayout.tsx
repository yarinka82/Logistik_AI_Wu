
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import "./LoginPage.css";

const LANGS = ["de", "en", "uk"] as const;

interface AuthLayoutProps {
  children: ReactNode;
  heroTitleKey: string;
  heroSubtitleKey: string;
}

export function AuthLayout({ children, heroTitleKey, heroSubtitleKey }: AuthLayoutProps) {
  const { t, i18n } = useTranslation();

  return (
    <div className="stage">
      <div className="map-panel">
        <svg className="route-svg" viewBox="0 0 600 700" preserveAspectRatio="xMidYMid slice">
          <path
            className="route-path"
            d="M 210 134 C 150 220, 90 260, 81 330 C 75 355, 120 375, 154 392 C 200 430, 260 480, 277 540"
          />
          <path className="route-path secondary" d="M 210 134 C 260 150, 320 170, 355 211" />

          <circle className="beacon-dot" cx="210" cy="134" r="4.5" />
          <circle className="beacon-pulse" cx="210" cy="134" r="4.5" />
          <text className="city-label" x="222" y="132">Hamburg</text>
          <text className="city-sub" x="222" y="145">53.551N 9.993E</text>

          <circle className="node-teal" cx="154" cy="392" r="3.5" />
          <text className="city-label" x="166" y="390">Frankfurt</text>
          <text className="city-sub" x="166" y="403">50.110N 8.682E</text>

          <circle className="node-teal" cx="81" cy="330" r="3.5" />
          <text className="city-label" x="15" y="325">Köln</text>
          <text className="city-sub" x="15" y="338">50.938N 6.960E</text>

          <circle className="beacon-dot" cx="355" cy="211" r="5" />
          <circle className="beacon-pulse" cx="355" cy="211" r="5" style={{ animationDelay: "1.2s" }} />
          <text className="city-label" x="367" y="209">Berlin</text>
          <text className="city-sub" x="367" y="222">52.520N 13.405E · Ziel</text>

          <circle className="node-teal" cx="277" cy="540" r="3.5" />
          <text className="city-label" x="289" y="538">München</text>
          <text className="city-sub" x="289" y="551">48.137N 11.576E</text>
        </svg>

        <div className="top-row">
          <div className="brand">
            Fracht<span>.</span>Markt
          </div>
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
        </div>

          <div className="map-copy">
            <h1>{t(heroTitleKey)}</h1>
            <p>{t(heroSubtitleKey)}</p>
          </div>
          <div className="map-footer">
            <div><strong>1.240+</strong>{t("auth.statsRequests")}</div>
            <div><strong>380</strong>{t("auth.statsDrivers")}</div>
            <div><strong>16</strong>{t("auth.statsCoverage")}</div>
          </div>
        </div>
          <div className="form-panel">
            <div className="form-wrap">{children}</div>
          </div>

    </div>
  );
}