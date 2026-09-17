
import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { isAxiosError } from "axios";
import { useAuth } from "../auth/AuthContext";
import {
  fetchCarrierCompaniesRequest,
  requestJoinCompanyRequest,
  cancelJoinRequestRequest,
  leaveCompanyRequest,
  type CarrierCompany,
} from "../api/fleet";
import { toast } from "../components/Notifier";
import type {DriverProfileData} from "../types";

export function DriverCompanySection() {
  const { t } = useTranslation();
  const { api, user } = useAuth();

  const profileData = (user?.profile_data ?? null) as DriverProfileData | null;
  const employer = profileData?.employer;
  const isConfirmed = Boolean(profileData?.is_confirmed_by_employer);

  const [companies, setCompanies] = useState<CarrierCompany[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<number | "">("");
  const [submitting, setSubmitting] = useState(false);
  const [loadingCompanies, setLoadingCompanies] = useState(Boolean(!employer));

  useEffect(() => {
    if (employer) return;

    let isMounted = true;
    const controller = new AbortController();

    fetchCarrierCompaniesRequest(api, controller.signal)
      .then(({ data }) => {
        if (isMounted) {
          setCompanies(data);
          if (data.length === 1) {
            setSelectedCompanyId(data[0].id);
          }
        }
      })
      .catch((err) => {
        if (isMounted && err.name !== "CanceledError" && err.name !== "AbortError") {
          console.error("Помилка завантаження компаній:", err);
        }
      })
      .finally(() => {
        if (isMounted) setLoadingCompanies(false);
      });

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, [api, employer]);

  // 1. Подача заявки
  const handleRequestJoin = async () => {
    if (!selectedCompanyId) {
      toast.warning(t("fleet.chooseCompanyWarning", "Будь ласка, оберіть компанію зі списку"));
      return;
    }

    setSubmitting(true);
    try {
      await requestJoinCompanyRequest(api, Number(selectedCompanyId));
      toast.success(t("fleet.joinRequestSent", "Заявку успішно надіслано! Очікуйте схвалення компанією."));
      setTimeout(() => window.location.reload(), 600);
    } catch (err: unknown) {
      let msg = t("fleet.joinRequestError", "Не вдалося надіслати заявку");
      if (isAxiosError(err) && err.response?.data) {
        const d = err.response.data;
        msg = typeof d === "string" ? d : d.detail || Object.values(d).flat().join(" ") || msg;
      }
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  // 2. Отмена заявки
  const handleCancelRequest = async () => {
    setSubmitting(true);
    try {
      await cancelJoinRequestRequest(api);
      toast.success(t("fleet.joinRequestCancelled", "Заявку скасовано"));
      setTimeout(() => window.location.reload(), 600);
    } catch {
      toast.error(t("fleet.actionError", "Помилка скасування заявки"));
    } finally {
      setSubmitting(false);
    }
  };

  // 3. Выход из компании
  const handleLeaveCompany = async () => {
    if (!window.confirm(t("fleet.confirmLeave", "Ви впевнені, що хочете покинути компанію?"))) {
      return;
    }

    setSubmitting(true);
    try {
      await leaveCompanyRequest(api);
      toast.success(t("fleet.leftCompany", "Ви покинули компанію"));
      setTimeout(() => window.location.reload(), 600);
    } catch {
      toast.error(t("fleet.actionError", "Помилка при виході з компанії"));
    } finally {
      setSubmitting(false);
    }
  };

  const isButtonDisabled = !selectedCompanyId || submitting;

  return (
    <div className="profile-card">
      <h2 className="profile-title" style={{ fontSize: "18px", marginBottom: "4px" }}>
        {t("fleet.employerTitle", "Робота в компанії-перевізнику")}
      </h2>
      <p className="profile-subtitle">
        {employer
          ? t("fleet.employerSubtitleActive", "Інформація про вашого поточного роботодавця")
          : t("fleet.selectCompanyDesc", "Оберіть компанію-перевізника для приєднання")}
      </p>

      {/* 1. Водитель утвержден в штате */}
      {employer && isConfirmed && (
        <div style={{ background: "rgba(16, 185, 129, 0.08)", padding: "16px", borderRadius: "10px", border: "1px solid rgba(16, 185, 129, 0.25)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
            <div>
              <span className="badge-success" style={{ marginBottom: "6px", display: "inline-block" }}>
                {t("fleet.statusConfirmed", "У штаті компанії")}
              </span>
              <p style={{ margin: "4px 0 0 0", fontSize: "15px", fontWeight: 600, color: "var(--ink)" }}>
                {employer.company_name}
              </p>
              {employer.company_registration_number && (
                <small style={{ color: "var(--ink-soft)" }}>
                  {employer.company_registration_number}
                </small>
              )}
            </div>
            <button
              type="button"
              onClick={handleLeaveCompany}
              disabled={submitting}
              className="logout-btn"
              style={{ padding: "6px 14px", fontSize: "12px", color: "#dc2626", borderColor: "#fca5a5" }}
            >
              {t("fleet.leaveCompanyBtn", "Покинути компанію")}
            </button>
          </div>
        </div>
      )}

      {/* 2. Заявка на рассмотрении */}
      {employer && !isConfirmed && (
        <div style={{ background: "rgba(245, 158, 11, 0.08)", padding: "16px", borderRadius: "10px", border: "1px solid rgba(245, 158, 11, 0.25)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
            <div>
              <span className="badge-warning" style={{ marginBottom: "6px", display: "inline-block" }}>
                {t("fleet.statusPending", "Очікує підтвердження")}
              </span>
              <p style={{ margin: "4px 0 0 0", fontSize: "14px", color: "var(--ink)" }}>
                {t("fleet.appliedTo", "Заявку надіслано до:")} <strong>{employer.company_name}</strong>
              </p>
              <small style={{ color: "var(--ink-soft)" }}>
                {t("fleet.pendingReviewDesc", "Керівник компанії має схвалити вашу заявку в автопарку.")}
              </small>
            </div>
            <button
              type="button"
              onClick={handleCancelRequest}
              disabled={submitting}
              className="logout-btn"
              style={{ padding: "6px 14px", fontSize: "12px" }}
            >
              {t("common.cancel", "Скасувати")}
            </button>
          </div>
        </div>
      )}

      {/* 3. Свободный водитель — форма подачи заявки */}
      {!employer && (
        <div className="profile-form">
          <div className="form-group">
            <label className="form-label">{t("fleet.companyLabel", "Компанія-перевізник")}</label>
            <select
              value={selectedCompanyId}
              onChange={(e) => setSelectedCompanyId(e.target.value ? Number(e.target.value) : "")}
              disabled={loadingCompanies || submitting}
              className="form-input"
              style={{ height: "42px" }}
            >
              <option value="">
                {loadingCompanies
                  ? t("common.loading", "Завантаження...")
                  : t("fleet.chooseCompanyPlaceholder", "Оберіть компанію зі списку...")}
              </option>
              {companies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.company_name} {c.base_city ? `(${c.base_city})` : ""}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={handleRequestJoin}
            disabled={isButtonDisabled}
            className="btn-submit"

          >
            {submitting ? t("common.sending", "Надсилання...") : t("fleet.sendJoinRequest", "Подати заявку")}
          </button>
        </div>
      )}
    </div>
  );
}