import { FormEvent, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axios';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      await api.post('/auth/forgot-password', { email });
      setSent(true);
    } catch (err: any) {
      setError(err.response?.data?.message || "Impossible d'envoyer la demande");
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
        <h1 className="text-xl sm:text-2xl font-bold text-center text-white mb-1">Mot de passe oublié</h1>
        <p className="text-center text-gray-200 text-xs sm:text-sm mb-6">
          Entrez votre email pour recevoir un lien de réinitialisation
        </p>

        {sent ? (
          <p className="text-green-300 text-sm text-center bg-white/10 border border-white/20 rounded-lg px-3 py-3">
            Si un compte existe avec cet email, un lien de réinitialisation vient d'être envoyé.
          </p>
        ) : (
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

            {error && <p className="text-red-300 text-sm">{error}</p>}

            <button
              type="submit"
              disabled={saving}
              className="w-full bg-primary-600 hover:bg-primary-700 text-white font-medium py-2.5 rounded-lg transition disabled:opacity-50"
            >
              {saving ? 'Envoi...' : 'Envoyer le lien'}
            </button>
          </form>
        )}

        <p className="text-center text-sm text-gray-200 mt-6">
          <Link to="/login" className="text-white font-semibold underline underline-offset-2 hover:text-gray-100">
            ← Retour à la connexion
          </Link>
        </p>
      </div>
    </div>
  );
}