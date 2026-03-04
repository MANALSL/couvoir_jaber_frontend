import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/layout/ProtectedRoute';
import MainLayout from './components/layout/MainLayout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Elevage from './pages/Elevage';
import FermesView from './pages/elevage/FermesView';
import BatimentsView from './pages/elevage/BatimentsView';
import ParcsView from './pages/elevage/ParcsView';
import ElevageTable from './pages/elevage/ElevageTable';
import Production from './pages/Production';
import ProductionFermesView from './pages/production/ProductionFermesView';
import ProductionBatimentsView from './pages/production/ProductionBatimentsView';
import ProductionTable from './pages/production/ProductionTable';
import Vaccination from './pages/Vaccination';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />

          <Route path="/" element={
            <ProtectedRoute>
              <MainLayout />
            </ProtectedRoute>
          }>
            <Route index element={<Dashboard />} />

            {/* Elevage */}
            <Route path="elevage" element={<Elevage />}>
              <Route index element={<FermesView />} />
              <Route path="ferme/:fermeId" element={<BatimentsView />} />
              <Route path="ferme/:fermeId/batiment/:batimentId" element={<ParcsView />} />
              <Route path="ferme/:fermeId/batiment/:batimentId/parc/:parcId" element={<ElevageTable />} />
            </Route>

            {/* Production */}
            <Route path="production" element={<Production />}>
              <Route index element={<ProductionFermesView />} />
              <Route path="ferme/:fermeId" element={<ProductionBatimentsView />} />
              <Route path="ferme/:fermeId/batiment/:batimentId" element={<ProductionTable />} />
            </Route>

            <Route path="vaccination" element={<Vaccination />} />

            {/* Catch all */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
