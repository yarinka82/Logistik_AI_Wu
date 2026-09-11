
import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { isAxiosError } from "axios";
import { useTranslation } from "react-i18next";
import { useAuth } from "../auth/AuthContext";
import { toast } from "../components/Notifier";
import { AuthLayout } from "./AuthLayout";



export function LoginPage() {
  const { t } = useTranslation();
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login({ email, password });
      toast.success(t("auth.loginSuccess", "Успішний вхід!"));
      navigate("/");
    } catch (err: unknown) {
      let errMsg = t("auth.loginError", "Помилка входу");

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
    <AuthLayout heroTitleKey="auth.heroTitle" heroSubtitleKey="auth.heroSubtitle">
      <div className="tabs">
        <div className="tab active">{t("auth.tabLogin")}</div>
        <Link to="/register" className="tab">{t("auth.tabRegister")}</Link>
      </div>

      <form onSubmit={handleSubmit}>
        <h2>{t("auth.welcomeBack")}</h2>
        <p className="lede">{t("auth.loginLede")}</p>

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

        <div className="field">
          <label>{t("auth.password")}</label>
          <div className="password-wrap">
            <input
              type={showPassword ? "text" : "password"}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
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
          <Link to="/forgot-password" style={{ color: "#00d2b4", fontSize: "12px", textDecoration: "none" }}>
            {t("auth.forgotPasswordLink", "Забули пароль?")}
          </Link>
        </div>

        {error && <p className="form-error">{error}</p>}

        <button className="submit-btn" type="submit" disabled={submitting}>
          {t("auth.login")}
        </button>

        <p className="fine-print">
          {t("auth.noAccount")} <Link to="/register">{t("auth.tabRegister")}</Link>
        </p>
      </form>
    </AuthLayout>
  );
}