
import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../auth/AuthContext";
import { Role, type RegisterPayload } from "../auth/types";
import "./LoginPage.css";

const ROLE_ORDER: Role[] = [Role.ClientCompany, Role.ClientIndividual, Role.Driver];
const LANGS = ["de", "en", "uk"] as const;

type Tab = "login" | "register";

export function LoginPage() {
  const { t, i18n } = useTranslation();
  const { login, register } = useAuth();
  const navigate = useNavigate();

  const [tab, setTab] = useState<Tab>("login");
  const [role, setRole] = useState<Role>(Role.ClientCompany);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [username, setUsername] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [edrpou, setEdrpou] = useState("");
  const [fullName, setFullName] = useState("");
  const [licenseNumber, setLicenseNumber] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      if (tab === "login") {
        await login({ email, password });
      } else {
        const payload: RegisterPayload = {
          email,
          username,
          password,
          role,
          ...(role === Role.ClientCompany && { company_name: companyName, edrpou }),
          ...(role === Role.ClientIndividual && { full_name: fullName }),
          ...(role === Role.Driver && { full_name: fullName, driver_license_number: licenseNumber }),
        };
        await register(payload);
      }
      navigate("/");
    } catch {
      setError(tab === "login" ? t("auth.loginError") : t("auth.registerError"));
    } finally {
      setSubmitting(false);
    }
  };

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
          <h1>{t("auth.heroTitle")}</h1>
          <p>{t("auth.heroSubtitle")}</p>
        </div>

        <div className="map-footer">
          <div><strong>1.240+</strong>{t("auth.statsRequests")}</div>
          <div><strong>380</strong>{t("auth.statsDrivers")}</div>
          <div><strong>16</strong>{t("auth.statsCoverage")}</div>
        </div>
      </div>

      <div className="form-panel">
        <div className="form-wrap">
          <div className="tabs">
            <div className={`tab ${tab === "login" ? "active" : ""}`} onClick={() => setTab("login")}>
              {t("auth.tabLogin")}
            </div>
            <div className={`tab ${tab === "register" ? "active" : ""}`} onClick={() => setTab("register")}>
              {t("auth.tabRegister")}
            </div>
          </div>

          <form onSubmit={handleSubmit}>
            <h2>{tab === "login" ? t("auth.welcomeBack") : t("auth.registerTitle")}</h2>
            <p className="lede">{tab === "login" ? t("auth.loginLede") : t("auth.registerLede")}</p>

            {/* ROLE SELECTION: displayed ONLY during registration */}

            {tab === "register" && (
              <div className="role-row">
                {ROLE_ORDER.map((r) => (
                  <div
                    key={r}
                    className={`role-chip ${role === r ? "selected" : ""}`}
                    onClick={() => setRole(r)}
                  >
                    {t(`auth.roles.${r}`)}
                  </div>
                ))}
              </div>
            )}

            {tab === "register" && (
              <div className="field">
                <label>{t("auth.username")}</label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  autoComplete="username"
                  required
                />
              </div>
            )}

            <div className="field">
              <label>{t("auth.emailOrUsername")}</label>
              <input
                type="text"
                placeholder={tab === "login" ? "email@example.com або username" : "sie@firma.de"}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete={tab === "login" ? "username" : "email"}
                required
              />
            </div>

            {tab === "register" && role === Role.ClientCompany && (
              <>
                <div className="field">
                  <label>{t("auth.companyName")}</label>
                  <input type="text" value={companyName} onChange={(e) => setCompanyName(e.target.value)} required />
                </div>
                <div className="field">
                  <label>{t("auth.edrpou")}</label>
                  <input type="text" value={edrpou} onChange={(e) => setEdrpou(e.target.value)} required />
                </div>
              </>
            )}

            {tab === "register" && role === Role.ClientIndividual && (
              <div className="field">
                <label>{t("auth.fullName")}</label>
                <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
              </div>
            )}

            {tab === "register" && role === Role.Driver && (
              <>
                <div className="field">
                  <label>{t("auth.fullName")}</label>
                  <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
                </div>
                <div className="field">
                  <label>{t("auth.licenseNumber")}</label>
                  <input
                    type="text"
                    value={licenseNumber}
                    onChange={(e) => setLicenseNumber(e.target.value)}
                    required
                  />
                </div>
              </>
            )}

            <div className="field">
              <label>{t("auth.password")}</label>
              <div className="password-wrap">
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete={tab === "login" ? "current-password" : "new-password"}
                  required
                />
                <button
                  type="button"
                  className="eye-btn"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "Passwort verbergen" : "Passwort anzeigen"}
                >
                  {showPassword ? "🙈" : "👁"}
                </button>
              </div>
            </div>

            {error && <p className="form-error">{error}</p>}

            <button className="submit-btn" type="submit" disabled={submitting}>
              {tab === "login" ? t("auth.login") : t("auth.tabRegister")}
            </button>

            {tab === "login" ? (
              <p className="fine-print" onClick={() => setTab("register")} style={{ cursor: "pointer" }}>
                {t("auth.noAccount")}
              </p>
            ) : (
              <p className="fine-print" onClick={() => setTab("login")} style={{ cursor: "pointer" }}>
                {t("auth.haveAccount")}
              </p>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}