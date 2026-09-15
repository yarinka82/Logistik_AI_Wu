
import React, { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import axios, { isAxiosError } from "axios";
import { toast } from "../components/Notifier";
import "./ProfilePage.css";

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000/api/auth";

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
      await axios.post(`${API_BASE}/password-reset-confirm/`, {
        uid,
        token,
        new_password: newPassword,
      });

      toast.success(t("auth.passwordResetSuccess", "Пароль успішно змінено! Увійдіть з новим паролем."));
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
    <div className="profile-container" style={{ maxWidth: "460px", marginTop: "80px" }}>
      <div className="profile-card">
        <h2 className="profile-title">{t("auth.setNewPasswordTitle", "Встановлення нового пароля")}</h2>
        <p className="profile-subtitle">
          {t("auth.setNewPasswordDesc", "Введіть новий пароль для вашого облікового запису")}
        </p>

        <form onSubmit={handleSubmit} className="profile-form">
          <div className="form-group">
            <label className="form-label">{t("profile.newPassword", "Новий пароль")}</label>
            <div className="password-wrap">
              <input
                type={showNewPassword ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                placeholder="••••••••"
                className="form-input"
              />
              <button
                type="button"
                onClick={() => setShowNewPassword((v) => !v)}
                className="eye-btn"
                tabIndex={-1}
              >
                {showNewPassword ? "🙈" : "👁"}
              </button>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">{t("profile.confirmNewPassword", "Підтвердження нового пароля")}</label>
            <div className="password-wrap">
              <input
                type={showConfirmPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                placeholder="••••••••"
                className="form-input"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword((v) => !v)}
                className="eye-btn"
                tabIndex={-1}
              >
                {showConfirmPassword ? "🙈" : "👁"}
              </button>
            </div>
          </div>

          <button type="submit" disabled={submitting} className="btn-submit btn-submit-success">
            {submitting ? t("common.saving", "Збереження...") : t("auth.saveNewPasswordBtn", "Зберегти новий пароль")}
          </button>
        </form>

        <div style={{ marginTop: "20px", textAlign: "center" }}>
          <Link to="/login" style={{ color: "#00d2b4", fontSize: "13px", textDecoration: "none" }}>
            ← {t("auth.backToLogin", "Повернутися до входу")}
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ResetPasswordConfirmPage;