
import { useEffect, useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "../auth/AuthContext";
import "./FleetPage.css";
import {
  fetchDriversRequest,
  toggleDriverActiveRequest,
  removeDriverRequest,
  fetchInvitesRequest,
  generateInviteRequest,
  fetchVehiclesRequest,
  type StaffDriver,
  type Invite,
  type Vehicle,
} from "../api/fleet";



type Tab = "drivers" | "vehicles";

export function FleetPage() {
  const { t } = useTranslation();
  const { api } = useAuth();
  const [driverToRemove, setDriverToRemove] = useState<StaffDriver | null>(null);
  const [tab, setTab] = useState<Tab>("drivers");
  const [drivers, setDrivers] = useState<StaffDriver[]>([]);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [generating, setGenerating] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

const loadDrivers = useCallback(async (signal?: AbortSignal) => {
  const { data } = await fetchDriversRequest(api, signal);
  setDrivers(data);
}, [api]);

const loadInvites = useCallback(async (signal?: AbortSignal) => {
  const { data } = await fetchInvitesRequest(api, signal);
  setInvites(data);
}, [api]);

const loadVehicles = useCallback(async (signal?: AbortSignal) => {
  const { data } = await fetchVehiclesRequest(api, signal);
  setVehicles(data);
}, [api]);

/* eslint-disable react-hooks/set-state-in-effect */
useEffect(() => {
  const controller = new AbortController();
  void loadDrivers(controller.signal);
  void loadInvites(controller.signal);
  void loadVehicles(controller.signal);
  return () => controller.abort();
}, [loadDrivers, loadInvites, loadVehicles]);
/* eslint-enable react-hooks/set-state-in-effect */

const [previewPhoto, setPreviewPhoto] = useState<string | null>(null);

const toggleDriverActive = async (driver: StaffDriver) => {
  await toggleDriverActiveRequest(api, driver.id, !driver.is_active);
  await loadDrivers();
};

const removeDriver = async () => {
  if (!driverToRemove) return;
  await removeDriverRequest(api, driverToRemove.id);
  setDriverToRemove(null);
  await loadDrivers();
};

const handleGenerateInvite = async () => {
  setGenerating(true);
  try {
    await generateInviteRequest(api);
    await loadInvites();
  } finally {
    setGenerating(false);
  }
};

const handleCopy = async (code: string) => {
  await navigator.clipboard.writeText(code);
  setCopiedCode(code);
  setTimeout(() => setCopiedCode(null), 1500);
};

const pendingInvites = invites.filter((i) => !i.used_by);

  return (
    <div className="fleet-page">
      <h1>{t("fleet.title")}</h1>

      <div className="fleet-tabs">
        <div className={`fleet-tab ${tab === "drivers" ? "active" : ""}`} onClick={() => setTab("drivers")}>
          {t("fleet.tabDrivers")}
        </div>
        <div className={`fleet-tab ${tab === "vehicles" ? "active" : ""}`} onClick={() => setTab("vehicles")}>
          {t("fleet.tabVehicles")}
        </div>
      </div>

      {tab === "drivers" && (
        <div className="fleet-content">
          <div className="invite-panel">
            <button type="button" onClick={handleGenerateInvite} disabled={generating}>
              {t("fleet.generateInvite")}
            </button>

            {pendingInvites.map((inv) => (
              <div key={inv.id} className="invite-chip">
                <span className="invite-code">{inv.code}</span>
                <span className="invite-expires">
                  {t("fleet.inviteExpires")}: {new Date(inv.expires_at).toLocaleDateString()}
                </span>
                <button type="button" onClick={() => handleCopy(inv.code)}>
                  {copiedCode === inv.code ? t("fleet.inviteCopied") : t("fleet.inviteCopy")}
                </button>
              </div>
            ))}
          </div>

          {drivers.length === 0 ? (
            <p className="empty-state">{t("fleet.noDrivers")}</p>
          ) : (
            <table className="fleet-table">
              <thead>
                <tr>
                  <th>{t("fleet.driverName")}</th>
                  <th>{t("fleet.driverEmail")}</th>
                  <th>{t("fleet.photoColumn")}</th>
                  <th>{t("fleet.driverStatus")}</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {drivers.map((d) => (
                  <tr key={d.id}>
                    <td>{d.full_name}</td>
                    <td>{d.email}</td>
                <td>
                  {d.license_photo ? (
                    d.license_photo.toLowerCase().endsWith(".pdf") ? (
                      <div
                        className="pdf-thumb"
                        onClick={() => setPreviewPhoto(d.license_photo)}
                        title={t("fleet.viewPdf")}
                      >
                        📄
                      </div>
                    ) : (
                      <img
                        src={d.license_photo}
                        alt=""
                        className="license-thumb"
                        onClick={() => setPreviewPhoto(d.license_photo)}
                      />
                    )
                  ) : "—"}
                </td>
                    <td>{d.is_active ? t("fleet.statusActive") : t("fleet.statusInactive")}</td>
                    <td className="row-actions">
                      <button onClick={() => toggleDriverActive(d)} title={t("fleet.editDriver")}>✏️</button>
                      <button onClick={() => setDriverToRemove(d)} title={t("fleet.removeDriver")}>🗑️</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
      {driverToRemove && (
        <div className="confirm-modal-backdrop" onClick={() => setDriverToRemove(null)}>
          <div className="confirm-modal" onClick={(e) => e.stopPropagation()}>
            <p>{t("fleet.confirmRemove")}</p>
            <p className="confirm-modal-name">{driverToRemove.full_name}</p>
            <div className="confirm-modal-actions">
              <button className="btn-secondary" onClick={() => setDriverToRemove(null)}>
                {t("common.cancel", "Скасувати")}
              </button>
              <button className="btn-danger" onClick={removeDriver}>
                {t("fleet.removeDriver")}
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
      )}

      {tab === "vehicles" && (
        <div className="fleet-content">
          {vehicles.length === 0 ? (
            <p className="empty-state">{t("fleet.noVehicles")}</p>
          ) : (
            <table className="fleet-table">
              <thead>
                <tr>
                  <th>{t("fleet.vehiclePlate")}</th>
                  <th>{t("fleet.vehicleModel")}</th>
                  <th>{t("fleet.vehicleDriver")}</th>
                  <th>{t("fleet.vehicleInsurance")}</th>
                  <th>{t("fleet.vehicleInspection")}</th>
                </tr>
              </thead>
              <tbody>
                {vehicles.map((v) => (
                  <tr key={v.id}>
                    <td>{v.plate_number}</td>
                    <td>{v.brand} {v.model}</td>
                    <td>{v.assigned_driver_name ?? "—"}</td>
                    <td>
                      {v.insurance_expiry ?? "—"}
                      {v.insurance_expiring_soon && (
                        <span className="badge-warning">{t("fleet.expiringSoon")}</span>
                      )}
                    </td>
                    <td>
                      {v.tech_inspection_expiry ?? "—"}
                      {v.tech_inspection_expiring_soon && (
                        <span className="badge-warning">{t("fleet.expiringSoon")}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}