
import { NavLink, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../auth/AuthContext";
import { Role } from "../types";
import {ThemeToggle} from "../theme/ThemeToggle.tsx";

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
  {
    to: "/admin/users",
    label: "adminUsers",
    fallback: "Користувачі",
    end: false,
    roles: [Role.Admin],
  },
  {
    to: "/profile",
    label: "profile",
    fallback: "Профіль",
    end: false,
    roles: null
  },
];

export function Sidebar() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();

  // Filter the menu items depending on the user's role
  const visibleNav = NAV_ITEMS.filter(
    (item) => !item.roles || (user && item.roles.includes(user.role))
  );

  return (
    <aside className="sidebar">
      {/*Logo*/}
      <div className="brand" onClick={() => navigate("/")} style={{ cursor: "pointer" }}>
        Fracht<span className="brand-dot">.</span>Markt
      </div>

      {/*Navigation*/}
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

      {/*Footer Sidebar with Theme Switcher*/}
      <div className="sidebar-footer">
        <ThemeToggle />
      </div>
    </aside>
  );
}

export default Sidebar;