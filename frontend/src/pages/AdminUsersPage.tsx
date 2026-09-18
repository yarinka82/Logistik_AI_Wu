
import { useEffect, useState, useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "../auth/AuthContext";
import { fetchAdminUsersRequest, blockUserRequest, unblockUserRequest } from "../api/admin";
import { toast } from "../components/Notifier";
import { Role, type AdminUser } from "../types";
import "./AdminUsersPage.css";

type StatusFilter = "all" | "blocked" | "active";
type SortField = "full_name" | "email" | "role" | "status";
type SortDir = "asc" | "desc";

export function AdminUsersPage() {
  const { t } = useTranslation();
  const { api } = useAuth();

  const [users, setUsers] = useState<AdminUser[]>([]);
  // 1. Инициализируем сразу true
  const [loading, setLoading] = useState(true);
  const [roleFilter, setRoleFilter] = useState<Role | "all">("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [search, setSearch] = useState("");
  const [userToToggle, setUserToToggle] = useState<AdminUser | null>(null);
  const [sort, setSort] = useState<{ field: SortField; dir: SortDir }>({
    field: "full_name",
    dir: "asc",
  });

  const loadUsers = useCallback(
    async (signal?: AbortSignal) => {
      try {
        const { data } = await fetchAdminUsersRequest(
          api,
          {
            role: roleFilter === "all" ? undefined : roleFilter,
            is_blocked: statusFilter === "all" ? undefined : statusFilter === "blocked",
            search: search.trim() || undefined,
          },
          signal
        );
        setUsers(data);
      } catch (err: unknown) {
        if ((err as { name?: string })?.name !== "CanceledError" && (err as { name?: string })?.name !== "AbortError") {
          console.error("Failed to load users:", err);
        }
      } finally {
        setLoading(false);
      }
    },
    [api, roleFilter, statusFilter, search]
  );

useEffect(() => {
  const controller = new AbortController();
  // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch-on-mount, setLoading(false) в finally после await — легитимный паттерн
  loadUsers(controller.signal);
  return () => controller.abort();
}, [loadUsers]);

  const toggleSort = (field: SortField) => {
    setSort((prev) =>
      prev.field === field
        ? { field, dir: prev.dir === "asc" ? "desc" : "asc" }
        : { field, dir: "asc" }
    );
  };

  const sortedUsers = useMemo(() => {
    const getValue = (u: AdminUser): string => {
      switch (sort.field) {
        case "full_name":
          return u.full_name.toLowerCase();
        case "email":
          return u.email.toLowerCase();
        case "role":
          return t(`auth.roles.${u.role}`, { defaultValue: u.role }).toLowerCase();
        case "status":
          return u.is_blocked ? "1" : "0";
      }
    };
    return [...users].sort((a, b) => {
      const cmp = getValue(a).localeCompare(getValue(b));
      return sort.dir === "asc" ? cmp : -cmp;
    });
  }, [users, sort, t]);

  const sortArrow = (field: SortField) =>
    sort.field === field ? (sort.dir === "asc" ? " ↑" : " ↓") : "";

  const handleToggleBlock = async () => {
    if (!userToToggle) return;
    try {
      if (userToToggle.is_blocked) {
        await unblockUserRequest(api, userToToggle.id);
        toast.success(t("admin.userUnblocked", "Користувача розблоковано"));
      } else {
        await blockUserRequest(api, userToToggle.id);
        toast.success(t("admin.userBlocked", "Користувача заблоковано"));
      }
      setUserToToggle(null);
      await loadUsers();
    } catch {
      toast.error(t("admin.actionError", "Не вдалося виконати дію"));
    }
  };

  return (
    <div className="admin-users-page">
      <h1>{t("admin.usersTitle", "Користувачі системи")}</h1>

      <div className="admin-filters">
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value as Role | "all")}
        >
          <option value="all">{t("admin.allRoles", "Усі ролі")}</option>
          {Object.values(Role).map((r) => (
            <option key={r} value={r}>
              {t(`auth.roles.${r}`)}
            </option>
          ))}
        </select>

        <div className="filter-chips">
          <button
            type="button"
            className={`filter-btn ${statusFilter === "all" ? "active" : ""}`}
            onClick={() => setStatusFilter("all")}
          >
            {t("admin.statusAll", "Всі")}
          </button>
          <button
            type="button"
            className={`filter-btn ${statusFilter === "active" ? "active" : ""}`}
            onClick={() => setStatusFilter("active")}
          >
            {t("admin.statusActive", "Активні")}
          </button>
          <button
            type="button"
            className={`filter-btn ${statusFilter === "blocked" ? "active" : ""}`}
            onClick={() => setStatusFilter("blocked")}
          >
            {t("admin.statusBlocked", "Заблоковані")}
          </button>
        </div>

        <input
          type="text"
          placeholder={t("admin.search", "Пошук за email, телефоном...")}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {users.length === 0 ? (
        <p className="empty-state">
          {loading
            ? t("common.loading", "Завантаження...")
            : t("admin.noUsers", "Користувачів не знайдено")}
        </p>
      ) : (
        <table className="fleet-table">
          <thead>
            <tr>
              <th onClick={() => toggleSort("full_name")} style={{ cursor: "pointer" }}>
                {t("admin.name", "ПІБ")}
                {sortArrow("full_name")}
              </th>
              <th onClick={() => toggleSort("email")} style={{ cursor: "pointer" }}>
                {t("admin.email", "Email / Телефон")}
                {sortArrow("email")}
              </th>
              <th onClick={() => toggleSort("role")} style={{ cursor: "pointer" }}>
                {t("admin.role", "Роль")}
                {sortArrow("role")}
              </th>
              <th onClick={() => toggleSort("status")} style={{ cursor: "pointer" }}>
                {t("admin.status", "Статус")}
                {sortArrow("status")}
              </th>
              <th style={{ textAlign: "right", width: "110px" }}>
                {t("admin.actions", "Дії")}
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedUsers.map((u) => (
              <tr key={u.id}>
                <td>
                  <strong>{u.full_name}</strong>
                </td>
                <td>
                  <div>{u.email}</div>
                  {u.phone && <small style={{ color: "#666" }}>{u.phone}</small>}
                </td>
                <td>{t(`auth.roles.${u.role}`)}</td>
                <td>
                  {u.is_blocked ? (
                    <span className="badge-danger">{t("admin.blocked", "Заблоковано")}</span>
                  ) : (
                    <span className="badge-success">{t("admin.active", "Активний")}</span>
                  )}
                </td>
                <td style={{ textAlign: "right", width: "110px" }}>
                  {u.role === Role.Admin ? (
                    <span style={{ color: "var(--ink-soft)", fontSize: "13px" }}>—</span>
                  ) : (
                    <button
                      className={u.is_blocked ? "btn-primary" : "btn-danger"}
                      onClick={() => setUserToToggle(u)}
                    >
                      {u.is_blocked
                        ? t("admin.unblock", "Розблокувати")
                        : t("admin.block", "Заблокувати")}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {userToToggle && (
        <div
          className="confirm-modal-backdrop"
          onClick={() => setUserToToggle(null)}
        >
          <div className="confirm-modal" onClick={(e) => e.stopPropagation()}>
            <p>
              {userToToggle.is_blocked
                ? t("admin.confirmUnblock", "Розблокувати користувача?")
                : t("admin.confirmBlock", "Заблокувати користувача?")}
            </p>
            <p className="confirm-modal-name">
              <strong>{userToToggle.full_name}</strong>
            </p>
            <div className="confirm-modal-actions">
              <button
                className="btn-secondary"
                onClick={() => setUserToToggle(null)}
              >
                {t("common.cancel", "Скасувати")}
              </button>
              <button
                className={userToToggle.is_blocked ? "btn-primary" : "btn-danger"}
                onClick={handleToggleBlock}
              >
                {userToToggle.is_blocked
                  ? t("admin.unblock", "Розблокувати")
                  : t("admin.block", "Заблокувати")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}