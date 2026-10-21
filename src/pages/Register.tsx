import { FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api/axios';

const inputClass =
  'w-full bg-white/20 border border-white/40 text-white placeholder-gray-300 rounded-lg px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-white/70';

export default function Register() {
  const navigate = useNavigate();
  const [nom, setNom] = useState('');
  const [email, setEmail] = useState('');
  const [telephone, setTelephone] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (password.length < 6) return setError('Le mot de passe doit contenir au moins 6 caractères');
    if (password !== confirm) return setError('Les mots de passe ne correspondent pas');

    setSaving(true);
    try {
      await api.post('/auth/register', { nom, email, telephone, password });
      setSuccess('Compte créé avec succès. Redirection...');
      setTimeout(() => navigate('/login'), 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erreur lors de la création du compte');
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
        <h1 className="text-xl sm:text-2xl font-bold text-center text-white mb-1">Créer un compte</h1>
        <p className="text-center text-gray-200 text-xs sm:text-sm mb-6">
          Renseignez vos informations pour commencer
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-white mb-1">Nom complet</label>
            <input required value={nom} onChange={(e) => setNom(e.target.value)} className={inputClass} placeholder="Ahmed Ben Salah" />
          </div>
          <div>
            <label className="block text-sm font-medium text-white mb-1">Email</label>
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} placeholder="vous@example.com" />
          </div>
          <div>
            <label className="block text-sm font-medium text-white mb-1">Téléphone</label>
            <input value={telephone} onChange={(e) => setTelephone(e.target.value)} className={inputClass} placeholder="20 123 456" />
          </div>
          <div>
            <label className="block text-sm font-medium text-white mb-1">Mot de passe</label>
            <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className={inputClass} placeholder="••••••••" />
          </div>
          <div>
            <label className="block text-sm font-medium text-white mb-1">Confirmer le mot de passe</label>
            <input type="password" required value={confirm} onChange={(e) => setConfirm(e.target.value)} className={inputClass} placeholder="••••••••" />
          </div>

          {error && <p className="text-red-300 text-sm">{error}</p>}
          {success && <p className="text-green-300 text-sm">{success}</p>}

          <button
            type="submit"
            disabled={saving}
            className="w-full bg-primary-600 hover:bg-primary-700 text-white font-medium py-2.5 rounded-lg transition disabled:opacity-50"
          >
            {saving ? 'Création...' : 'Créer mon compte'}
          </button>
        </form>

        <p className="text-center text-sm text-gray-200 mt-6">
          Déjà un compte ?{' '}
          <Link to="/login" className="text-white font-semibold underline underline-offset-2 hover:text-gray-100">
            Se connecter
          </Link>
        </p>
      </div>
    </div>
  );
}