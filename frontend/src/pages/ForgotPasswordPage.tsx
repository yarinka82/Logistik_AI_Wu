
import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "../components/Notifier";
import { forgotPasswordRequest } from "../api/auth";
import { extractErrorMessage } from "../api/errors";
import { AuthLayout } from "./AuthLayout";

export const ForgotPasswordPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await forgotPasswordRequest(email);
      setSent(true);
      toast.success(
        t("auth.resetEmailSent", "Інструкції надіслано на вашу пошту!")
      );
    } catch (err: unknown) {
      const msg = extractErrorMessage(
        err,
        t("auth.resetEmailError", "Не вдалося надіслати запит")
      );
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout
      heroTitleKey="auth.forgotPasswordHeroTitle"
      heroSubtitleKey="auth.forgotPasswordHeroSubtitle"
    >
      <h2>{t("auth.forgotPasswordTitle", "Відновлення пароля")}</h2>
      <p className="lede">
        {sent
          ? t(
              "auth.forgotPasswordSentDesc",
              "Якщо такий email зареєстрований, ми надіслали посилання для встановлення нового пароля."
            )
          : t(
              "auth.forgotPasswordDesc",
              "Введіть ваш зареєстрований email, і ми надішлемо вам посилання для зміни пароля."
            )}
      </p>

      {!sent ? (
        <form onSubmit={handleSubmit}>
          <div className="field">
            <label>{t("auth.email", "Email")}</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
              required
              autoFocus
            />
          </div>

          <button className="submit-btn" type="submit" disabled={submitting}>
            {submitting
              ? t("common.sending", "Надсилання...")
              : t("auth.sendResetLink", "Надіслати посилання")}
          </button>
        </form>
      ) : (
        <button
          className="submit-btn"
          type="button"
          onClick={() => navigate("/login")}
        >
          {t("auth.backToLogin", "Повернутися до входу")}
        </button>
      )}

      <p className="fine-print" style={{ marginTop: "1.5rem" }}>
        <Link to="/login">
          ← {t("auth.backToLogin", "Повернутися до входу")}
        </Link>
      </p>
    </AuthLayout>
  );
};

export default ForgotPasswordPage;