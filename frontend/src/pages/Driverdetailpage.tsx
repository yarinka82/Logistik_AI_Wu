
import { useEffect, useMemo, useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams, Navigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import "./FleetPage.css";
import {
  fetchDriverRequest,
  updateDriverRequest,
  fetchVehiclesRequest,
  approveDriverRequest,
  rejectDriverRequest,
  dismissDriverRequest,
} from "../api/fleet";
import { toast } from "../components/Notifier";
import { type DriverDetail, Role, type UpdateDriverPayload } from "../types";

/** Категорії — підлаштуй під реальний довідник на бекенді. */
const LICENSE_CATEGORIES = ["B", "BE", "C1", "C1E", "C", "CE", "D1", "D1E", "D", "DE"];
const CODE_95_CATEGORIES = ["C", "D"];

/**
 * driving_license_categories / code_95_categories на бекенді — CharField
 * ("C,CE"), не масив. Тримаємо в UI масив, а на сервер завжди йде рядок
 * (або null, якщо категорій немає).
 */
type Categories = string | null;

const toList = (v: Categories): string[] =>
  (v || "").split(",").map((s) => s.trim()).filter(Boolean);

const toCsv = (list: string[]): Categories => {
  const joined = list.join(",");
  return joined || null;
};

function isExpired(dateStr: string | null): boolean {
  if (!dateStr) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return new Date(dateStr) < today;
}

function ExpiryNote({ date, soon }: { date: string | null; soon?: boolean }) {
  const { t } = useTranslation();
  if (!date) return null;
  if (isExpired(date)) return <span className="badge-danger">{t("fleet.expired", "Прострочено")}</span>;
  if (soon) return <span className="badge-warning">{t("fleet.expiringSoon", "Спливає")}</span>;
  return null;
}

function CategoryPicker({
  value,
  options,
  onChange,
  disabled,
}: {
  value: string[];
  options: string[];
  onChange: (next: string[]) => void;
  disabled?: boolean;
}) {
  const toggle = (cat: string) =>
    onChange(value.includes(cat) ? value.filter((c) => c !== cat) : [...value, cat]);

  return (
    <div className="filter-chips" style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
      {options.map((cat) => (
        <button
          key={cat}
          type="button"
          disabled={disabled}
          className={`filter-btn ${value.includes(cat) ? "active" : ""}`}
          onClick={() => toggle(cat)}
        >
          {cat}
        </button>
      ))}
    </div>
  );
}

export function DriverDetailPage() {
  const { t } = useTranslation();
  const { api, user } = useAuth();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const driverId = Number(id);
  const validId = Number.isFinite(driverId);

  const isCarrierCompany = user?.role === Role.CarrierCompany;

  type VehicleOption = { id: number; plate_number: string; brand: string; model: string };
  const [vehicles, setVehicles] = useState<VehicleOption[]>([]);
  const [driver, setDriver] = useState<DriverDetail | null>(null);
  const [failedId, setFailedId] = useState<number | null>(null);
  // Похідне значення замість окремого setLoading — без setState прямо в ефекті.
  const loading = validId && failedId !== driverId && driver?.id !== driverId;
  const [form, setForm] = useState<UpdateDriverPayload>({});
  const [saving, setSaving] = useState(false);
  const [previewPhoto, setPreviewPhoto] = useState<string | null>(null);
  const [showDismiss, setShowDismiss] = useState(false);

  const load = useCallback(
    async (signal?: AbortSignal) => {
      try {
        const [{ data: d }, { data: v }] = await Promise.all([
          fetchDriverRequest(api, driverId, signal),
          fetchVehiclesRequest(api, signal),
        ]);
        setDriver(d);
        setVehicles(v);
        setForm({});
      } catch (err) {
        if ((err as { name?: string })?.name === "CanceledError") return;
        console.error("Failed to load driver:", err);
        setFailedId(driverId);
        toast.error(t("fleet.driverLoadError", "Не вдалося завантажити дані водія"));
      }
    },
    [api, driverId, t]
  );

    useEffect(() => {
      if (!validId) return;
      const controller = new AbortController();
      // eslint-disable-next-line react-hooks/set-state-in-effect -- стандартний fetch-in-effect з AbortController, setState виконується лише після await
      load(controller.signal);
      return () => controller.abort();
    }, [validId, load]);

  // Поточне значення поля: із форми, якщо його вже редагували, інакше з сервера.
  const field = <K extends keyof UpdateDriverPayload>(key: K) =>
    (key in form ? form[key] : (driver?.[key as keyof DriverDetail] as UpdateDriverPayload[K]));

  const set = <K extends keyof UpdateDriverPayload>(key: K, value: UpdateDriverPayload[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const isDirty = Object.keys(form).length > 0;

  const licenseCats = useMemo(
    () => toList(field("driving_license_categories") as Categories),
    [form, driver] // eslint-disable-line react-hooks/exhaustive-deps
  );
  const code95Cats = useMemo(
    () => toList(field("code_95_categories") as Categories),
    [form, driver] // eslint-disable-line react-hooks/exhaustive-deps
  );

  const hasAdr = Boolean(field("has_adr"));

  const handleSave = async () => {
    if (!driver || !isDirty) return;
    if (form.full_name !== undefined && !String(form.full_name).trim()) {
      toast.error(t("fleet.nameRequired", "Вкажіть ПІБ водія"));
      return;
    }
    setSaving(true);
    try {
      // PATCH тільки змінені поля
      const { data } = await updateDriverRequest(api, driver.id, form);
      setDriver(data);
      setForm({});
      toast.success(t("fleet.driverSaved", "Зміни збережено"));
    } catch (err) {
      console.error("Failed to save driver:", err);
      toast.error(t("fleet.actionError", "Не вдалося зберегти зміни"));
    } finally {
      setSaving(false);
    }
  };

  const handleApprove = async () => {
    if (!driver) return;
    try {
      await approveDriverRequest(api, driver.id);
      toast.success(t("fleet.driverApproved", "Водія успішно підтверджено"));
      await load();
    } catch {
      toast.error(t("fleet.actionError", "Не вдалося підтвердити водія"));
    }
  };

  const handleReject = async () => {
    if (!driver) return;
    try {
      await rejectDriverRequest(api, driver.id);
      toast.success(t("fleet.driverRejected", "Заявку відхилено"));
      navigate("/fleet");
    } catch {
      toast.error(t("fleet.actionError", "Не вдалося відхилити заявку"));
    }
  };

  const handleDismiss = async () => {
    if (!driver) return;
    try {
      await dismissDriverRequest(api, driver.id);
      toast.success(t("fleet.driverDismissed", "Водія відкріплено від компанії"));
      navigate("/fleet");
    } catch {
      toast.error(t("fleet.actionError", "Не вдалося відкріпити водія"));
    }
  };

  if (!validId) {
    return <Navigate to="/fleet" replace />;
  }

  if (loading) {
    return (
      <div className="fleet-page">
        <p className="empty-state">{t("common.loading", "Завантаження...")}</p>
      </div>
    );
  }

  if (!driver) {
    return (
      <div className="fleet-page">
        <p className="empty-state">{t("fleet.driverNotFound", "Водія не знайдено")}</p>
        <button className="btn-secondary" onClick={() => navigate("/fleet")}>
          {t("common.back", "Назад")}
        </button>
      </div>
    );
  }

  const readOnly = !isCarrierCompany;

  return (
    <div className="fleet-page">
      <button className="btn-secondary" onClick={() => navigate("/fleet")} style={{ marginBottom: "16px" }}>
        ← {t("fleet.backToFleet", "До списку водіїв")}
      </button>

      <h1>{driver.full_name}</h1>

      <div className="fleet-content">
        {/* Дані, які веде компанія */}
        <div className="field">
          <label>{t("fleet.driverName", "ПІБ")} *</label>
          <input
            type="text"
            disabled={readOnly}
            value={(field("full_name") as string) ?? ""}
            onChange={(e) => set("full_name", e.target.value)}
          />
        </div>

        <div className="field">
          <label>{t("fleet.licenseNumber", "Номер посвідчення")}</label>
          <input
            type="text"
            disabled={readOnly}
            value={(field("driver_license_number") as string) ?? ""}
            onChange={(e) => set("driver_license_number", e.target.value)}
          />
        </div>

        <div className="field">
          <label>{t("fleet.baseCity", "Місто базування")}</label>
          <input
            type="text"
            disabled={readOnly}
            value={(field("base_city") as string) ?? ""}
            onChange={(e) => set("base_city", e.target.value)}
          />
        </div>

        <div className="field">
          <label>{t("fleet.licenseCategories", "Категорії посвідчення")}</label>
          <CategoryPicker
            value={licenseCats}
            options={LICENSE_CATEGORIES}
            disabled={readOnly}
            onChange={(next) => set("driving_license_categories", toCsv(next))}
          />
        </div>

        <div className="field">
          <label>
            {t("fleet.licenseExpiry", "Посвідчення дійсне до")}{" "}
            <ExpiryNote date={driver.driving_license_expiry_date} soon={driver.license_expiring_soon} />
          </label>
          <input
            type="date"
            disabled={readOnly}
            value={(field("driving_license_expiry_date") as string) ?? ""}
            onChange={(e) => set("driving_license_expiry_date", e.target.value || null)}
          />
        </div>

        <div className="field">
          <label>{t("fleet.code95Categories", "Код 95 — категорії")}</label>
          <CategoryPicker
            value={code95Cats}
            options={CODE_95_CATEGORIES}
            disabled={readOnly}
            onChange={(next) => {
              set("code_95_categories", toCsv(next));
              if (next.length === 0) set("code_95_expiry_date", null);
            }}
          />
        </div>

        <div className="field">
          <label>
            {t("fleet.code95Expiry", "Код 95 дійсний до")}{" "}
            <ExpiryNote date={driver.code_95_expiry_date} soon={driver.code_95_expiring_soon} />
          </label>
          <input
            type="date"
            disabled={readOnly || code95Cats.length === 0}
            value={(field("code_95_expiry_date") as string) ?? ""}
            onChange={(e) => set("code_95_expiry_date", e.target.value || null)}
          />
        </div>

        <div className="field">
          <label>
            <input
              type="checkbox"
              disabled={readOnly}
              checked={hasAdr}
              onChange={(e) => {
                set("has_adr", e.target.checked);
                if (!e.target.checked) set("adr_expiry_date", null);
              }}
            />{" "}
            {t("fleet.hasAdr", "Має допуск ADR")}
          </label>
        </div>

        {hasAdr && (
          <div className="field">
            <label>
              {t("fleet.adrExpiry", "ADR дійсний до")}{" "}
              <ExpiryNote date={driver.adr_expiry_date} soon={driver.adr_expiring_soon} />
            </label>
            <input
              type="date"
              disabled={readOnly}
              value={(field("adr_expiry_date") as string) ?? ""}
              onChange={(e) => set("adr_expiry_date", e.target.value || null)}
            />
          </div>
        )}

        <div className="field">
          <label>{t("fleet.defaultVehicle", "Закріплене авто")}</label>
          <select
            disabled={readOnly}
            value={(field("default_vehicle") as number | null) ?? ""}
            onChange={(e) => set("default_vehicle", e.target.value ? Number(e.target.value) : null)}
          >
            <option value="">{t("fleet.noVehicleAssigned", "Не призначено")}</option>
            {vehicles.map((v) => (
              <option key={v.id} value={v.id}>
                {v.plate_number} — {v.brand} {v.model}
              </option>
            ))}
          </select>
        </div>

        {!readOnly && (
          <div className="confirm-modal-actions" style={{ marginTop: "8px" }}>
            <button className="btn-secondary" disabled={!isDirty || saving} onClick={() => setForm({})}>
              {t("common.reset", "Скинути")}
            </button>
            <button className="btn-primary" disabled={!isDirty || saving} onClick={handleSave}>
              {saving ? t("common.saving", "Збереження...") : t("common.save", "Зберегти зміни")}
            </button>
          </div>
        )}
      </div>

      {/* Дані з профілю користувача — тільки читання */}
      <div className="fleet-content">
        <h3>{t("fleet.accountSection", "Обліковий запис")}</h3>
        <table className="fleet-table">
          <tbody>
            <tr>
              <td>{t("fleet.driverEmail", "Email")}</td>
              <td>{driver.email || "—"}</td>
            </tr>
            <tr>
              <td>{t("fleet.driverPhone", "Телефон")}</td>
              <td>{driver.phone || "—"}</td>
            </tr>
            <tr>
              <td>{t("fleet.driverStatus", "Статус")}</td>
              <td>
                {driver.is_confirmed_by_employer ? (
                  <span className="badge-success">{t("fleet.statusConfirmed", "У штаті")}</span>
                ) : (
                  <span className="badge-warning">{t("fleet.statusPending", "Очікує підтвердження")}</span>
                )}
              </td>
            </tr>
            <tr>
              <td>{t("fleet.confirmedAt", "Підтверджено")}</td>
              <td>{driver.confirmed_at ? new Date(driver.confirmed_at).toLocaleDateString("uk") : "—"}</td>
            </tr>
            <tr>
              <td>{t("fleet.accountActive", "Акаунт активний")}</td>
              <td>{driver.is_active ? t("common.yes", "Так") : t("common.no", "Ні")}</td>
            </tr>
            <tr>
              <td>{t("fleet.photoColumn", "Документ")}</td>
              <td>
                {driver.license_photo ? (
                  driver.license_photo.toLowerCase().endsWith(".pdf") ? (
                    <div className="pdf-thumb" onClick={() => setPreviewPhoto(driver.license_photo)}>
                      📄
                    </div>
                  ) : (
                    <img
                      src={driver.license_photo}
                      alt=""
                      className="license-thumb"
                      onClick={() => setPreviewPhoto(driver.license_photo)}
                    />
                  )
                ) : (
                  "—"
                )}
              </td>
            </tr>
          </tbody>
        </table>

        {isCarrierCompany && (
          <div className="row-actions" style={{ marginTop: "16px", display: "flex", gap: "8px" }}>
            {!driver.is_confirmed_by_employer ? (
              <>
                <button className="btn-primary" onClick={handleApprove}>
                  {t("fleet.approve", "Прийняти")}
                </button>
                <button className="btn-danger" onClick={handleReject}>
                  {t("fleet.reject", "Відхилити")}
                </button>
              </>
            ) : (
              <button className="btn-danger" onClick={() => setShowDismiss(true)}>
                {t("fleet.dismissDriver", "Відкріпити від компанії")}
              </button>
            )}
          </div>
        )}
      </div>

      {showDismiss && (
        <div className="confirm-modal-backdrop" onClick={() => setShowDismiss(false)}>
          <div className="confirm-modal" onClick={(e) => e.stopPropagation()}>
            <p>{t("fleet.confirmDismiss", "Ви впевнені, що хочете відкріпити водія від компанії?")}</p>
            <p className="confirm-modal-name">
              <strong>{driver.full_name}</strong>
            </p>
            <div className="confirm-modal-actions">
              <button className="btn-secondary" onClick={() => setShowDismiss(false)}>
                {t("common.cancel", "Скасувати")}
              </button>
              <button className="btn-danger" onClick={handleDismiss}>
                {t("fleet.dismiss", "Відкріпити")}
              </button>
            </div>
          </div>
        </div>
      )}

      {previewPhoto && (
        <div className="photo-modal" onClick={() => setPreviewPhoto(null)}>
          {previewPhoto.toLowerCase().endsWith(".pdf") ? (
            <iframe
              src={previewPhoto}
              title="license-pdf"
              className="pdf-modal-frame"
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <img src={previewPhoto} alt="" onClick={(e) => e.stopPropagation()} />
          )}
        </div>
      )}
    </div>
  );
}