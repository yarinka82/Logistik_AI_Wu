import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../auth/AuthContext";
import { LanguageSwitch } from "../i18n/LanguageSwitch";
import { ThemeToggle } from "../theme/ThemeToggle";
import { Role } from "../auth/types";
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
  { to: "/fleet", label: "fleet", fallback: "Мій автопарк", end: false, roles: [Role.Driver] },
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

  const visibleNav = NAV_ITEMS.filter((item) => !item.roles || (user && item.roles.includes(user.role)));

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand" onClick={() => navigate("/")}>
          Fracht<span className="brand-dot">.</span>Markt
        </div>

        <nav className="sidebar-nav">
          {visibleNav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => `sidebar-link ${isActive ? "active" : ""}`}
            >
              {t(`nav.${item.label}`, item.fallback)}
            </NavLink>
          ))}
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
            title={t("profile.editTitle", "Налаштування профілю")}
          >
            <div className="user-avatar">
              {(user?.username?.[0] || user?.email?.[0] || "U").toUpperCase()}
            </div>
            <div className="user-text">
              <div className="user-name">{user?.username || user?.email}</div>
              <div className="user-role">{user?.role ? t(`auth.roles.${user.role}`, user.role) : "User"}</div>
            </div>
          </div>

          <button onClick={logout} className="logout-btn">
            {t("auth.logout", "Вийти")}
          </button>
        </header>

        <main className="main-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}