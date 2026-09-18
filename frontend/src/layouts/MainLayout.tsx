import { Outlet, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../auth/AuthContext";
import { Role } from "../types";
import { Sidebar } from "../components/Sidebar";
import "./MainLayout.css";
import {LanguageSwitch} from "../components/LanguageSwitch.tsx";

export function MainLayout() {
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const navigate = useNavigate();

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
      <Sidebar />

      {/* Основная правая область */}
      <div className="app-main">
        <header className="topbar">
          <LanguageSwitch />

          {/* Плашка пользователя */}
          <div
            className="user-profile-btn"
            onClick={() => navigate("/profile")}
            title={t("profile.editTitle", { defaultValue: "Налаштування профілю" })}
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

        {/* Контент активной страницы */}
        <main className="main-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default MainLayout;