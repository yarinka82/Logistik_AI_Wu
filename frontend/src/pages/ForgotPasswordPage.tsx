
import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import axios, { isAxiosError } from "axios";
import { toast } from "../components/Notifier";
import "./ProfilePage.css"; // переиспользуем стили форм

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000/api/auth";

export const ForgotPasswordPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await axios.post(`${API_BASE}/password-reset/`, { email });
      setSent(true);
      toast.success(t("auth.resetEmailSent", "Інструкції надіслано на вашу пошту!"));
    } catch (err: unknown) {
      let msg = t("auth.resetEmailError", "Не вдалося надіслати запит");
      if (isAxiosError(err) && err.response?.data?.detail) {
        msg = err.response.data.detail;
      }
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="profile-container" style={{ maxWidth: "460px", marginTop: "80px" }}>
      <div className="profile-card">
        <h2 className="profile-title">{t("auth.forgotPasswordTitle", "Відновлення пароля")}</h2>
        <p className="profile-subtitle">
          {sent
            ? t("auth.forgotPasswordSentDesc", "Якщо такий email зареєстрований, ми надіслали посилання для встановлення нового пароля.")
            : t("auth.forgotPasswordDesc", "Введіть ваш зареєстрований email, і ми надішлемо вам посилання для зміни пароля.")}
        </p>

        {!sent ? (
          <form onSubmit={handleSubmit} className="profile-form">
            <div className="form-group">
              <label className="form-label">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                required
                className="form-input"
                autoFocus
              />
            </div>

            <button type="submit" disabled={submitting} className="btn-submit">
              {submitting ? t("common.sending", "Надсилання...") : t("auth.sendResetLink", "Надіслати посилання")}
            </button>
          </form>
        ) : (
          <button onClick={() => navigate("/login")} className="btn-submit">
            {t("auth.backToLogin", "Повернутися до входу")}
          </button>
        )}

        <div style={{ marginTop: "20px", textAlign: "center" }}>
          <Link to="/login" style={{ color: "#00d2b4", fontSize: "13px", textDecoration: "none" }}>
            ← {t("auth.backToLogin", "Повернутися до входу")}
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;