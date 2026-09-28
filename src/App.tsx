import React from 'react';
import { Routes, Route } from 'react-router-dom';
import LiveView from './views/LiveView';
import AdminPanel from './views/AdminPanel';
import AdminLogin from './views/AdminLogin';
import TeamConsole from './views/TeamConsole';
import TeamLogin from './views/TeamLogin';
import VerifyCertificate from './views/VerifyCertificate';
import StudentCertificateLookup from './views/StudentCertificateLookup';
import BulkCertificates from './views/BulkCertificates';

function App() {
  return (
    <Routes>
      <Route path="/" element={<LiveView />} />
      <Route path="/verify/:certificateId" element={<VerifyCertificate />} />
      <Route path="/my-certificates" element={<StudentCertificateLookup />} />
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
