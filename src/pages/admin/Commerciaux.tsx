import { FormEvent, useEffect, useState } from 'react';
import api from '../../api/axios';
import { UserInfo } from '../../types';

export default function Commerciaux() {
  const [commerciaux, setCommerciaux] = useState<UserInfo[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState('');

  const [nom, setNom] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [telephone, setTelephone] = useState('');
  const [marque, setMarque] = useState('');
  const [modele, setModele] = useState('');
  const [immatriculation, setImmatriculation] = useState('');

  async function load() {
    const { data } = await api.get('/users/commerciaux');
    setCommerciaux(data);
  }

  useEffect(() => { load(); }, []);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setError('');
    try {
      await api.post('/users', {
        nom, email, password, role: 'commercial', telephone,
        vehicule: (marque || modele || immatriculation) ? { marque, modele, immatriculation } : undefined,
      });
      setNom(''); setEmail(''); setPassword(''); setTelephone('');
      setMarque(''); setModele(''); setImmatriculation('');
      setShowForm(false);
      load();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erreur lors de la création du commercial');
    }
  }

  async function toggleActive(u: UserInfo) {
    await api.patch(`/users/${u._id}/${u.actif ? 'desactiver' : 'activer'}`);
    load();
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Commerciaux</h1>
        <button onClick={() => setShowForm(!showForm)} className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg text-sm font-medium">
          {showForm ? 'Annuler' : '+ Nouveau commercial'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="bg-white p-5 rounded-xl shadow mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <input required placeholder="Nom complet" value={nom} onChange={(e) => setNom(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-2" />
          <input required type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-2" />
          <input required type="password" minLength={6} placeholder="Mot de passe" value={password} onChange={(e) => setPassword(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-2" />
          <input placeholder="Téléphone" value={telephone} onChange={(e) => setTelephone(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-2" />
          <input placeholder="Marque du véhicule" value={marque} onChange={(e) => setMarque(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-2" />
          <input placeholder="Modèle" value={modele} onChange={(e) => setModele(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-2" />
          <input placeholder="Immatriculation" value={immatriculation} onChange={(e) => setImmatriculation(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-2" />
          {error && <p className="text-red-600 text-sm md:col-span-3">{error}</p>}
          <button type="submit" className="md:col-span-3 bg-primary-600 hover:bg-primary-700 text-white py-2 rounded-lg font-medium">
            Créer le commercial
          </button>
        </form>
      )}

      <div className="bg-white rounded-xl shadow overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-100 text-gray-600 text-left">
            <tr>
              <th className="px-4 py-3">Nom</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Téléphone</th>
              <th className="px-4 py-3">Véhicule</th>
              <th className="px-4 py-3">Statut</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {commerciaux.map((c) => (
              <tr key={c._id} className="border-t hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-800">{c.nom}</td>
                <td className="px-4 py-3 text-gray-600">{c.email}</td>
                <td className="px-4 py-3 text-gray-600">{c.telephone || '—'}</td>
                <td className="px-4 py-3 text-gray-600">
                  {c.vehicule?.marque ? `${c.vehicule.marque} ${c.vehicule.modele || ''} — ${c.vehicule.immatriculation || ''}` : '—'}
                </td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs ${c.actif ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {c.actif ? 'Actif' : 'Désactivé'}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <button onClick={() => toggleActive(c)} className="text-primary-600 hover:underline">
                    {c.actif ? 'Désactiver' : 'Activer'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
