import { FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const { login, loading } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    try {
      await login(email, password);
      // La redirection selon le rôle est gérée par App.tsx après connexion
      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Email ou mot de passe incorrect');
    }
  }

  return (
    <div
      className="relative min-h-screen flex items-center justify-center px-4 py-8 sm:px-6 bg-cover bg-center bg-no-repeat"
      style={{ backgroundImage: "url('/images/circuit.png')" }}
    >
      {/* Voile sombre pour la lisibilité */}
      <div className="absolute inset-0" />

      {/* Carte transparente (effet verre) */}
      <div className="relative w-full max-w-xs sm:max-w-sm md:max-w-md bg-white/10 backdrop-blur-md border border-white/30 p-6 sm:p-8 rounded-xl shadow-2xl">
        <h1 className="text-xl sm:text-2xl font-bold text-center text-white mb-1">
          Commercial Note
        </h1>
        <p className="text-center text-gray-200 text-xs sm:text-sm mb-6">
          Connectez-vous à votre espace
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-white mb-1">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-white/20 border border-white/40 text-white placeholder-gray-300 rounded-lg px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-white/70"
              placeholder="vous@example.com"
            />
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-sm font-medium text-white">Mot de passe</label>
              <Link
                to="/forgot-password"
                className="text-xs text-gray-200 hover:text-white underline underline-offset-2"
              >
                Mot de passe oublié ?
              </Link>
            </div>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-white/20 border border-white/40 text-white placeholder-gray-300 rounded-lg px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-white/70"
              placeholder="••••••••"
            />
          </div>

          {error && <p className="text-red-300 text-sm">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary-600 hover:bg-primary-700 text-white font-medium py-2.5 rounded-lg transition disabled:opacity-50"
          >
            {loading ? 'Connexion...' : 'Se connecter'}
          </button>
        </form>

        <p className="text-center text-sm text-gray-200 mt-6">
          Pas encore de compte ?{' '}
          <Link to="/register" className="text-white font-semibold underline underline-offset-2 hover:text-gray-100">
            Créer un compte
          </Link>
        </p>
      </div>
    </div>
  );
}