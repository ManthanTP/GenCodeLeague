import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { PublicLayout } from './layouts/PublicLayout';
import { TeamLeaderLayout } from './layouts/TeamLeaderLayout';
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
import { HallOfFamePage } from './pages/HallOfFamePage';
import { LiveScreenPage } from './pages/LiveScreenPage';
import { PrivacyPage, TermsPage } from './pages/LegalPages';
import { LoginPage } from './pages/LoginPage';
import { TeamLoginPage } from './pages/auth/TeamLoginPage';
import { AdminLoginPage } from './pages/auth/AdminLoginPage';
import { NotFoundPage } from './pages/NotFoundPage';

// Team Leader Console Pages
import { TeamDashboard } from './pages/dashboard/TeamDashboard';
import { TeamMembersPage } from './pages/dashboard/TeamMembersPage';
import { TeamRosterPage } from './pages/dashboard/TeamRosterPage';
import { TeamResultsPage } from './pages/dashboard/TeamResultsPage';
import { CaptainCertificatesPage } from './pages/dashboard/CaptainCertificatesPage';
import { LiveAuctionPage } from './pages/competition/LiveAuctionPage';
import { LiveQuizPage } from './pages/competition/LiveQuizPage';

// Admin Operations Pages
import { AdminOverviewPage } from './pages/admin/AdminOverviewPage';
import { AdminLiveControlPage } from './pages/admin/AdminLiveControlPage';
import { AdminAuctionControlPage } from './pages/admin/AdminAuctionControlPage';
import { AdminScoreboardPage } from './pages/admin/AdminScoreboardPage';
import { AdminTieBreakerPage } from './pages/admin/AdminTieBreakerPage';
import { AdminWinnerRevealPage } from './pages/admin/AdminWinnerRevealPage';
import { AdminEditionsPage } from './pages/admin/AdminEditionsPage';
import { AdminTeamsPage } from './pages/admin/AdminTeamsPage';
import { AdminRoundsPage } from './pages/admin/AdminRoundsPage';
import { AdminQuestionsPage } from './pages/admin/AdminQuestionsPage';
import { AdminQuizControlPage } from './pages/admin/AdminQuizControlPage';
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
          {/* Public Tournament Platform Routes */}
          <Route element={<PublicLayout />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="/editions" element={<EditionsPage />} />
            <Route path="/editions/:year" element={<EditionDetailPage />} />
            <Route path="/edition/:year" element={<EditionDetailPage />} />
            <Route path="/edition/:year/teams" element={<TeamsPage />} />
            <Route path="/edition/:year/teams/:id" element={<TeamDetailPage />} />
            <Route path="/edition/:year/rounds" element={<RoundsPage />} />
            <Route path="/edition/:year/results" element={<ResultsPage />} />
            <Route path="/edition/:year/rules" element={<RulesPage />} />
            <Route path="/edition/:year/schedule" element={<SchedulePage />} />
            <Route path="/teams" element={<TeamsPage />} />
            <Route path="/teams/:id" element={<TeamDetailPage />} />
            <Route path="/rounds" element={<RoundsPage />} />
            <Route path="/leaderboard" element={<LeaderboardPage />} />
            <Route path="/results" element={<ResultsPage />} />
            <Route path="/schedule" element={<SchedulePage />} />
            <Route path="/rules" element={<RulesPage />} />
            <Route path="/winners" element={<WinnersPage />} />
            <Route path="/hall-of-fame" element={<HallOfFamePage />} />
            <Route path="/gallery" element={<GalleryPage />} />
            <Route path="/announcements" element={<AnnouncementsPage />} />
            <Route path="/organizers" element={<OrganizersPage />} />
            <Route path="/contact" element={<ContactPage />} />
            <Route path="/verify/:certificateId" element={<VerifyCertificatePage />} />
            <Route path="/privacy" element={<PrivacyPage />} />
            <Route path="/terms" element={<TermsPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/team/login" element={<TeamLoginPage />} />
            <Route path="/admin/login" element={<AdminLoginPage />} />
          </Route>

          {/* Standalone Projector / Spectator Screen */}
          <Route path="/live" element={<LiveScreenPage />} />

          {/* Protected Team Leader Console Routes */}
          <Route element={<ProtectedRoute requiredRole="team_leader" />}>
            <Route element={<TeamLeaderLayout />}>
              <Route path="/team" element={<Navigate to="/team/dashboard" replace />} />
              <Route path="/team/dashboard" element={<TeamDashboard />} />
              <Route path="/team/competition" element={<LiveQuizPage />} />
              <Route path="/team/auction" element={<LiveAuctionPage />} />
              <Route path="/team/roster" element={<TeamRosterPage />} />
              <Route path="/team/results" element={<TeamResultsPage />} />
              <Route path="/team/members" element={<TeamMembersPage />} />
              <Route path="/team/certificates" element={<CaptainCertificatesPage />} />
            </Route>
          </Route>

          {/* Protected Admin Operations Console Routes */}
          <Route element={<ProtectedRoute requiredRole="admin" />}>
            <Route element={<AdminLayout />}>
              <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
              <Route path="/admin/dashboard" element={<AdminOverviewPage />} />
              <Route path="/admin/live-control" element={<AdminLiveControlPage />} />
              <Route path="/admin/auction" element={<AdminAuctionControlPage />} />
              <Route path="/admin/scoreboard" element={<AdminScoreboardPage />} />
              <Route path="/admin/tie-breaker" element={<AdminTieBreakerPage />} />
              <Route path="/admin/winner-reveal" element={<AdminWinnerRevealPage />} />
              <Route path="/admin/editions" element={<AdminEditionsPage />} />
              <Route path="/admin/teams" element={<AdminTeamsPage />} />
              <Route path="/admin/rounds" element={<AdminRoundsPage />} />
              <Route path="/admin/questions" element={<AdminQuestionsPage />} />
              <Route path="/admin/quiz" element={<AdminQuizControlPage />} />
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

          {/* 404 Fallback */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
export default App;
