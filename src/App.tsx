import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { PublicLayout } from './layouts/PublicLayout';
import { DashboardLayout } from './layouts/DashboardLayout';
import { AdminLayout } from './layouts/AdminLayout';
import { ProtectedRoute } from './components/auth/ProtectedRoute';

// Public Pages
import { HomePage } from './pages/HomePage';
import { AboutPage } from './pages/AboutPage';
import { EditionsPage } from './pages/EditionsPage';
import { EditionDetailPage } from './pages/EditionDetailPage';
import { TeamsPage } from './pages/TeamsPage';
import { TeamDetailPage } from './pages/TeamDetailPage';
import { RoundsPage } from './pages/RoundsPage';
import { LeaderboardPage } from './pages/LeaderboardPage';
import { ResultsPage } from './pages/ResultsPage';
import { SchedulePage } from './pages/SchedulePage';
import { RulesPage } from './pages/RulesPage';
import { WinnersPage } from './pages/WinnersPage';
import { GalleryPage } from './pages/GalleryPage';
import { AnnouncementsPage } from './pages/AnnouncementsPage';
import { OrganizersPage } from './pages/OrganizersPage';
import { ContactPage } from './pages/ContactPage';
import { VerifyCertificatePage } from './pages/VerifyCertificatePage';
import { PrivacyPage, TermsPage } from './pages/LegalPages';
import { LoginPage } from './pages/LoginPage';
import { NotFoundPage } from './pages/NotFoundPage';

// Participant & Captain Pages
import { ParticipantDashboard } from './pages/dashboard/ParticipantDashboard';
import { TeamDashboard } from './pages/dashboard/TeamDashboard';
import { TeamMembersPage } from './pages/dashboard/TeamMembersPage';
import { CaptainCertificatesPage } from './pages/dashboard/CaptainCertificatesPage';
import { LiveAuctionPage } from './pages/competition/LiveAuctionPage';
import { LiveQuizPage } from './pages/competition/LiveQuizPage';

// Admin Pages
import { AdminOverviewPage } from './pages/admin/AdminOverviewPage';
import { AdminEditionsPage } from './pages/admin/AdminEditionsPage';
import { AdminTeamsPage } from './pages/admin/AdminTeamsPage';
import { AdminParticipantsPage } from './pages/admin/AdminParticipantsPage';
import { AdminRoundsPage } from './pages/admin/AdminRoundsPage';
import { AdminQuestionsPage } from './pages/admin/AdminQuestionsPage';
import { AdminQuizControlPage } from './pages/admin/AdminQuizControlPage';
import { AdminAuctionControlPage } from './pages/admin/AdminAuctionControlPage';
import { AdminLeaderboardPage } from './pages/admin/AdminLeaderboardPage';
import { AdminResultsPage } from './pages/admin/AdminResultsPage';
import { AdminCertificatesPage } from './pages/admin/AdminCertificatesPage';
import { AdminSchedulePage } from './pages/admin/AdminSchedulePage';
import { AdminAnnouncementsPage } from './pages/admin/AdminAnnouncementsPage';
import { AdminGalleryPage } from './pages/admin/AdminGalleryPage';
import { AdminOrganizersPage } from './pages/admin/AdminOrganizersPage';
import { AdminAnalyticsPage } from './pages/admin/AdminAnalyticsPage';
import { AdminSettingsPage } from './pages/admin/AdminSettingsPage';
import { AdminAuditLogsPage } from './pages/admin/AdminAuditLogsPage';

export function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public GCL Platform Routes */}
          <Route element={<PublicLayout />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="/editions" element={<EditionsPage />} />
            <Route path="/editions/:year" element={<EditionDetailPage />} />
            <Route path="/teams" element={<TeamsPage />} />
            <Route path="/teams/:id" element={<TeamDetailPage />} />
            <Route path="/rounds" element={<RoundsPage />} />
            <Route path="/leaderboard" element={<LeaderboardPage />} />
            <Route path="/results" element={<ResultsPage />} />
            <Route path="/schedule" element={<SchedulePage />} />
            <Route path="/rules" element={<RulesPage />} />
            <Route path="/winners" element={<WinnersPage />} />
            <Route path="/gallery" element={<GalleryPage />} />
            <Route path="/announcements" element={<AnnouncementsPage />} />
            <Route path="/organizers" element={<OrganizersPage />} />
            <Route path="/contact" element={<ContactPage />} />
            <Route path="/verify/:certificateId" element={<VerifyCertificatePage />} />
            <Route path="/privacy" element={<PrivacyPage />} />
            <Route path="/terms" element={<TermsPage />} />
            <Route path="/login" element={<LoginPage />} />
          </Route>

          {/* Protected Participant & Captain Routes */}
          <Route element={<ProtectedRoute />}>
            <Route element={<DashboardLayout />}>
              <Route path="/dashboard" element={<ParticipantDashboard />} />
              <Route path="/team" element={<TeamDashboard />} />
              <Route path="/team/members" element={<TeamMembersPage />} />
              <Route path="/team/certificates" element={<CaptainCertificatesPage />} />
              <Route path="/team/auction" element={<LiveAuctionPage />} />
              <Route path="/team/quiz/:roundId" element={<LiveQuizPage />} />
            </Route>
          </Route>

          {/* Protected Admin Console Routes */}
          <Route element={<ProtectedRoute requiredRole="admin" />}>
            <Route element={<AdminLayout />}>
              <Route path="/admin" element={<AdminOverviewPage />} />
              <Route path="/admin/editions" element={<AdminEditionsPage />} />
              <Route path="/admin/teams" element={<AdminTeamsPage />} />
              <Route path="/admin/participants" element={<AdminParticipantsPage />} />
              <Route path="/admin/rounds" element={<AdminRoundsPage />} />
              <Route path="/admin/questions" element={<AdminQuestionsPage />} />
              <Route path="/admin/quiz" element={<AdminQuizControlPage />} />
              <Route path="/admin/auction" element={<AdminAuctionControlPage />} />
              <Route path="/admin/leaderboard" element={<AdminLeaderboardPage />} />
              <Route path="/admin/results" element={<AdminResultsPage />} />
              <Route path="/admin/certificates" element={<AdminCertificatesPage />} />
              <Route path="/admin/schedule" element={<AdminSchedulePage />} />
              <Route path="/admin/announcements" element={<AdminAnnouncementsPage />} />
              <Route path="/admin/gallery" element={<AdminGalleryPage />} />
              <Route path="/admin/organizers" element={<AdminOrganizersPage />} />
              <Route path="/admin/analytics" element={<AdminAnalyticsPage />} />
              <Route path="/admin/settings" element={<AdminSettingsPage />} />
              <Route path="/admin/audit-logs" element={<AdminAuditLogsPage />} />
            </Route>
          </Route>

          {/* Catch-all 404 */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
