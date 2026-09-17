
import { useEffect, useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import "./FleetPage.css";
import {
  fetchDriversRequest,
  approveDriverRequest,
  rejectDriverRequest,
  dismissDriverRequest,
  fetchVehiclesRequest,
  type StaffDriver,
  type Vehicle,
} from "../api/fleet";
import { toast } from "../components/Notifier";

type Tab = "drivers" | "vehicles";
type DriverFilter = "all" | "pending" | "confirmed";

function getExpiryStatus(dateStr: string | null): "expired" | "soon" | "ok" {
  if (!dateStr) return "ok";
  const date = new Date(dateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (date < today) return "expired";
  const diffDays = (date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24);
  return diffDays <= 30 ? "soon" : "ok";
}

function ExpiryBadge({ dateStr }: { dateStr: string | null }) {
  const { t } = useTranslation();
  const status = getExpiryStatus(dateStr);
  if (status === "ok") return null;
  return status === "expired" ? (
    <span className="badge-danger">{t("fleet.expired", "Прострочено")}</span>
  ) : (
    <span className="badge-warning">{t("fleet.expiringSoon", "Спливає")}</span>
  );
}

export function FleetPage() {
  const { t } = useTranslation();
  const { api } = useAuth();
  const navigate = useNavigate();

  const [tab, setTab] = useState<Tab>("drivers");
  const [driverFilter, setDriverFilter] = useState<DriverFilter>("all");
  const [drivers, setDrivers] = useState<StaffDriver[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(false);

  const [driverToDismiss, setDriverToDismiss] = useState<StaffDriver | null>(null);
  const [previewPhoto, setPreviewPhoto] = useState<string | null>(null);

  const loadDrivers = useCallback(
    async (signal?: AbortSignal) => {
      try {
        const filterParam = driverFilter === "all" ? undefined : driverFilter;
        const { data } = await fetchDriversRequest(api, filterParam, signal);
        setDrivers(data);
      } catch (err) {
        console.error("Failed to load drivers:", err);
      }
    },
    [api, driverFilter]
  );

  const loadVehicles = useCallback(
    async (signal?: AbortSignal) => {
      try {
        const { data } = await fetchVehiclesRequest(api, signal);
        setVehicles(data);
      } catch (err) {
        console.error("Failed to load vehicles:", err);
      }
    },
    [api]
  );

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    Promise.all([loadDrivers(controller.signal), loadVehicles(controller.signal)]).finally(() =>
      setLoading(false)
    );
    return () => controller.abort();
  }, [loadDrivers, loadVehicles]);

  const handleApprove = async (driver: StaffDriver) => {
    try {
      await approveDriverRequest(api, driver.id);
      toast.success(t("fleet.driverApproved", "Водія успішно підтверджено"));
      await loadDrivers();
    } catch {
      toast.error(t("fleet.actionError", "Не вдалося підтвердити водія"));
    }
  };

  const handleReject = async (driver: StaffDriver) => {
    try {
      await rejectDriverRequest(api, driver.id);
      toast.success(t("fleet.driverRejected", "Заявку відхилено"));
      await loadDrivers();
    } catch {
      toast.error(t("fleet.actionError", "Не вдалося відхилити заявку"));
    }
  };

  const handleDismiss = async () => {
    if (!driverToDismiss) return;
    try {
      await dismissDriverRequest(api, driverToDismiss.id);
      toast.success(t("fleet.driverDismissed", "Водія відкріплено від компанії"));
      setDriverToDismiss(null);
      await loadDrivers();
    } catch {
      toast.error(t("fleet.actionError", "Не вдалося відкріпити водія"));
    }
  };

  const pendingCount = drivers.filter((d) => !d.is_confirmed_by_employer).length;

  return (
    <div className="fleet-page">
      <h1>{t("fleet.title", "Управління автопарком")}</h1>

      <div className="fleet-tabs">
        <div className={`fleet-tab ${tab === "drivers" ? "active" : ""}`} onClick={() => setTab("drivers")}>
          {t("fleet.tabDrivers", "Водії")}
          {pendingCount > 0 && <span className="tab-badge">{pendingCount}</span>}
        </div>
        <div className={`fleet-tab ${tab === "vehicles" ? "active" : ""}`} onClick={() => setTab("vehicles")}>
          {t("fleet.tabVehicles", "Транспорт")} ({vehicles.length})
        </div>
      </div>

      {tab === "drivers" && (
        <div className="fleet-content">
          <div className="filter-chips" style={{ display: "flex", gap: "8px", marginBottom: "16px" }}>
            <button type="button" className={`filter-btn ${driverFilter === "all" ? "active" : ""}`} onClick={() => setDriverFilter("all")}>
              {t("fleet.allDrivers", "Всі")}
            </button>
            <button type="button" className={`filter-btn ${driverFilter === "pending" ? "active" : ""}`} onClick={() => setDriverFilter("pending")}>
              {t("fleet.pendingDrivers", "Заявки")} {pendingCount > 0 && `(${pendingCount})`}
            </button>
            <button type="button" className={`filter-btn ${driverFilter === "confirmed" ? "active" : ""}`} onClick={() => setDriverFilter("confirmed")}>
              {t("fleet.confirmedDrivers", "У штаті")}
            </button>
          </div>

          {drivers.length === 0 ? (
            <p className="empty-state">
              {loading ? t("common.loading", "Завантаження...") : t("fleet.noDrivers", "Водіїв не знайдено")}
            </p>
          ) : (
            <table className="fleet-table">
              <thead>
                <tr>
                  <th>{t("fleet.driverName", "ПІБ")}</th>
                  <th>{t("fleet.driverEmail", "Email / Телефон")}</th>
                  <th>{t("fleet.licenseNumber", "Номер посвідчення")}</th>
                  <th>{t("fleet.photoColumn", "Документ")}</th>
                  <th>{t("fleet.driverStatus", "Статус")}</th>
                  <th style={{ textAlign: "right" }}>{t("fleet.actions", "Дії")}</th>
                </tr>
              </thead>
              <tbody>
                {drivers.map((d) => (
                  <tr key={d.id} className="clickable-row" onClick={() => navigate(`/fleet/drivers/${d.id}`)}>
                    <td><strong>{d.full_name}</strong></td>
                    <td>
                      <div>{d.email}</div>
                      {d.phone && <small style={{ color: "#666" }}>{d.phone}</small>}
                    </td>
                    <td>
                      {d.driver_license_number || "—"}
                      <ExpiryBadge dateStr={d.driving_license_expiry_date} />
                    </td>
                    <td>
                      {d.license_photo ? (
                        d.license_photo.toLowerCase().endsWith(".pdf") ? (
                          <div
                            className="pdf-thumb"
                            onClick={(e) => { e.stopPropagation(); setPreviewPhoto(d.license_photo); }}
                            title={t("fleet.viewPdf", "Переглянути PDF")}
                          >
                            📄
                          </div>
                        ) : (
                          <img
                            src={d.license_photo}
                            alt=""
                            className="license-thumb"
                            onClick={(e) => { e.stopPropagation(); setPreviewPhoto(d.license_photo); }}
                          />
                        )
                      ) : (
                        "—"
                      )}
                    </td>
                    <td>
                      {d.is_confirmed_by_employer ? (
                        <span className="badge-success">{t("fleet.statusConfirmed", "У штаті")}</span>
                      ) : (
                        <span className="badge-warning">{t("fleet.statusPending", "Очікує підтвердження")}</span>
                      )}
                    </td>
                    <td className="row-actions" style={{ textAlign: "right" }}>
                      {!d.is_confirmed_by_employer ? (
                        <>
                          <button className="btn-action-approve" onClick={(e) => { e.stopPropagation(); handleApprove(d); }} title={t("fleet.approve", "Прийняти")}>✅</button>
                          <button className="btn-action-reject" onClick={(e) => { e.stopPropagation(); handleReject(d); }} title={t("fleet.reject", "Відхилити")}>❌</button>
                        </>
                      ) : (
                        <button className="btn-action-dismiss" onClick={(e) => { e.stopPropagation(); setDriverToDismiss(d); }} title={t("fleet.dismissDriver", "Відкріпити")}>🗑️</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {tab === "vehicles" && (
        <div className="fleet-content">
          {vehicles.length === 0 ? (
            <p className="empty-state">
              {loading ? t("common.loading", "Завантаження...") : t("fleet.noVehicles", "Транспорт не знайдено")}
            </p>
          ) : (
            <table className="fleet-table">
              <thead>
                <tr>
                  <th>{t("fleet.vehiclePlate", "Номерний знак")}</th>
                  <th>{t("fleet.vehicleModel", "Марка / Модель")}</th>
                  <th>{t("fleet.vehicleDriver", "Закріплений водій")}</th>
                  <th>{t("fleet.vehicleInsurance", "Страховка")}</th>
                  <th>{t("fleet.vehicleInspection", "Техогляд")}</th>
                </tr>
              </thead>
              <tbody>
                {vehicles.map((v) => (
                  <tr key={v.id} className="clickable-row" onClick={() => navigate(`/fleet/vehicles/${v.id}`)}>
                    <td><strong>{v.plate_number}</strong></td>
                    <td>{v.brand} {v.model}</td>
                    <td>{v.assigned_driver_name ?? "—"}</td>
                    <td>
                      {v.insurance_expiry ?? "—"}
                      <ExpiryBadge dateStr={v.insurance_expiry} />
                    </td>
                    <td>
                      {v.tech_inspection_expiry ?? "—"}
                      <ExpiryBadge dateStr={v.tech_inspection_expiry} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {driverToDismiss && (
        <div className="confirm-modal-backdrop" onClick={() => setDriverToDismiss(null)}>
          <div className="confirm-modal" onClick={(e) => e.stopPropagation()}>
            <p>{t("fleet.confirmDismiss", "Ви впевнені, що хочете відкріпити водія від компанії?")}</p>
            <p className="confirm-modal-name"><strong>{driverToDismiss.full_name}</strong></p>
            <div className="confirm-modal-actions">
              <button className="btn-secondary" onClick={() => setDriverToDismiss(null)}>{t("common.cancel", "Скасувати")}</button>
              <button className="btn-danger" onClick={handleDismiss}>{t("fleet.dismiss", "Відкріпити")}</button>
            </div>
          </div>
        </div>
      )}

      {previewPhoto && (
        <div className="photo-modal" onClick={() => setPreviewPhoto(null)}>
          {previewPhoto.toLowerCase().endsWith(".pdf") ? (
            <iframe src={previewPhoto} title="license-pdf" className="pdf-modal-frame" onClick={(e) => e.stopPropagation()} />
          ) : (
            <img src={previewPhoto} alt="" onClick={(e) => e.stopPropagation()} />
          )}
        </div>
      )}
    </div>
  );
}