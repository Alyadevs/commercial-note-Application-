import { FormEvent, useEffect, useState } from 'react';
import api from '../../api/axios';
import Modal from '../../components/Modal';
import IconBtn, { ICON_PATHS } from '../../components/IconBtn';
import { Client, UserInfo } from '../../types';

const inputClass =
  'w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 transition-shadow';

const EMPTY_FORM = {
  nom: '', email: '', password: '', telephone: '',
  marque: '', modele: '', immatriculation: '',
};

// Id du commercial d'un client (chaîne, objet peuplé, ou null)
function commercialIdOf(c: Client): string {
  const com: any = c.commercial;
  if (!com) return '';
  return typeof com === 'string' ? com : com._id ?? '';
}

function getInitials(nom: string) {
  return nom.split(' ').map((p) => p[0]).join('').slice(0, 2).toUpperCase();
}

export default function Commerciaux() {
  const [commerciaux, setCommerciaux] = useState<UserInfo[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<UserInfo | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  const [toDelete, setToDelete] = useState<UserInfo | null>(null);
  const [deleteError, setDeleteError] = useState('');
  const [deleting, setDeleting] = useState(false);

  const [pageError, setPageError] = useState('');

  async function load() {
    try {
      const [u, c] = await Promise.all([api.get('/users/commerciaux'), api.get('/clients')]);
      setCommerciaux(u.data);
      setClients(c.data);
    } catch (err: any) {
      setPageError(err.response?.data?.message || 'Impossible de charger les commerciaux');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const nbClients = (id: string) => clients.filter((c) => commercialIdOf(c) === id).length;

  const setField = (k: keyof typeof EMPTY_FORM) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  function openCreate() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setFormError('');
    setShowForm(true);
  }

  function openEdit(u: UserInfo) {
    setEditing(u);
    setForm({
      nom: u.nom,
      email: u.email || '',
      password: '',
      telephone: u.telephone || '',
      marque: u.vehicule?.marque || '',
      modele: u.vehicule?.modele || '',
      immatriculation: u.vehicule?.immatriculation || '',
    });
    setFormError('');
    setShowForm(true);
  }

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    setFormError('');
    setSaving(true);

    const vehicule = { marque: form.marque, modele: form.modele, immatriculation: form.immatriculation };
    const hasVehicule = !!(form.marque || form.modele || form.immatriculation);

    try {
      if (editing) {
        const payload: any = {
          nom: form.nom.trim(),
          email: form.email.trim(),
          telephone: form.telephone.trim(),
          vehicule, // vide = efface le véhicule
        };
        if (form.password) payload.password = form.password; // seulement si rempli
        await api.patch(`/users/${editing._id}`, payload);
      } else {
        await api.post('/users', {
          nom: form.nom.trim(),
          email: form.email.trim(),
          password: form.password,
          role: 'commercial',
          telephone: form.telephone.trim(),
          vehicule: hasVehicule ? vehicule : undefined,
        });
      }
      setShowForm(false);
      load();
    } catch (err: any) {
      const msg = err.response?.data?.message;
      setFormError(Array.isArray(msg) ? msg.join(', ') : msg || "Erreur lors de l'enregistrement");
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(u: UserInfo) {
    setPageError('');
    try {
      await api.patch(`/users/${u._id}/${u.actif ? 'desactiver' : 'activer'}`);
      load();
    } catch (err: any) {
      setPageError(err.response?.data?.message || 'Erreur lors du changement de statut');
    }
  }

  async function handleDelete() {
    if (!toDelete) return;
    setDeleting(true);
    setDeleteError('');
    try {
      await api.delete(`/users/${toDelete._id}`);
      setToDelete(null);
      load();
    } catch (err: any) {
      setDeleteError(err.response?.data?.message || 'Erreur lors de la suppression');
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* En-tête */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Commerciaux</h1>
          <p className="text-gray-500 text-sm mt-2 flex items-center gap-2 flex-wrap">
            <span className="inline-flex bg-gray-100 text-gray-700 px-2.5 py-1 rounded-full font-medium">
              {commerciaux.length} commercial{commerciaux.length !== 1 ? 'aux' : ''}
            </span>
            <span className="inline-flex bg-green-50 text-green-600 px-2.5 py-1 rounded-full font-semibold">
              {commerciaux.filter((c) => c.actif).length} actif{commerciaux.filter((c) => c.actif).length !== 1 ? 's' : ''}
            </span>
          </p>
        </div>
        <button
          onClick={openCreate}
          className="inline-flex items-center justify-center gap-2 bg-primary-600 hover:bg-primary-700 active:scale-[0.98] transition-all text-white px-5 py-2.5 rounded-xl text-sm font-semibold shadow-sm shadow-primary-600/20"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Nouveau commercial
        </button>
      </div>

      {pageError && (
        <p className="text-red-600 text-sm bg-red-50 border border-red-100 rounded-lg px-3 py-2 mb-4">{pageError}</p>
      )}

      {/* Tableau */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-6 h-6 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
            <span className="ml-3 text-gray-400 text-sm">Chargement...</span>
          </div>
        ) : commerciaux.length === 0 ? (
          <p className="text-gray-500 text-sm text-center py-16">Aucun commercial. Ajoutez le premier.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 text-left text-xs uppercase tracking-wide">
                <tr>
                  <th className="px-5 py-3.5 font-semibold">Commercial</th>
                  <th className="px-5 py-3.5 font-semibold">Téléphone</th>
                  <th className="px-5 py-3.5 font-semibold">Véhicule</th>
                  <th className="px-5 py-3.5 font-semibold text-right">Clients</th>
                  <th className="px-5 py-3.5 font-semibold">Statut</th>
                  <th className="px-5 py-3.5"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {commerciaux.map((c) => (
                  <tr key={c._id} className="hover:bg-gray-50/80 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 ${
                            c.actif ? 'bg-primary-100 text-primary-700' : 'bg-gray-100 text-gray-400'
                          }`}
                        >
                          {getInitials(c.nom)}
                        </div>
                        <div>
                          <p className={`font-medium ${c.actif ? 'text-gray-800' : 'text-gray-500'}`}>{c.nom}</p>
                          <p className="text-xs text-gray-400">{c.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-gray-500 whitespace-nowrap">{c.telephone || '—'}</td>
                    <td className="px-5 py-3.5 text-gray-500">
                      {c.vehicule?.marque
                        ? `${c.vehicule.marque} ${c.vehicule.modele || ''} — ${c.vehicule.immatriculation || ''}`
                        : '—'}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <span className="inline-flex items-center justify-center min-w-[1.75rem] px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 text-xs font-semibold">
                        {nbClients(c._id!)}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <button
                        onClick={() => toggleActive(c)}
                        title={c.actif ? 'Cliquer pour désactiver' : 'Cliquer pour activer'}
                        className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold transition-colors ${
                          c.actif
                            ? 'bg-green-50 text-green-600 hover:bg-green-100'
                            : 'bg-red-50 text-red-600 hover:bg-red-100'
                        }`}
                      >
                        {c.actif ? 'Actif' : 'Désactivé'}
                      </button>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center justify-end">
                        <IconBtn
                          title="Modifier"
                          d={ICON_PATHS.edit}
                          hover="hover:text-primary-600 hover:bg-primary-50"
                          onClick={() => openEdit(c)}
                        />
                        <IconBtn
                          title="Supprimer"
                          d={ICON_PATHS.trash}
                          hover="hover:text-red-600 hover:bg-red-50"
                          onClick={() => { setDeleteError(''); setToDelete(c); }}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Formulaire ajouter / modifier */}
      {showForm && (
        <Modal title={editing ? 'Modifier le commercial' : 'Nouveau commercial'} onClose={() => setShowForm(false)} wide>
          <form onSubmit={handleSave} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Nom complet *</label>
              <input required value={form.nom} onChange={setField('nom')} className={inputClass} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Email *</label>
              <input required type="email" value={form.email} onChange={setField('email')} className={inputClass} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Téléphone</label>
              <input value={form.telephone} onChange={setField('telephone')} className={inputClass} />
            </div>
             
            <p className="sm:col-span-2 text-xs font-semibold text-gray-400 uppercase tracking-wide mt-1">Véhicule</p>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Marque</label>
              <input value={form.marque} onChange={setField('marque')} className={inputClass} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Modèle</label>
              <input value={form.modele} onChange={setField('modele')} className={inputClass} />
            </div>
          <div >
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Immatriculation</label>
              <input value={form.immatriculation} onChange={setField('immatriculation')} className={inputClass} />
            </div>

            {formError && (
              <p className="sm:col-span-2 text-red-600 text-sm bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                {formError}
              </p>
            )}

            <button
              disabled={saving}
              className="sm:col-span-2 bg-primary-600 hover:bg-primary-700 text-white py-2.5 rounded-xl font-semibold text-sm transition-colors disabled:opacity-60"
            >
              {saving ? 'Enregistrement...' : editing ? 'Enregistrer les modifications' : 'Créer le commercial'}
            </button>
          </form>
        </Modal>
      )}

      {/* Suppression */}
      {toDelete && (
        <Modal title="Supprimer ce commercial ?" onClose={() => !deleting && setToDelete(null)}>
          <p className="text-sm text-gray-500">« {toDelete.nom} » sera supprimé définitivement.</p>

          {nbClients(toDelete._id!) > 0 && (
            <p className="text-amber-700 text-sm bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 mt-3">
              Ce commercial gère {nbClients(toDelete._id!)} client{nbClients(toDelete._id!) > 1 ? 's' : ''}.
              Réaffectez-les à un autre commercial avant de le supprimer, ou désactivez-le à la place :
              son compte ne pourra plus se connecter et ses données restent intactes.
            </p>
          )}

          {deleteError && (
            <p className="text-red-600 text-sm bg-red-50 border border-red-100 rounded-lg px-3 py-2 mt-3">{deleteError}</p>
          )}

          <div className="flex gap-3 mt-6">
            <button
              onClick={() => setToDelete(null)}
              disabled={deleting}
              className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-2.5 rounded-xl font-semibold text-sm transition-colors disabled:opacity-60"
            >
              Annuler
            </button>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2.5 rounded-xl font-semibold text-sm transition-colors disabled:opacity-60"
            >
              {deleting ? 'Suppression...' : 'Supprimer'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}