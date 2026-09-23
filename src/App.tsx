import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { PublicLayout } from './layouts/PublicLayout';
import { TeamLeaderLayout } from './layouts/TeamLeaderLayout';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { ADMIN_SECRET_PATH } from './config/admin';

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
import { AdminLiveControlPage } from './pages/admin/AdminLiveControlPage';

export function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* ══════════════════════════════════════════
              PUBLIC ROUTES
              ══════════════════════════════════════════ */}
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

            {/* Team Leader login — accessible publicly */}
            <Route path="/login" element={<TeamLoginPage />} />
            <Route path="/team/login" element={<TeamLoginPage />} />

            {/* Admin login — hidden behind secret route */}
            <Route path={`/${ADMIN_SECRET_PATH}`} element={<AdminLoginPage />} />
          </Route>

          {/* Standalone Projector / Spectator Screen */}
          <Route path="/live" element={<LiveScreenPage />} />

          {/* ══════════════════════════════════════════
              TEAM LEADER PROTECTED ROUTES
              ══════════════════════════════════════════ */}
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

          {/* ══════════════════════════════════════════
              ADMIN PROTECTED ROUTES
              ══════════════════════════════════════════ */}
          <Route element={<ProtectedRoute requiredRole="admin" />}>
            <Route path="/admin" element={<AdminLiveControlPage />} />
            <Route path="/admin/*" element={<Navigate to="/admin" replace />} />
          </Route>

          {/* 404 Fallback */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
export default App;
