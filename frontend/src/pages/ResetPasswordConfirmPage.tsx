
import React, { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { isAxiosError } from "axios";
import { toast } from "../components/Notifier";
import { AuthLayout } from "./AuthLayout";
import { resetPasswordConfirmRequest } from "../api/auth";


export const ResetPasswordConfirmPage: React.FC = () => {
  const { t } = useTranslation();
  const { uid, token } = useParams<{ uid: string; token: string }>();
  const navigate = useNavigate();

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword !== confirmPassword) {
      toast.warning(t("auth.passwordMismatch", "Паролі не збігаються"));
      return;
    }

    setSubmitting(true);
    try {
      // Аккуратный вызов готовой функции:
      await resetPasswordConfirmRequest({
        uid: uid!,
        token: token!,
        new_password: newPassword,
      });

      toast.success(
        t("auth.passwordResetSuccess", "Пароль успішно змінено! Увійдіть з новим паролем.")
      );
      navigate("/login");
    } catch (err: unknown) {
      let msg = t("auth.passwordResetError", "Посилання застаріло або недійсне");
      if (isAxiosError(err) && err.response?.data) {
        const d = err.response.data;
        msg = typeof d === "string" ? d : d.detail || Object.values(d).flat().join(" ");
      }
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout
      heroTitleKey="auth.resetPasswordHeroTitle"
      heroSubtitleKey="auth.resetPasswordHeroSubtitle"
    >
      <h2>{t("auth.setNewPasswordTitle", "Встановлення нового пароля")}</h2>
      <p className="lede">
        {t("auth.setNewPasswordDesc", "Введіть новий пароль для вашого облікового запису")}
      </p>

      <form onSubmit={handleSubmit}>
        <div className="field">
          <label>{t("profile.newPassword", "Новий пароль")}</label>
          <div className="password-wrap">
            <input
              type={showNewPassword ? "text" : "password"}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              placeholder="••••••••"
              autoComplete="new-password"
            />
            <button
              type="button"
              onClick={() => setShowNewPassword((v) => !v)}
              className="eye-btn"
              tabIndex={-1}
              aria-label={showNewPassword ? "Passwort verbergen" : "Passwort anzeigen"}
            >
              {showNewPassword ? "🙈" : "👁"}
            </button>
          </div>
        </div>

        <div className="field">
          <label>{t("profile.confirmNewPassword", "Підтвердження нового пароля")}</label>
          <div className="password-wrap">
            <input
              type={showConfirmPassword ? "text" : "password"}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              placeholder="••••••••"
              autoComplete="new-password"
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword((v) => !v)}
              className="eye-btn"
              tabIndex={-1}
              aria-label={showConfirmPassword ? "Passwort verbergen" : "Passwort anzeigen"}
            >
              {showConfirmPassword ? "🙈" : "👁"}
            </button>
          </div>
        </div>

        <button className="submit-btn" type="submit" disabled={submitting}>
          {submitting
            ? t("common.saving", "Збереження...")
            : t("auth.saveNewPasswordBtn", "Зберегти новий пароль")}
        </button>
      </form>

      <p className="fine-print" style={{ marginTop: "1.5rem" }}>
        <Link to="/login">← {t("auth.backToLogin", "Повернутися до входу")}</Link>
      </p>
    </AuthLayout>
  );
};

export default ResetPasswordConfirmPage;