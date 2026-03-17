import { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

const GamePage = lazy(() => import('./pages/GamePage').then((m) => ({ default: m.GamePage })));

function App() {
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <Suspense fallback={<div className="loading">Laden…</div>}>
        <Routes>
          <Route path="/" element={<Navigate to="/orte" replace />} />
          <Route path="/:modeId" element={<GamePage />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

export default App;
