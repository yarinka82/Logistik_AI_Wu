
import React from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "../auth/AuthContext";
import { LanguageSwitch } from "../i18n/LanguageSwitch";

export const DashboardPage: React.FC = () => {
  const { t } = useTranslation();
  const { user, logout } = useAuth();

  return (
    <div style={styles.container}>
      {/* Верхняя навигационная панель */}
      <header style={styles.header}>
        <div style={styles.brand}>
          Fracht<span style={{ color: "#00d2b4" }}>.</span>Markt
        </div>

        <div style={styles.headerActions}>
          <LanguageSwitch />

          <div style={styles.userInfo}>
            <div style={styles.userAvatar}>
              {(user?.username?.[0] || user?.email?.[0] || "U").toUpperCase()}
            </div>
            <div>
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

      {/* Hero Баннер с фото грузоперевозок */}
      <main style={styles.heroSection}>
        <div style={styles.heroOverlay} />

        <div style={styles.heroContent}>
          <span style={styles.badge}>
            🚚 {t("dashboard.systemActive", "Система логістики активна")}
          </span>

          <h1 style={styles.title}>
            {t("dashboard.welcome", "Ласкаво просимо до кабінету")},{" "}
            <span style={{ color: "#00d2b4" }}>{user?.username || "Партнер"}</span>!
          </h1>

          <p style={styles.subtitle}>
            {t(
              "dashboard.heroDesc",
              "Єдина платформа управління вантажними автоперевезеннями по Німеччині та Європі."
            )}
          </p>

          {/* Быстрые карточки статуса */}
          <div style={styles.statsGrid}>
            <div style={styles.statCard}>
              <div style={styles.statNumber}>1.240+</div>
              <div style={styles.statLabel}>{t("auth.statsRequests", "Активних рейсів")}</div>
            </div>
            <div style={styles.statCard}>
              <div style={styles.statNumber}>380</div>
              <div style={styles.statLabel}>{t("auth.statsDrivers", "Водіїв на лінії")}</div>
            </div>
            <div style={styles.statCard}>
              <div style={styles.statNumber}>16</div>
              <div style={styles.statLabel}>{t("auth.statsCoverage", "Федеральних земель")}</div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

// Inline-стили для быстрой и автономной работы
const styles: Record<string, React.CSSProperties> = {
  container: {
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
    padding: "16px 32px",
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
  },
  headerActions: {
    display: "flex",
    alignItems: "center",
    gap: "24px",
  },
  userInfo: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
  },
  userAvatar: {
    width: "36px",
    height: "36px",
    borderRadius: "50%",
    backgroundColor: "#00d2b4",
    color: "#0d1117",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 700,
    fontSize: "14px",
  },
  userName: {
    fontSize: "14px",
    fontWeight: 600,
  },
  userRole: {
    fontSize: "12px",
    color: "#8b949e",
    textTransform: "capitalize",
  },
  logoutBtn: {
    backgroundColor: "transparent",
    border: "1px solid rgba(255, 255, 255, 0.2)",
    color: "#fff",
    padding: "8px 16px",
    borderRadius: "8px",
    cursor: "pointer",
    fontSize: "13px",
    fontWeight: 500,
    transition: "all 0.2s ease",
  },
  heroSection: {
    position: "relative",
    flex: 1,
    minHeight: "calc(100vh - 70px)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    // Фото современного грузовика на трассе (Unsplash)
    backgroundImage: `url('https://images.unsplash.com/photo-1601584115197-04ecc0da31d7?q=80&w=2070&auto=format&fit=crop')`,
    backgroundSize: "cover",
    backgroundPosition: "center",
    padding: "40px 20px",
  },
  heroOverlay: {
    position: "absolute",
    inset: 0,
    // Градиентное затемнение, чтобы текст идеально читался
    background: "linear-gradient(135deg, rgba(13, 17, 23, 0.92) 0%, rgba(13, 17, 23, 0.7) 100%)",
  },
  heroContent: {
    position: "relative",
    zIndex: 1,
    maxWidth: "800px",
    textAlign: "center",
  },
  badge: {
    display: "inline-block",
    padding: "6px 14px",
    backgroundColor: "rgba(0, 210, 180, 0.15)",
    border: "1px solid rgba(0, 210, 180, 0.3)",
    color: "#00d2b4",
    borderRadius: "20px",
    fontSize: "13px",
    fontWeight: 600,
    marginBottom: "20px",
  },
  title: {
    fontSize: "40px",
    fontWeight: 800,
    letterSpacing: "-0.03em",
    lineHeight: 1.2,
    marginBottom: "16px",
  },
  subtitle: {
    fontSize: "18px",
    color: "#c9d1d9",
    lineHeight: 1.6,
    marginBottom: "40px",
  },
  statsGrid: {
    display: "flex",
    justifyContent: "center",
    gap: "20px",
    flexWrap: "wrap",
  },
  statCard: {
    backgroundColor: "rgba(22, 27, 34, 0.8)",
    backdropFilter: "blur(8px)",
    border: "1px solid rgba(255, 255, 255, 0.1)",
    padding: "20px 30px",
    borderRadius: "14px",
    minWidth: "160px",
  },
  statNumber: {
    fontSize: "26px",
    fontWeight: 800,
    color: "#00d2b4",
    marginBottom: "4px",
  },
  statLabel: {
    fontSize: "13px",
    color: "#8b949e",
  },
};