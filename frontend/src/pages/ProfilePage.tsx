import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "../auth/AuthContext";
import { toast } from "../components/Notifier";
import { changePasswordRequest, updateProfileRequest, uploadLicensePhotoRequest } from "../api/auth";
import { extractErrorMessage, translateUploadError } from "../api/errors";
import { DriverCompanySection } from "../components/DriverCompanySection";
import "./ProfilePage.css";
import {Role} from "../types";


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

  const [licensePhotoUrl, setLicensePhotoUrl] = useState<string | null>(user?.license_photo ?? null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

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

  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingPhoto(true);
    try {
      const { data } = await uploadLicensePhotoRequest(api, file);
      setLicensePhotoUrl(data.license_photo);
      toast.success(t("profile.photoSuccess", "Фото прав оновлено!"));
    } catch (err: unknown) {
      toast.error(translateUploadError(err, t));
    } finally {
      setUploadingPhoto(false);
      e.target.value = "";
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

  const isDriver = user?.role === Role.Driver;

  return (
    <div className="profile-container">
      {/*Left column: Personal data and Password*/}
      <div className="profile-stack">
        {/*Card 1: Personal details*/}
        <div className="profile-card">
          <h2 className="profile-title">{t("profile.title", "Особисті дані")}</h2>
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
              <label className="form-label">{t("profile.phone", "Телефон")}</label>
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

        {/*Card 2: Security and Password*/}
        <div className="profile-card">
          <h2 className="profile-title">{t("profile.securityTitle", "Безпека та зміна пароля")}</h2>
          <p className="profile-subtitle">
            {t("profile.securityDesc", "Введіть поточний пароль для встановлення нового")}
          </p>

          <form onSubmit={handleChangePassword} className="profile-form">
            <div className="form-group">
              <label className="form-label">{t("profile.oldPassword", "Поточний пароль")}</label>
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
                  aria-label="Toggle password visibility"
                >
                  {showNewPassword ? "🙈" : "👁"}
                </button>
              </div>
            </div>

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

      {/*Right column for driver: Top company, bottom right*/}
      {isDriver && (
        <div className="profile-stack">
          {/*1. Block of work in the company (above rights)*/}
          <DriverCompanySection />

          {/*2. Driver's license card*/}
          <div className="profile-card license-card">
            <h2 className="profile-title">{t("profile.licenseTitle", "Права водія")}</h2>
            <p className="profile-subtitle">
              {t("profile.licenseSubtitle", "Завантажте фото або скан посвідчення водія")}
            </p>

            <div className="profile-form">
              {licensePhotoUrl &&
                (licensePhotoUrl.toLowerCase().endsWith(".pdf") ? (
                  <iframe
                    src={licensePhotoUrl}
                    title="license-pdf"
                    style={{
                      width: "100%",
                      maxWidth: "400px",
                      height: "400px",
                      border: "none",
                      borderRadius: "8px",
                      marginBottom: "12px",
                    }}
                  />
                ) : (
                  <img
                    src={licensePhotoUrl}
                    alt=""
                    style={{
                      maxWidth: "240px",
                      borderRadius: "8px",
                      marginBottom: "12px",
                      display: "block",
                    }}
                  />
                ))}

              <div className="form-group">
                <label className="form-label">{t("profile.licensePhoto", "Фото прав")}</label>
                <input
                  type="file"
                  accept="image/jpeg,image/png,application/pdf"
                  onChange={handlePhotoSelect}
                  disabled={uploadingPhoto}
                  className="form-input"
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};