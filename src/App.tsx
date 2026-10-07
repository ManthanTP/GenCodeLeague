import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import LiveView from './views/LiveView';
import LandingPage from './views/LandingPage';
import AdminPanel from './views/AdminPanel';
import AdminLogin from './views/AdminLogin';
import TeamConsole from './views/TeamConsole';
import TeamLogin from './views/TeamLogin';
import VerifyCertificate from './views/VerifyCertificate';
import StudentCertificateLookup from './views/StudentCertificateLookup';
import BulkCertificates from './views/BulkCertificates';
import HallOfFame from './views/HallOfFame';
import EditionDetail from './views/EditionDetail';
import TeamProfile from './views/TeamProfile';
import GalleryView from './views/GalleryView';
import AnnouncementsView from './views/AnnouncementsView';
import FaqView from './views/FaqView';

function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/live" element={<LiveView />} />
      <Route path="/verify/:certificateId" element={<VerifyCertificate />} />
      <Route path="/my-certificates" element={<StudentCertificateLookup />} />
      <Route path="/hall-of-fame" element={<HallOfFame />} />
      <Route path="/editions/:editionId" element={<EditionDetail />} />
      <Route path="/teams" element={<Navigate to="/#teams" replace />} />
      <Route path="/teams/:teamId" element={<TeamProfile />} />
      <Route path="/gallery" element={<GalleryView />} />
      <Route path="/announcements" element={<AnnouncementsView />} />
      <Route path="/faq" element={<FaqView />} />
      <Route path="/admin" element={<Navigate to="/123456789/GCL-0321/admin" replace />} />
      <Route path="/admin/login" element={<Navigate to="/123456789/GCL-0321/admin/login" replace />} />
      <Route path="/admin/certificates/bulk" element={<Navigate to="/123456789/GCL-0321/admin/certificates/bulk" replace />} />
      <Route path="/123456789/GCL-0321/admin/login" element={<AdminLogin />} />
      <Route path="/123456789/GCL-0321/admin" element={<AdminPanel />} />
      <Route
        path="/123456789/GCL-0321/admin/certificates/bulk"
        element={<BulkCertificates />}
      />
      <Route path="/team" element={<TeamConsole />} />
      <Route path="/team-login" element={<TeamLogin />} />
    </Routes>
  );
}

export default App;
