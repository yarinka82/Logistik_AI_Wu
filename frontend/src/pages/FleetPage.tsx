
import { useEffect, useState, useCallback, useMemo } from "react";
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
  fetchCarrierCompaniesRequest,
  requestJoinCompanyRequest,
  cancelJoinRequestRequest,
  leaveCompanyRequest,
  createVehicleRequest,
  type CreateVehiclePayload,
  type StaffDriver,
  type Vehicle,
  type CarrierCompany,
} from "../api/fleet";

import { toast } from "../components/Notifier";
import {Role} from "../types";


type Tab = "drivers" | "vehicles" | "employment";
type DriverFilter = "all" | "pending" | "confirmed";

const emptyVehicleForm: CreateVehiclePayload = {
  plate_number: "",
  brand: "",
  model: "",
  vehicle_type: "",
  gross_vehicle_weight_kg: 0,
  payload_capacity_kg: 0,
  pallet_capacity: 0,
  fuel_type: "diesel",
  euro_emission_class: "Euro_6",
};

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
  const { api, user } = useAuth();
  const navigate = useNavigate();

  const isCarrierCompany = user?.role === Role.CarrierCompany;
  const isDriver = user?.role === Role.Driver;

  const driverProfile = user?.role === Role.Driver ? user.profile_data : null;
  const employer = driverProfile?.employer ?? null;
  const isConfirmed = driverProfile?.is_confirmed_by_employer ?? false;

  const [showCompanyPicker, setShowCompanyPicker] = useState(false);
  const [companySearch, setCompanySearch] = useState("");
  const [companySort, setCompanySort] = useState<{
    field: "company_name" | "base_city";
    dir: "asc" | "desc";
  }>({
    field: "company_name",
    dir: "asc",
  });

  const visibleTabs: Tab[] = isCarrierCompany
    ? ["drivers", "vehicles"]
    : isDriver
    ? ["vehicles", "employment"]
    : [];

  const [tab, setTab] = useState<Tab | null>(null);
  const [driverFilter, setDriverFilter] = useState<DriverFilter>("all");
  const [drivers, setDrivers] = useState<StaffDriver[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [companies, setCompanies] = useState<CarrierCompany[]>([]);
  const [loading, setLoading] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [showAddVehicle, setShowAddVehicle] = useState(false);
  const [vehicleForm, setVehicleForm] = useState<CreateVehiclePayload>(emptyVehicleForm);
  const [driverToDismiss, setDriverToDismiss] = useState<StaffDriver | null>(null);
  const [previewPhoto, setPreviewPhoto] = useState<string | null>(null);


// Вычисляем фактический активный таб на каждом рендере — без setState, без эффекта
  const effectiveTab: Tab =
    tab && visibleTabs.includes(tab) ? tab : visibleTabs[0] ?? "vehicles";

  const filteredCompanies = useMemo(() => {
    const q = companySearch.trim().toLowerCase();
    const base = q
      ? companies.filter(
          (c) => c.company_name.toLowerCase().includes(q) || (c.base_city || "").toLowerCase().includes(q)
        )
      : companies;

    return [...base].sort((a, b) => {
      const aVal = (companySort.field === "company_name" ? a.company_name : a.base_city || "").toLowerCase();
      const bVal = (companySort.field === "company_name" ? b.company_name : b.base_city || "").toLowerCase();
      const cmp = aVal.localeCompare(bVal, "uk");
      return companySort.dir === "asc" ? cmp : -cmp;
    });
  }, [companies, companySearch, companySort]);

  const toggleCompanySort = (field: "company_name" | "base_city") => {
    setCompanySort((prev) =>
      prev.field === field ? { field, dir: prev.dir === "asc" ? "desc" : "asc" } : { field, dir: "asc" }
    );
  };

  const loadDrivers = useCallback(
    async (signal?: AbortSignal) => {
      if (!isCarrierCompany) return;
      try {
        const filterParam = driverFilter === "all" ? undefined : driverFilter;
        const { data } = await fetchDriversRequest(api, filterParam, signal);
        setDrivers(data);
      } catch (err) {
        console.error("Failed to load drivers:", err);
      }
    },
    [api, driverFilter, isCarrierCompany]
  );

  // Независимый от текущего фильтра счётчик заявок в ожидании — всегда точный
  const loadPendingCount = useCallback(
    async (signal?: AbortSignal) => {
      if (!isCarrierCompany) return;
      try {
        const { data } = await fetchDriversRequest(api, "pending", signal);
        setPendingCount(data.length);
      } catch (err) {
        console.error("Failed to load pending count:", err);
      }
    },
    [api, isCarrierCompany]
  );

  const updateVehicleForm = <K extends keyof CreateVehiclePayload>(key: K, value: CreateVehiclePayload[K]) =>
    setVehicleForm((prev) => ({ ...prev, [key]: value }));


  const loadVehicles = useCallback(
    async (signal?: AbortSignal) => {
      try {
        const { data } = await fetchVehiclesRequest(api, signal); // ← поправлено
        setVehicles(data);
      } catch (err) {
        console.error("Failed to load vehicles:", err);
      }
    },
    [api]
  );

  const loadCompanies = useCallback(
    async (signal?: AbortSignal) => {
      if (!isDriver || employer) return;
      try {
        const { data } = await fetchCarrierCompaniesRequest(api, signal);
        setCompanies(data);
      } catch (err) {
        console.error("Failed to load companies:", err);
      }
    },
    [api, isDriver, employer]
  );

  useEffect(() => {
    const controller = new AbortController();

    async function loadAll() {
      setLoading(true);
      try {
        await Promise.all([
          loadDrivers(controller.signal),
          loadPendingCount(controller.signal),
          loadVehicles(controller.signal),
          loadCompanies(controller.signal),
        ]);
      } finally {
        setLoading(false);
      }
    }

    loadAll();

    return () => controller.abort();
  }, [loadDrivers, loadPendingCount, loadVehicles, loadCompanies]);

  const handleApprove = async (driver: StaffDriver) => {
    try {
      await approveDriverRequest(api, driver.id);
      toast.success(t("fleet.driverApproved", "Водія успішно підтверджено"));
      await Promise.all([loadDrivers(), loadPendingCount()]);
    } catch {
      toast.error(t("fleet.actionError", "Не вдалося підтвердити водія"));
    }
  };

  const handleReject = async (driver: StaffDriver) => {
    try {
      await rejectDriverRequest(api, driver.id);
      toast.success(t("fleet.driverRejected", "Заявку відхилено"));
      await Promise.all([loadDrivers(), loadPendingCount()]);
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
      await Promise.all([loadDrivers(), loadPendingCount()]);
    } catch {
      toast.error(t("fleet.actionError", "Не вдалося відкріпити водія"));
    }
  };

  const handleAddVehicle = async () => {
    if (!vehicleForm.plate_number.trim()) return;
    if (!vehicleForm.gross_vehicle_weight_kg || vehicleForm.gross_vehicle_weight_kg <= 0) {
      toast.error(t("fleet.gvwRequired", "Вкажіть повну масу авто"));
      return;
    }
    if (!vehicleForm.payload_capacity_kg || vehicleForm.payload_capacity_kg <= 0) {
      toast.error(t("fleet.payloadRequired", "Вкажіть вантажопідйомність"));
      return;
    }
    try {
      await createVehicleRequest(api, vehicleForm);
      toast.success(t("fleet.vehicleAdded", "Авто додано"));
      setShowAddVehicle(false);
      setVehicleForm(emptyVehicleForm);
      await loadVehicles();
    } catch {
      toast.error(t("fleet.actionError", "Не вдалося додати авто"));
    }
  };

  const handleRequestJoin = async (companyId: number) => {
    try {
      await requestJoinCompanyRequest(api, companyId);
      toast.success(t("fleet.joinRequested", "Заявку подано"));
      window.location.reload(); // простой способ перечитати /me/ з новим employer
    } catch {
      toast.error(t("fleet.actionError", "Не вдалося подати заявку"));
    }
  };

  const handleCancelJoin = async () => {
    try {
      await cancelJoinRequestRequest(api);
      toast.success(t("fleet.joinCancelled", "Заявку скасовано"));
      window.location.reload();
    } catch {
      toast.error(t("fleet.actionError", "Не вдалося скасувати заявку"));
    }
  };

  const handleLeaveCompany = async () => {
    try {
      await leaveCompanyRequest(api);
      toast.success(t("fleet.leftCompany", "Ви залишили компанію"));
      window.location.reload();
    } catch {
      toast.error(t("fleet.actionError", "Не вдалося залишити компанію"));
    }
  };

  const canManageVehicles = isCarrierCompany || (isDriver && !employer);

  return (
    <div className="fleet-page">
      <h1>{t("fleet.title", "Управління автопарком")}</h1>

      <div className="fleet-tabs">
        {visibleTabs.includes("drivers") && (
          <div className={`fleet-tab ${effectiveTab === "drivers" ? "active" : ""}`} onClick={() => setTab("drivers")}>
            {t("fleet.tabDrivers", "Водії")}
            {pendingCount > 0 && <span className="tab-badge">{pendingCount}</span>}
          </div>
        )}
        {visibleTabs.includes("vehicles") && (
          <div className={`fleet-tab ${effectiveTab === "vehicles" ? "active" : ""}`} onClick={() => setTab("vehicles")}>
            {t("fleet.tabVehicles", "Транспорт")} ({vehicles.length})
          </div>
        )}
        {visibleTabs.includes("employment") && (
          <div className={`fleet-tab ${effectiveTab === "employment" ? "active" : ""}`} onClick={() => setTab("employment")}>
            {t("fleet.tabEmployment", "Моя зайнятість")}
          </div>
        )}
      </div>

      {tab === "drivers" && isCarrierCompany && (
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
                          <div className="pdf-thumb" onClick={(e) => { e.stopPropagation(); setPreviewPhoto(d.license_photo); }} title={t("fleet.viewPdf", "Переглянути PDF")}>📄</div>
                        ) : (
                          <img src={d.license_photo} alt="" className="license-thumb" onClick={(e) => { e.stopPropagation(); setPreviewPhoto(d.license_photo); }} />
                        )
                      ) : "—"}
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
          {canManageVehicles && (
            <button type="button" className="btn-primary" onClick={() => setShowAddVehicle(true)} style={{ marginBottom: "16px" }}>
              {t("fleet.addVehicle", "Додати авто")}
            </button>
          )}

          {!canManageVehicles && !employer && (
            <p className="empty-state">{t("fleet.noVehicleYet", "Авто ще не призначено")}</p>
          )}

          {vehicles.length === 0 && canManageVehicles ? (
            <p className="empty-state">
              {loading ? t("common.loading", "Завантаження...") : t("fleet.noVehicles", "Транспорт не знайдено")}
            </p>
          ) : vehicles.length > 0 ? (
            <table className="fleet-table">
              <thead>
                <tr>
                  <th>{t("fleet.vehiclePlate", "Номерний знак")}</th>
                  <th>{t("fleet.vehicleModel", "Марка / Модель")}</th>
                  {isCarrierCompany && <th>{t("fleet.vehicleDriver", "Закріплений водій")}</th>}
                  <th>{t("fleet.vehicleInsurance", "Страховка")}</th>
                  <th>{t("fleet.vehicleInspection", "Техогляд")}</th>
                </tr>
              </thead>
              <tbody>
                {vehicles.map((v) => (
                  <tr key={v.id} className="clickable-row" onClick={() => navigate(`/fleet/vehicles/${v.id}`)}>
                    <td><strong>{v.plate_number}</strong></td>
                    <td>{v.brand} {v.model}</td>
                    {isCarrierCompany && <td>{v.assigned_driver_name ?? "—"}</td>}
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
          ) : null}
        </div>
      )}

      {tab === "employment" && isDriver && (
        <div className="fleet-content">
          {employer ? (
            <div className="employment-card">
              <p>
                {t("fleet.currentEmployer", "Ви працюєте в компанії")}: <strong>{employer.company_name}</strong>
              </p>
              <p>
                {isConfirmed ? (
                  <span className="badge-success">{t("fleet.statusConfirmed", "У штаті")}</span>
                ) : (
                  <span className="badge-warning">{t("fleet.statusPending", "Очікує підтвердження")}</span>
                )}
              </p>
              {isConfirmed ? (
                <button className="btn-danger" onClick={handleLeaveCompany}>
                  {t("fleet.leaveCompany", "Вийти з компанії")}
                </button>
              ) : (
                <button className="btn-secondary" onClick={handleCancelJoin}>
                  {t("fleet.cancelRequest", "Скасувати заявку")}
                </button>
              )}
            </div>
          ) : (
            <>
              <p>{t("fleet.chooseCompany", "Оберіть компанію, щоб подати заявку на працевлаштування")}</p>
              {companies.length === 0 ? (
                <p className="empty-state">{t("fleet.noCompanies", "Компаній не знайдено")}</p>
              ) : (
                <button type="button" className="btn-primary" onClick={() => setShowCompanyPicker(true)}>
                  {t("fleet.chooseCompanyButton", "Обрати компанію")} ({companies.length})
                </button>
              )}
            </>

          )}
        </div>
      )}

      {showAddVehicle && (
        <div className="confirm-modal-backdrop" onClick={() => setShowAddVehicle(false)}>
          <div className="confirm-modal" onClick={(e) => e.stopPropagation()}>
            <h3>{t("fleet.addVehicle", "Додати авто")}</h3>

            <div className="field">
              <label>{t("fleet.vehiclePlate", "Номерний знак")} *</label>
              <input type="text" value={vehicleForm.plate_number}
                onChange={(e) => updateVehicleForm("plate_number", e.target.value)} required />
            </div>
            <div className="field">
              <label>{t("fleet.vehicleBrand", "Марка")}</label>
              <input type="text" value={vehicleForm.brand}
                onChange={(e) => updateVehicleForm("brand", e.target.value)} />
            </div>
            <div className="field">
              <label>{t("fleet.vehicleModelLabel", "Модель")}</label>
              <input type="text" value={vehicleForm.model}
                onChange={(e) => updateVehicleForm("model", e.target.value)} />
            </div>
            <div className="field">
              <label>{t("fleet.vehicleType", "Тип ТЗ")}</label>
              <input type="text" value={vehicleForm.vehicle_type}
                placeholder={t("fleet.vehicleTypePlaceholder", "напр. тягач, фургон")}
                onChange={(e) => updateVehicleForm("vehicle_type", e.target.value)} />
            </div>
            <div className="field">
              <label>{t("fleet.gvw", "Повна маса (кг)")} *</label>
              <input type="number" min={1} value={vehicleForm.gross_vehicle_weight_kg || ""}
                onChange={(e) => updateVehicleForm("gross_vehicle_weight_kg", Number(e.target.value))} required />
            </div>
            <div className="field">
              <label>{t("fleet.payload", "Вантажопідйомність (кг)")} *</label>
              <input type="number" min={0.01} step="0.01" value={vehicleForm.payload_capacity_kg || ""}
                onChange={(e) => updateVehicleForm("payload_capacity_kg", Number(e.target.value))} required />
            </div>
            <div className="field">
              <label>{t("fleet.palletCapacity", "Кількість палет")}</label>
              <input type="number" min={0} value={vehicleForm.pallet_capacity}
                onChange={(e) => updateVehicleForm("pallet_capacity", Number(e.target.value))} />
            </div>
            <div className="field">
              <label>{t("fleet.fuelType", "Тип пального")}</label>
              <select value={vehicleForm.fuel_type}
                onChange={(e) => updateVehicleForm("fuel_type", e.target.value as CreateVehiclePayload["fuel_type"])}>
                <option value="diesel">{t("fleet.fuel.diesel", "Дизель")}</option>
                <option value="petrol">{t("fleet.fuel.petrol", "Бензин")}</option>
                <option value="electric">{t("fleet.fuel.electric", "Електро")}</option>
                <option value="hybrid">{t("fleet.fuel.hybrid", "Гібрид")}</option>
                <option value="lpg">{t("fleet.fuel.lpg", "Газ (LPG)")}</option>
              </select>
            </div>
            <div className="field">
              <label>{t("fleet.emissionClass", "Клас Euro")}</label>
              <input type="text" value={vehicleForm.euro_emission_class}
                onChange={(e) => updateVehicleForm("euro_emission_class", e.target.value)} />
            </div>

            <div className="confirm-modal-actions">
              <button className="btn-secondary" onClick={() => setShowAddVehicle(false)}>{t("common.cancel", "Скасувати")}</button>
              <button className="btn-primary" onClick={handleAddVehicle}>{t("fleet.addVehicle", "Додати авто")}</button>
            </div>
          </div>
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

        {showCompanyPicker && (
        <div className="confirm-modal-backdrop" onClick={() => setShowCompanyPicker(false)}>
          <div className="confirm-modal company-picker-modal" onClick={(e) => e.stopPropagation()}>
            <h3>{t("fleet.chooseCompanyTitle", "Оберіть компанію")}</h3>

            <input
              type="text"
              placeholder={t("fleet.searchCompany", "Пошук за назвою або містом...")}
              value={companySearch}
              onChange={(e) => setCompanySearch(e.target.value)}
              autoFocus
              style={{ width: "100%", marginBottom: "12px", padding: "8px", boxSizing: "border-box" }}
            />

            {filteredCompanies.length === 0 ? (
              <p className="empty-state">{t("fleet.noCompaniesFound", "Нічого не знайдено")}</p>
            ) : (
              <div style={{ maxHeight: "400px", overflowY: "auto" }}>
                <table className="fleet-table">
                  <thead>
                    <tr>
                      <th onClick={() => toggleCompanySort("company_name")} style={{ cursor: "pointer" }}>
                        {t("fleet.companyName", "Назва компанії")}{" "}
                        {companySort.field === "company_name" ? (companySort.dir === "asc" ? "↑" : "↓") : ""}
                      </th>
                      <th onClick={() => toggleCompanySort("base_city")} style={{ cursor: "pointer" }}>
                        {t("fleet.companyCity", "Місто")}{" "}
                        {companySort.field === "base_city" ? (companySort.dir === "asc" ? "↑" : "↓") : ""}
                      </th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredCompanies.map((c) => (
                      <tr key={c.id}>
                        <td>{c.company_name}</td>
                        <td>{c.base_city || "—"}</td>
                        <td>
                          <button
                            className="btn-primary"
                            onClick={() => {
                              setShowCompanyPicker(false);
                              handleRequestJoin(c.id);
                            }}
                          >
                            {t("fleet.applyJoin", "Подати заявку")}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="confirm-modal-actions">
              <button className="btn-secondary" onClick={() => setShowCompanyPicker(false)}>
                {t("common.close", "Закрити")}
              </button>
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