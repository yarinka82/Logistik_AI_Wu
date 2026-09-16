import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../auth/AuthContext";
import { Role } from "../auth/types";
import {ThemeToggle} from "../theme/ThemeToggle.tsx";
import {LanguageSwitch} from "../i18n/LanguageSwitch.tsx";
import "./MainLayout.css";

interface NavItem {
  to: string;
  label: string;
  fallback: string;
  end: boolean;
  roles: Role[] | null;
}

const NAV_ITEMS: NavItem[] = [
  { to: "/", label: "dashboard", fallback: "Дашборд", end: true, roles: null },
  {
    to: "/fleet",
    label: "fleet",
    fallback: "Мій автопарк",
    end: false,
    roles: [Role.CarrierCompany, Role.Driver]
  },
  {
    to: "/accountant",
    label: "accountant",
    fallback: "Бухгалтерія",
    end: false,
    roles: [Role.Accountant, Role.Admin],
  },
];

export function MainLayout() {
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const visibleNav = NAV_ITEMS.filter(
    (item) => !item.roles || (user && item.roles.includes(user.role))
  );

  const getRoleLabel = (role?: Role): string => {
    if (!role) return "User";

    switch (role) {
      case Role.CarrierCompany:
        return t("auth.roles.carrier_company", { defaultValue: "Перевізник (Компанія)" });
      case Role.Driver:
        return t("auth.roles.driver", { defaultValue: "Водій" });
      case Role.ClientCompany:
        return t("auth.roles.client_company", { defaultValue: "Клієнт (Компанія)" });
      case Role.ClientIndividual:
        return t("auth.roles.client_individual", { defaultValue: "Клієнт (Фіз. особа)" });
      case Role.Accountant:
        return t("auth.roles.accountant", { defaultValue: "Бухгалтер" });
      case Role.Admin:
        return t("auth.roles.admin", { defaultValue: "Адміністратор" });
      default: {
        const key = `auth.roles.${role}`;
        return t(key, { defaultValue: role });
      }
    }
  };

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand" onClick={() => navigate("/")} style={{ cursor: "pointer" }}>
          Fracht<span className="brand-dot">.</span>Markt
        </div>

        <nav className="sidebar-nav">
          {visibleNav.map((item) => {
            const navKey = `nav.${item.label}`;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) => `sidebar-link ${isActive ? "active" : ""}`}
              >
                {t(navKey, { defaultValue: item.fallback })}
              </NavLink>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          <ThemeToggle />
        </div>
      </aside>

      <div className="app-main">
        <header className="topbar">
          <LanguageSwitch />

          <div
            className="user-profile-btn"
            onClick={() => navigate("/profile")}
            title={t("profile.editTitle", { defaultValue: "Налаштування профілю" })}
            style={{ cursor: "pointer" }}
          >
            <div className="user-avatar">
              {(user?.username?.[0] || user?.email?.[0] || "U").toUpperCase()}
            </div>
            <div className="user-text">
              <div className="user-name">{user?.username || user?.email}</div>
              <div className="user-role">{getRoleLabel(user?.role)}</div>
            </div>
          </div>

          <button onClick={logout} className="logout-btn">
            {t("auth.logout", { defaultValue: "Вийти" })}
          </button>
        </header>

        <main className="main-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}