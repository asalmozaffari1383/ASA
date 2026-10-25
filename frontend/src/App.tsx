import { Navigate, Route, Routes } from "react-router-dom";
import { LoginPage } from "./pages/auth/LoginPage";
import { ProtectedRoute } from "./auth/ProtectedRoute";
import { DashboardLayout } from "./components/layout/DashboardLayout";
import { SecretaryPanel } from "./pages/secretary/SecretaryPanel";
import { ExpertWorkspace } from "./pages/expert/ExpertWorkspace";
import { FinancialGrid } from "./pages/ceo/FinancialGrid";
import { CertificateCenter } from "./pages/ceo/CertificateCenter";
import { ProfileSettings } from "./pages/settings/ProfileSettings";
import { SiteContent } from "./pages/ceo/SiteContent";
import { SiteContact } from "./pages/ceo/SiteContact";
import { SitePartners } from "./pages/ceo/SitePartners";
import { BotSettingsPage } from "./pages/ceo/BotSettings";

export default function App() {
  return (
    <Routes>
      {/* Staff-only admin panel: public intake/tracking lives on the main site. */}
      <Route path="/" element={<Navigate to="/panel" replace />} />
      <Route path="/login" element={<LoginPage />} />

      {/* Staff panel */}
      <Route
        path="/panel"
        element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="secretary" replace />} />
        <Route
          path="secretary"
          element={
            <ProtectedRoute permission="can_fill_bale_forms">
              <SecretaryPanel />
            </ProtectedRoute>
          }
        />
        <Route
          path="expert"
          element={
            <ProtectedRoute permission="can_do_inspection">
              <ExpertWorkspace />
            </ProtectedRoute>
          }
        />
        <Route
          path="ceo/financial"
          element={
            <ProtectedRoute permission="can_manage_financial">
              <FinancialGrid />
            </ProtectedRoute>
          }
        />
        <Route
          path="ceo/certificates"
          element={
            <ProtectedRoute permission="can_issue_certificate">
              <CertificateCenter />
            </ProtectedRoute>
          }
        />
        <Route path="ceo/site-content" element={<ProtectedRoute ceoOnly><SiteContent /></ProtectedRoute>} />
        <Route path="ceo/site-contact" element={<ProtectedRoute ceoOnly><SiteContact /></ProtectedRoute>} />
        <Route path="ceo/site-partners" element={<ProtectedRoute ceoOnly><SitePartners /></ProtectedRoute>} />
        <Route path="ceo/bot-settings" element={<ProtectedRoute ceoOnly><BotSettingsPage /></ProtectedRoute>} />
        <Route path="settings" element={<ProfileSettings />} />
      </Route>

      <Route path="*" element={<Navigate to="/panel" replace />} />
    </Routes>
  );
}
