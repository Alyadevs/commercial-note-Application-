import { FormEvent, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import api from '../api/axios';

const inputClass =
  'w-full bg-white/20 border border-white/40 text-white placeholder-gray-300 rounded-lg px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-white/70';

export default function ResetPassword() {
  const { token = '' } = useParams();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    if (password.length < 6) return setError('Le mot de passe doit contenir au moins 6 caractères');
    if (password !== confirm) return setError('Les mots de passe ne correspondent pas');

    setSaving(true);
    try {
      await api.post('/auth/reset-password', { token, password });
      setSuccess('Mot de passe mis à jour. Redirection...');
      setTimeout(() => navigate('/login'), 1500);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Lien invalide ou expiré');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="relative min-h-screen flex items-center justify-center px-4 py-8 sm:px-6 bg-cover bg-center bg-no-repeat"
      style={{ backgroundImage: "url('/images/circuit.png')" }}
    >
      <div className="absolute inset-0" />
      <div className="relative w-full max-w-xs sm:max-w-sm md:max-w-md bg-white/10 backdrop-blur-md border border-white/30 p-6 sm:p-8 rounded-xl shadow-2xl">
        <h1 className="text-xl sm:text-2xl font-bold text-center text-white mb-1">Nouveau mot de passe</h1>
        <p className="text-center text-gray-200 text-xs sm:text-sm mb-6">Choisissez un nouveau mot de passe</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-white mb-1">Nouveau mot de passe</label>
            <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className={inputClass} placeholder="••••••••" />
          </div>
          <div>
            <label className="block text-sm font-medium text-white mb-1">Confirmer</label>
            <input type="password" required value={confirm} onChange={(e) => setConfirm(e.target.value)} className={inputClass} placeholder="••••••••" />
          </div>

          {error && <p className="text-red-300 text-sm">{error}</p>}
          {success && <p className="text-green-300 text-sm">{success}</p>}

          <button
            type="submit"
            disabled={saving}
            className="w-full bg-primary-600 hover:bg-primary-700 text-white font-medium py-2.5 rounded-lg transition disabled:opacity-50"
          >
            {saving ? 'Enregistrement...' : 'Enregistrer'}
          </button>
        </form>

        <p className="text-center text-sm text-gray-200 mt-6">
          <Link to="/login" className="text-white font-semibold underline underline-offset-2">← Retour à la connexion</Link>
        </p>
      </div>
    </div>
  );
}