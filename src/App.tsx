import React from 'react';
import { Routes, Route } from 'react-router-dom';
import LiveView from './views/LiveView';
import AdminPanel from './views/AdminPanel';
import AdminLogin from './views/AdminLogin';
import TeamConsole from './views/TeamConsole';
import TeamLogin from './views/TeamLogin';

function App() {
  return (
    <Routes>
      <Route path="/" element={<LiveView />} />
      <Route path="/123456789/GCL@admin" element={<AdminLogin />} />
      <Route path="/admin" element={<AdminPanel />} />
      <Route path="/team" element={<TeamConsole />} />
      <Route path="/team-login" element={<TeamLogin />} />
    </Routes>
  );
}

export default App;
