import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "../auth/AuthContext";
import { toast } from "../components/Notifier";
import { changePasswordRequest, updateProfileRequest } from "../api/auth";
import { extractErrorMessage } from "../api/errors.ts";
import "./ProfilePage.css";

export const ProfilePage: React.FC = () => {
  const { t } = useTranslation();
  const { user, api } = useAuth();

  const [phone, setPhone] = useState(user?.phone || "");
  const [savingProfile, setSavingProfile] = useState(false);

  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);

  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      await updateProfileRequest(api, { phone });
      toast.success(t("profile.saveSuccess", "Дані профілю збережено!"));
    } catch (err: unknown) {
      toast.error(extractErrorMessage(err, t("profile.saveError", "Помилка збереження")));
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword !== confirmPassword) {
      toast.warning(t("auth.passwordMismatch", "Нові паролі не збігаються"));
      return;
    }

    setSavingPassword(true);
    try {
      await changePasswordRequest(api, {
        old_password: oldPassword,
        new_password: newPassword,
      });

      toast.success(t("profile.passwordSuccess", "Пароль успішно змінено!"));
      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");
      } catch (err: unknown) {
        const msg = extractErrorMessage(err, t("profile.passwordError", "Не вдалося змінити пароль"));
        toast.error(msg);

    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <div className="profile-container">
      {/*Card 1: Personal details*/}
      <div className="profile-card">
        <h2 className="profile-title">
          {t("profile.title", "Особисті дані")}
        </h2>
        <p className="profile-subtitle">
          {t("profile.subtitle", "Керуйте своїми контактними та обліковими даними")}
        </p>

        <form onSubmit={handleSaveProfile} className="profile-form">
          <div className="form-group">
            <label className="form-label muted">Email</label>
            <input type="text" value={user?.email || ""} disabled className="form-input" />
          </div>

          <div className="form-group">
            <label className="form-label muted">
              {t("auth.username", "Ім'я користувача")}
            </label>
            <input type="text" value={user?.username || ""} disabled className="form-input" />
          </div>

          <div className="form-group">
            <label className="form-label">
              {t("profile.phone", "Телефон")}
            </label>
            <input
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+49 123 456789"
              className="form-input"
            />
          </div>

          <button type="submit" disabled={savingProfile} className="btn-submit">
            {savingProfile ? t("common.saving", "Збереження...") : t("common.save", "Зберегти зміни")}
          </button>
        </form>
      </div>

      {/*Card 2: Password Change*/}
      <div className="profile-card">
        <h2 className="profile-title">
          {t("profile.securityTitle", "Безпека та зміна пароля")}
        </h2>
        <p className="profile-subtitle">
          {t("profile.securityDesc", "Введіть поточний пароль для встановлення нового")}
        </p>

        <form onSubmit={handleChangePassword} className="profile-form">
          {/*Field 1: Old Password*/}
          <div className="form-group">
            <label className="form-label">
              {t("profile.oldPassword", "Поточний пароль")}
            </label>
            <div className="password-wrap">
              <input
                type={showOldPassword ? "text" : "password"}
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                required
                placeholder="••••••••"
                className="form-input"
              />
              <button
                type="button"
                onClick={() => setShowOldPassword((v) => !v)}
                className="eye-btn"
                tabIndex={-1}
                aria-label="Toggle password visibility"
              >
                {showOldPassword ? "🙈" : "👁"}
              </button>
            </div>
          </div>

          {/*Field 2: New Password*/}
          <div className="form-group">
            <label className="form-label">
              {t("profile.newPassword", "Новий пароль")}
            </label>
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
                aria-label="Toggle password visibility"
              >
                {showNewPassword ? "🙈" : "👁"}
              </button>
            </div>
          </div>

          {/*Confirm New Password:*/}
          <div className="form-group">
            <label className="form-label">
              {t("profile.confirmNewPassword", "Підтвердження нового пароля")}
            </label>
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
                aria-label="Toggle password visibility"
              >
                {showConfirmPassword ? "🙈" : "👁"}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={savingPassword}
            className="btn-submit btn-submit-success"
          >
            {savingPassword
              ? t("common.saving", "Збереження...")
              : t("profile.updatePasswordBtn", "Оновити пароль")}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ProfilePage;

