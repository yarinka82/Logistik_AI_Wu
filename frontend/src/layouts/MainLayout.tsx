import React from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../auth/AuthContext";
import { LanguageSwitch } from "../i18n/LanguageSwitch";

export const MainLayout: React.FC = () => {
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <div style={styles.layoutContainer}>
      {/* 1. Глобальная шапка приложения */}
      <header style={styles.header}>
        {/* Логотип со ссылкой на главную */}
        <div style={styles.brand} onClick={() => navigate("/")}>
          Fracht<span style={{ color: "#00d2b4" }}>.</span>Markt
        </div>

        <div style={styles.headerActions}>
          <LanguageSwitch />

          {/* Кликабельный блок профиля пользователя */}
          <div
            style={styles.userProfileBtn}
            onClick={() => navigate("/profile")}
            title={t("profile.editTitle", "Налаштування профілю")}
          >
            <div style={styles.userAvatar}>
              {(user?.username?.[0] || user?.email?.[0] || "U").toUpperCase()}
            </div>
            <div style={styles.userText}>
              <div style={styles.userName}>{user?.username || user?.email}</div>
              <div style={styles.userRole}>
                {user?.role ? t(`auth.roles.${user.role}`, user.role) : "User"}
              </div>
            </div>
          </div>

          <button onClick={logout} style={styles.logoutBtn}>
            {t("auth.logout", "Вийти")}
          </button>
        </div>
      </header>

      {/* 2. Контент текущей страницы (Dashboard, Profile и т.д.) */}
      <main style={styles.mainContent}>
        <Outlet />
      </main>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  layoutContainer: {
    minHeight: "100vh",
    backgroundColor: "#0d1117",
    color: "#fff",
    fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    display: "flex",
    flexDirection: "column",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "14px 32px",
    backgroundColor: "rgba(13, 17, 23, 0.95)",
    borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
    position: "sticky",
    top: 0,
    zIndex: 100,
  },
  brand: {
    fontSize: "22px",
    fontWeight: 800,
    letterSpacing: "-0.5px",
    cursor: "pointer",
    userSelect: "none",
  },
  headerActions: {
    display: "flex",
    alignItems: "center",
    gap: "20px",
  },
  userProfileBtn: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    cursor: "pointer",
    padding: "6px 12px",
    borderRadius: "10px",
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    border: "1px solid rgba(255, 255, 255, 0.1)",
    transition: "all 0.2s ease",
  },
  userAvatar: {
    width: "32px",
    height: "32px",
    borderRadius: "50%",
    backgroundColor: "#00d2b4",
    color: "#0d1117",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 700,
    fontSize: "13px",
  },
  userText: {
    textAlign: "left",
  },
  userName: {
    fontSize: "13px",
    fontWeight: 600,
    lineHeight: 1.2,
  },
  userRole: {
    fontSize: "11px",
    color: "#8b949e",
    textTransform: "capitalize",
    lineHeight: 1.2,
  },
  logoutBtn: {
    backgroundColor: "transparent",
    border: "1px solid rgba(255, 255, 255, 0.2)",
    color: "#fff",
    padding: "7px 14px",
    borderRadius: "8px",
    cursor: "pointer",
    fontSize: "13px",
    fontWeight: 500,
  },
  mainContent: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
  },
};