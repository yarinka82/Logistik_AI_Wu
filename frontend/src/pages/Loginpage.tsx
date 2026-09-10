
import { useState, type FormEvent } from "react";
import {Link, useNavigate} from "react-router-dom";
import { isAxiosError } from "axios";
import { useTranslation } from "react-i18next";
import { useAuth } from "../auth/AuthContext";
import { Role, type RegisterPayload } from "../auth/types";
import { toast } from "../components/Notifier"; // Укажите актуальный путь к вашему Notifier.tsx
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
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [username, setUsername] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [edrpou, setEdrpou] = useState("");
  const [fullName, setFullName] = useState("");
  const [licenseNumber, setLicenseNumber] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleTabChange = (nextTab: Tab) => {
    setTab(nextTab);
    setError(null);
    setPassword("");
    setConfirmPassword("");
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    // Валидация совпадения паролей при регистрации
    if (tab === "register" && password !== confirmPassword) {
      const mismatchMsg = t("auth.passwordMismatch", "Паролі не збігаються");
      setError(mismatchMsg);
      toast.warning(mismatchMsg);
      return;
    }

    setSubmitting(true);
    try {
      if (tab === "login") {
        await login({ email, password });
        toast.success(t("auth.loginSuccess", "Успішний вхід!"));
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
        toast.success(t("auth.registerSuccess", "Реєстрація успішна!"));
      }
      navigate("/");
      } catch (err: unknown) {
        let errMsg =
          tab === "login"
            ? t("auth.loginError", "Помилка входу")
            : t("auth.registerError", "Помилка реєстрації");

        // Безопасно проверяем, что это ошибка Axios
        if (isAxiosError(err) && err.response?.data) {
          const data = err.response.data;

          if (typeof data === "string") {
            errMsg = data;
          } else if (typeof data === "object" && data !== null) {
            if ("detail" in data && typeof data.detail === "string") {
              errMsg = data.detail;
            } else {
              errMsg = Object.values(data).flat().join(" ");
            }
          }
        } else if (err instanceof Error) {
          errMsg = err.message;
        }

        setError(errMsg);
        toast.error(errMsg);
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
            <div className={`tab ${tab === "login" ? "active" : ""}`} onClick={() => handleTabChange("login")}>
              {t("auth.tabLogin")}
            </div>
            <div className={`tab ${tab === "register" ? "active" : ""}`} onClick={() => handleTabChange("register")}>
              {t("auth.tabRegister")}
            </div>
          </div>

          <form onSubmit={handleSubmit}>
            <h2>{tab === "login" ? t("auth.welcomeBack") : t("auth.registerTitle")}</h2>
            <p className="lede">{tab === "login" ? t("auth.loginLede") : t("auth.registerLede")}</p>

            {/* Выбор роли (только при регистрации) */}
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

          {/* Username — только при регистрации */}
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

          {/* Email — только при регистрации */}
          {tab === "register" && (
            <div className="field">
              <label>{t("auth.email")}</label>
              <input
                type="email"
                placeholder="sie@firma.de"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
              />
            </div>
          )}

          {/* Email or Username — только при логине */}
          {tab === "login" && (
            <div className="field">
              <label>{t("auth.emailOrUsername")}</label>
              <input
                type="text"
                placeholder="email@example.com або username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="username"
                required
              />
            </div>
          )}

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

            {/* Поле: Пароль */}
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

            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "4px" }}>
              <Link
                to="/forgot-password"
                style={{ color: "#00d2b4", fontSize: "12px", textDecoration: "none" }}
              >
                {t("auth.forgotPasswordLink", "Забули пароль?")}
              </Link>
            </div>

            {/* Поле: Подтверждение пароля (только при регистрации) */}
            {tab === "register" && (
              <div className="field">
                <label>{t("auth.confirmPassword", "Підтвердження пароля")}</label>
                <div className="password-wrap">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    autoComplete="new-password"
                    required
                  />
                  <button
                    type="button"
                    className="eye-btn"
                    onClick={() => setShowConfirmPassword((v) => !v)}
                    aria-label={showConfirmPassword ? "Passwort verbergen" : "Passwort anzeigen"}
                  >
                    {showConfirmPassword ? "🙈" : "👁"}
                  </button>
                </div>
              </div>
            )}

            {error && <p className="form-error">{error}</p>}

            <button className="submit-btn" type="submit" disabled={submitting}>
              {tab === "login" ? t("auth.login") : t("auth.tabRegister")}
            </button>

            {tab === "login" ? (
              <p className="fine-print" onClick={() => handleTabChange("register")} style={{ cursor: "pointer" }}>
                {t("auth.noAccount")}
              </p>
            ) : (
              <p className="fine-print" onClick={() => handleTabChange("login")} style={{ cursor: "pointer" }}>
                {t("auth.haveAccount")}
              </p>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}