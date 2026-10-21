import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import PrivateRoute from './components/PrivateRoute';
import Login from './pages/Login';
import Clients from './pages/commercial/Clients';
import ClientDetail from './pages/commercial/ClientDetail';
import AdminDashboard from './pages/admin/AdminDashboard';
import Commerciaux from './pages/admin/Commerciaux';
import ActivityLog from './pages/admin/ActivityLog';
import Profile from './pages/Profile';
import ChatBot from './components/chatbot';
import Register from './pages/Register';
import ForgotPassword from './pages/Forgotpassword';
import ResetPassword from './pages/reset';
import CommercialTransactions from './components/CommercialTransactions';
import Layout from './components/Layout';

export default function App() {
  const { user } = useAuth();

  return (
    <>
    <Layout>
      <Routes>
        <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />
        <Route path="/register" element={<Register />} />
<Route path="/forgot-password" element={<ForgotPassword />} />
<Route path="/reset-password/:token" element={<ResetPassword />} />


        {/* Espace commercial */}
        <Route element={<PrivateRoute allow={['commercial']} />}>
          <Route path="/" element={<Clients />} />
          <Route path="/clients/:id" element={<ClientDetail />} />
         
        </Route>

        {/* Espace admin */}
        <Route element={<PrivateRoute allow={['admin']} />}>
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/admin/commerciaux" element={<Commerciaux />} />
          <Route path="/admin/journal" element={<ActivityLog />} />
          <Route path="/admin/commerciaux/:id/transactions" element={<CommercialTransactions />} />
        </Route>

        {/* Redirection par défaut selon le rôle une fois connecté */}
        <Route
          path="*"
          element={<Navigate to={user ? (user.role === 'admin' ? '/admin' : '/') : '/login'} replace />}
        />
        <Route path="/profile" element={<Profile />} />
      </Routes>
      </Layout>
    </>
  );
}
