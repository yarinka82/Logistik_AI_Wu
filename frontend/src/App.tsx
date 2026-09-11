import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./auth/AuthContext";
import { ProtectedRoute } from "./auth/ProtectedRoute";
import { Role } from "./auth/types";
import { LoginPage } from "./pages/LoginPage";
import { RegisterPage } from "./pages/RegisterPage";
import { DashboardPage } from "./pages/DashboardPage";
import { ProfilePage } from "./pages/ProfilePage";
import { AccountantPage } from "./pages/AccountantPage";
import { ForgotPasswordPage } from "./pages/ForgotPasswordPage";
import { ResetPasswordConfirmPage } from "./pages/ResetPasswordConfirmPage";

import { MainLayout } from "./layouts/MainLayout";
import Notifier from "./components/Notifier";

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Notifier />

        <Routes>
          {/*Public Pages*/}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password/:uid/:token" element={<ResetPasswordConfirmPage />} />

          {/*Protected pages inside MainLayout*/}
          <Route
            element={
              <ProtectedRoute>
                <MainLayout />
              </ProtectedRoute>
            }
          >
            <Route path="/" element={<DashboardPage />} />
            <Route path="/profile" element={<ProfilePage />} />

            {/*Access only for accountant and admin*/}
            <Route
              path="/accountant"
              element={
                <ProtectedRoute allowedRoles={[Role.Accountant, Role.Admin]}>
                  <AccountantPage />
                </ProtectedRoute>
              }
            />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}