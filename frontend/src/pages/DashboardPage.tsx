
import React from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "../auth/AuthContext";

export const DashboardPage: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuth();

  return (
    <div style={styles.heroSection}>
      <div style={styles.heroOverlay} />

      <div style={styles.heroContent}>
        <span style={styles.badge}>
          🚚 {t("dashboard.systemActive", "Система логістики активна")}
        </span>

        <h1 style={styles.title}>
          {t("dashboard.welcome", "Ласкаво просимо")},{" "}
          <span style={{ color: "#00d2b4" }}>{user?.username || "Партнер"}</span>!
        </h1>

        <p style={styles.subtitle}>
          {t(
            "dashboard.heroDesc",
            "Єдина платформа управління вантажними автоперевезеннями по Німеччині та Європі."
          )}
        </p>

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
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  heroSection: {
    position: "relative",
    flex: 1,
    minHeight: "calc(100vh - 65px)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    backgroundImage: `url('https://images.unsplash.com/photo-1601584115197-04ecc0da31d7?q=80&w=2070&auto=format&fit=crop')`,
    backgroundSize: "cover",
    backgroundPosition: "center",
    padding: "40px 20px",
  },
  heroOverlay: {
    position: "absolute",
    inset: 0,
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