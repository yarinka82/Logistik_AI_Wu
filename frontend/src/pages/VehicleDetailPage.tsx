
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../auth/AuthContext";
import {
  fetchVehicleRequest,
  updateVehicleRequest,
  type Vehicle,
  type CreateVehiclePayload,
} from "../api/fleet";
import { toast } from "../components/Notifier";
import "./FleetPage.css";

function ExpiryBadge({ dateStr }: { dateStr: string | null }) {
  const { t } = useTranslation();
  if (!dateStr) return null;
  const date = new Date(dateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (date < today) return <span className="badge-danger">{t("fleet.expired", "Прострочено")}</span>;
  const diffDays = (date.getTime() - today.getTime()) / 86400000;
  if (diffDays <= 30) return <span className="badge-warning">{t("fleet.expiringSoon", "Спливає")}</span>;
  return null;
}

const FUEL_LABELS: Record<string, string> = {
  diesel: "fleet.fuel.diesel",
  petrol: "fleet.fuel.petrol",
  electric: "fleet.fuel.electric",
  hybrid: "fleet.fuel.hybrid",
  lpg: "fleet.fuel.lpg",
};

type EditForm = CreateVehiclePayload & {
  insurance_expiry: string | null;
  tech_inspection_expiry: string | null;
};

function toEditForm(v: Vehicle): EditForm {
  return {
    plate_number: v.plate_number,
    brand: v.brand,
    model: v.model,
    vehicle_type: v.vehicle_type,
    gross_vehicle_weight_kg: v.gross_vehicle_weight_kg,
    payload_capacity_kg: v.payload_capacity_kg,
    pallet_capacity: v.pallet_capacity,
    fuel_type: v.fuel_type,
    euro_emission_class: v.euro_emission_class,
    insurance_expiry: v.insurance_expiry,
    tech_inspection_expiry: v.tech_inspection_expiry,
  };
}

export function VehicleDetailPage() {
  const { id } = useParams<{ id: string }>();
  // key=id: при смене id компонент полностью ремонтируется,
  // useState() сами обнуляются — не нужно руками сбрасывать loading/error/vehicle
  return <VehicleDetailPageInner key={id} id={id} />;
}

function VehicleDetailPageInner({ id }: { id?: string }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { api, user } = useAuth();

  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<EditForm | null>(null);

  const canEdit = user?.role === "carrier_company";

  useEffect(() => {
    if (!id) return;
    const controller = new AbortController();

    fetchVehicleRequest(api, id, controller.signal)
      .then(({ data }) => setVehicle(data))
      .catch((err) => {
        if (err.name !== "AbortError" && err.name !== "CanceledError") setError(true);
      })
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, [api, id]);

  const startEditing = () => {
    if (!vehicle) return;
    setForm(toEditForm(vehicle));
    setEditing(true);
  };

  const cancelEditing = () => {
    setEditing(false);
    setForm(null);
  };

  const updateForm = <K extends keyof EditForm>(key: K, value: EditForm[K]) =>
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev));

  const handleSave = async () => {
    if (!id || !form) return;
    if (!form.plate_number.trim()) {
      toast.error(t("fleet.plateRequired", "Вкажіть номерний знак"));
      return;
    }
    if (!form.gross_vehicle_weight_kg || form.gross_vehicle_weight_kg <= 0) {
      toast.error(t("fleet.gvwRequired", "Вкажіть повну масу авто"));
      return;
    }
    if (!form.payload_capacity_kg || form.payload_capacity_kg <= 0) {
      toast.error(t("fleet.payloadRequired", "Вкажіть вантажопідйомність"));
      return;
    }
    setSaving(true);
    try {
      const { data } = await updateVehicleRequest(api, id, form);
      setVehicle(data);
      setEditing(false);
      setForm(null);
      toast.success(t("fleet.vehicleUpdated", "Дані авто оновлено"));
    } catch {
      toast.error(t("fleet.actionError", "Не вдалося оновити авто"));
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <p className="empty-state">{t("common.loading", "Завантаження...")}</p>;
  if (error || !vehicle) return <p className="empty-state">{t("fleet.vehicleNotFound", "Авто не знайдено")}</p>;

  return (
    <div className="fleet-page">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
        <button className="btn-secondary" onClick={() => navigate(-1)}>
          {t("common.back", "Назад")}
        </button>
        {canEdit && !editing && (
          <button className="btn-primary" onClick={startEditing}>
            {t("fleet.editVehicle", "Редагувати")}
          </button>
        )}
      </div>

      <h1>{vehicle.plate_number}</h1>
      <p style={{ color: "#666" }}>{vehicle.brand} {vehicle.model}</p>

      {!editing ? (
        <div className="employment-card">
          <dl className="vehicle-detail-grid">
            <dt>{t("fleet.vehicleType", "Тип ТЗ")}</dt><dd>{vehicle.vehicle_type || "—"}</dd>
            <dt>{t("fleet.gvw", "Повна маса (кг)")}</dt><dd>{vehicle.gross_vehicle_weight_kg}</dd>
            <dt>{t("fleet.payload", "Вантажопідйомність (кг)")}</dt><dd>{vehicle.payload_capacity_kg}</dd>
            <dt>{t("fleet.palletCapacity", "Кількість палет")}</dt><dd>{vehicle.pallet_capacity}</dd>
            <dt>{t("fleet.fuelType", "Тип пального")}</dt>
            <dd>{t(FUEL_LABELS[vehicle.fuel_type] ?? "", vehicle.fuel_type)}</dd>
            <dt>{t("fleet.emissionClass", "Клас Euro")}</dt><dd>{vehicle.euro_emission_class}</dd>
            <dt>{t("fleet.vehicleInsurance", "Страховка")}</dt>
            <dd>{vehicle.insurance_expiry ?? "—"} <ExpiryBadge dateStr={vehicle.insurance_expiry} /></dd>
            <dt>{t("fleet.vehicleInspection", "Техогляд")}</dt>
            <dd>{vehicle.tech_inspection_expiry ?? "—"} <ExpiryBadge dateStr={vehicle.tech_inspection_expiry} /></dd>
            {vehicle.assigned_driver_name && (
              <>
                <dt>{t("fleet.vehicleDriver", "Закріплений водій")}</dt>
                <dd>{vehicle.assigned_driver_name}</dd>
              </>
            )}
          </dl>
        </div>
      ) : (
        form && (
          <div className="employment-card">
            <div className="field">
              <label>{t("fleet.vehiclePlate", "Номерний знак")} *</label>
              <input type="text" value={form.plate_number}
                onChange={(e) => updateForm("plate_number", e.target.value)} required />
            </div>
            <div className="field">
              <label>{t("fleet.vehicleBrand", "Марка")}</label>
              <input type="text" value={form.brand}
                onChange={(e) => updateForm("brand", e.target.value)} />
            </div>
            <div className="field">
              <label>{t("fleet.vehicleModelLabel", "Модель")}</label>
              <input type="text" value={form.model}
                onChange={(e) => updateForm("model", e.target.value)} />
            </div>
            <div className="field">
              <label>{t("fleet.vehicleType", "Тип ТЗ")}</label>
              <input type="text" value={form.vehicle_type}
                onChange={(e) => updateForm("vehicle_type", e.target.value)} />
            </div>
            <div className="field">
              <label>{t("fleet.gvw", "Повна маса (кг)")} *</label>
              <input type="number" min={1} value={form.gross_vehicle_weight_kg || ""}
                onChange={(e) => updateForm("gross_vehicle_weight_kg", Number(e.target.value))} required />
            </div>
            <div className="field">
              <label>{t("fleet.payload", "Вантажопідйомність (кг)")} *</label>
              <input type="number" min={0.01} step="0.01" value={form.payload_capacity_kg || ""}
                onChange={(e) => updateForm("payload_capacity_kg", Number(e.target.value))} required />
            </div>
            <div className="field">
              <label>{t("fleet.palletCapacity", "Кількість палет")}</label>
              <input type="number" min={0} value={form.pallet_capacity}
                onChange={(e) => updateForm("pallet_capacity", Number(e.target.value))} />
            </div>
            <div className="field">
              <label>{t("fleet.fuelType", "Тип пального")}</label>
              <select value={form.fuel_type}
                onChange={(e) => updateForm("fuel_type", e.target.value as EditForm["fuel_type"])}>
                <option value="diesel">{t("fleet.fuel.diesel", "Дизель")}</option>
                <option value="petrol">{t("fleet.fuel.petrol", "Бензин")}</option>
                <option value="electric">{t("fleet.fuel.electric", "Електро")}</option>
                <option value="hybrid">{t("fleet.fuel.hybrid", "Гібрид")}</option>
                <option value="lpg">{t("fleet.fuel.lpg", "Газ (LPG)")}</option>
              </select>
            </div>
            <div className="field">
              <label>{t("fleet.emissionClass", "Клас Euro")}</label>
              <input type="text" value={form.euro_emission_class}
                onChange={(e) => updateForm("euro_emission_class", e.target.value)} />
            </div>
            <div className="field">
              <label>{t("fleet.vehicleInsurance", "Страховка (дійсна до)")}</label>
              <input type="date" value={form.insurance_expiry ?? ""}
                onChange={(e) => updateForm("insurance_expiry", e.target.value || null)} />
            </div>
            <div className="field">
              <label>{t("fleet.vehicleInspection", "Техогляд (дійсний до)")}</label>
              <input type="date" value={form.tech_inspection_expiry ?? ""}
                onChange={(e) => updateForm("tech_inspection_expiry", e.target.value || null)} />
            </div>

            <div className="confirm-modal-actions">
              <button className="btn-secondary" onClick={cancelEditing} disabled={saving}>
                {t("common.cancel", "Скасувати")}
              </button>
              <button className="btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? t("common.saving", "Збереження...") : t("common.save", "Зберегти")}
              </button>
            </div>
          </div>
        )
      )}
    </div>
  );
}