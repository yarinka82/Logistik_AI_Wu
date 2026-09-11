
import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { isAxiosError } from "axios";
import { useTranslation } from "react-i18next";
import { useAuth } from "../auth/AuthContext";
import { Role, type RegisterPayload } from "../auth/types";
import { toast } from "../components/Notifier";
import { AuthLayout } from "./AuthLayout";

const ROLE_ORDER: Role[] = [Role.ClientCompany, Role.ClientIndividual, Role.Driver];

export function RegisterPage() {
  const { t } = useTranslation();
  const { register } = useAuth();
  const navigate = useNavigate();

  const [role, setRole] = useState<Role>(Role.ClientCompany);
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [companyName, setCompanyName] = useState("");
  const [edrpou, setEdrpou] = useState("");
  const [fullName, setFullName] = useState("");
  const [licenseNumber, setLicenseNumber] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      const mismatchMsg = t("auth.passwordMismatch", "Паролі не збігаються");
      setError(mismatchMsg);
      toast.warning(mismatchMsg);
      return;
    }

    setSubmitting(true);
    try {
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
      navigate("/");
    } catch (err: unknown) {
      let errMsg = t("auth.registerError", "Помилка реєстрації");

      if (isAxiosError(err) && err.response?.data) {
        const data = err.response.data;
        if (typeof data === "string") {
          errMsg = data;
        } else if (typeof data === "object" && data !== null) {
          errMsg = "detail" in data && typeof data.detail === "string"
            ? data.detail
            : Object.values(data).flat().join(" ");
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
      <AuthLayout heroTitleKey="auth.registerHeroTitle" heroSubtitleKey="auth.registerHeroSubtitle">
      <div className="tabs">
        <Link to="/login" className="tab">{t("auth.tabLogin")}</Link>
        <div className="tab active">{t("auth.tabRegister")}</div>
      </div>

      <form onSubmit={handleSubmit}>
        <h2>{t("auth.registerTitle")}</h2>
        <p className="lede">{t("auth.registerLede")}</p>

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

        {role === Role.ClientCompany && (
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

        {role === Role.ClientIndividual && (
          <div className="field">
            <label>{t("auth.fullName")}</label>
            <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
          </div>
        )}

        {role === Role.Driver && (
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
              autoComplete="new-password"
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

        {error && <p className="form-error">{error}</p>}

        <button className="submit-btn" type="submit" disabled={submitting}>
          {t("auth.tabRegister")}
        </button>

        <p className="fine-print">
          {t("auth.haveAccount")} <Link to="/login">{t("auth.tabLogin")}</Link>
        </p>
      </form>
    </AuthLayout>
  );
}