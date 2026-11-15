import { FormEvent, useEffect, useState } from 'react';
import api from '../../api/axios';
import Modal from '../../components/Modal';
import IconBtn, { ICON_PATHS } from '../../components/IconBtn';
import { Client, UserInfo } from '../../types';

const PAGE_SIZE = 8;

const inputClass =
  'w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 transition-shadow';

const EMPTY_FORM = { nom: '', telephone: '', adresse: '', commercial: '' };

// Minuscules, sans accents
const norm = (s: string) =>
  s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();

// Garde uniquement les chiffres : "20 123-456" -> "20123456"
const digits = (s: string) => s.replace(/\D/g, '');

// Id du commercial d'un client (peut être une chaîne, un objet, ou null si supprimé)
function commercialIdOf(c: Client): string {
  const com: any = c.commercial;
  if (!com) return '';
  return typeof com === 'string' ? com : com._id ?? '';
}

function getInitials(nom: string) {
  return nom
    .split(' ')
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

export default function AdminClients() {
  const [clients, setClients] = useState<Client[]>([]);
  const [commerciaux, setCommerciaux] = useState<UserInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [search, setSearch] = useState('');
  const [filterCom, setFilterCom] = useState(''); // '' = tous, '__none' = sans commercial
  const [page, setPage] = useState(1);

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Client | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  const [toDelete, setToDelete] = useState<Client | null>(null);
  const [deleteError, setDeleteError] = useState('');
  const [deleting, setDeleting] = useState(false);

  async function load() {
    try {
      const [c, u] = await Promise.all([api.get('/clients'), api.get('/users/commerciaux')]);
      setClients(c.data);
      setCommerciaux(u.data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Impossible de charger les clients');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  // Revient à la page 1 quand une recherche change
  useEffect(() => {
    setPage(1);
  }, [search, filterCom]);

  const comName = (c: Client) => {
    const id = commercialIdOf(c);
    if (!id) return '';
    const found = commerciaux.find((u) => u._id === id);
    const populated: any = c.commercial;
    return found?.nom || (typeof populated === 'object' ? populated?.nom : '') || '';
  };

  const q = norm(search);
  const qd = digits(search);

  const filtered = clients.filter((c) => {
    const matchSearch =
      !q ||
      norm(c.nom).includes(q) ||
      norm(c.adresse || '').includes(q) ||
      (!!qd && digits(c.telephone || '').includes(qd));
    const id = commercialIdOf(c);
    const matchCom = !filterCom || (filterCom === '__none' ? !id : id === filterCom);
    return matchSearch && matchCom;
  });

  const hasFilters = search !== '' || filterCom !== '';
  const totalCredit = clients.reduce((s, c) => s + (c.soldeCredit || 0), 0);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const startIndex = (currentPage - 1) * PAGE_SIZE;
  const shown = filtered.slice(startIndex, startIndex + PAGE_SIZE);

  // Numéros affichés : 1 … 4 5 6 … 10
  function getPageNumbers(): (number | '...')[] {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
    const pages: (number | '...')[] = [1];
    const from = Math.max(2, currentPage - 1);
    const to = Math.min(totalPages - 1, currentPage + 1);
    if (from > 2) pages.push('...');
    for (let p = from; p <= to; p++) pages.push(p);
    if (to < totalPages - 1) pages.push('...');
    pages.push(totalPages);
    return pages;
  }

  function openCreate() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setFormError('');
    setShowForm(true);
  }

  function openEdit(c: Client) {
    setEditing(c);
    setForm({
      nom: c.nom,
      telephone: c.telephone || '',
      adresse: c.adresse || '',
      commercial: commercialIdOf(c),
    });
    setFormError('');
    setShowForm(true);
  }

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    setFormError('');
    setSaving(true);
    const payload = {
      nom: form.nom.trim(),
      telephone: form.telephone.trim(),
      adresse: form.adresse.trim(),
      commercial: form.commercial,
    };
    try {
      if (editing) await api.patch(`/clients/${editing._id}`, payload);
      else await api.post('/clients', payload);
      setShowForm(false);
      load();
    } catch (err: any) {
      const msg = err.response?.data?.message;
      setFormError(Array.isArray(msg) ? msg.join(', ') : msg || "Erreur lors de l'enregistrement");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!toDelete) return;
    setDeleting(true);
    setDeleteError('');
    try {
      await api.delete(`/clients/${toDelete._id}`);
      setToDelete(null);
      load();
    } catch (err: any) {
      setDeleteError(err.response?.data?.message || 'Erreur lors de la suppression');
    } finally {
      setDeleting(false);
    }
  }

  const setField = (k: keyof typeof EMPTY_FORM) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  // Commerciaux proposés : les actifs, plus le commercial actuel du client modifié
  const selectableCommerciaux = commerciaux.filter((u) => u.actif || u._id === form.commercial);

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* En-tête */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Clients</h1>
          
        </div>
        <button
          onClick={openCreate}
          className="inline-flex items-center justify-center gap-2 bg-primary-600 hover:bg-primary-700 active:scale-[0.98] transition-all text-white px-5 py-2.5 rounded-xl text-sm font-semibold shadow-sm shadow-primary-600/20"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Nouveau client
        </button>
      </div>

      {error && (
        <p className="text-red-600 text-sm bg-red-50 border border-red-100 rounded-lg px-3 py-2 mb-4">{error}</p>
      )}

      {/* Recherche */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mb-4 grid grid-cols-1 md:grid-cols-[1.5fr_1fr_auto] gap-3 items-end">
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1.5">Nom, téléphone ou adresse</label>
          <div className="relative">
            <svg
              className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
              viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 10.5a6.5 6.5 0 11-13 0 6.5 6.5 0 0113 0z" />
            </svg>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Ex : Ahmed, 20 123 ou Tunis"
              className={`${inputClass} pl-10`}
            />
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1.5">Commercial</label>
          <select value={filterCom} onChange={(e) => setFilterCom(e.target.value)} className={inputClass}>
            <option value="">Tous les commerciaux</option>
            {commerciaux.map((u) => (
              <option key={u._id} value={u._id}>{u.nom}</option>
            ))}
            <option value="__none">Sans commercial</option>
          </select>
        </div>
        {hasFilters && (
          <button
            onClick={() => { setSearch(''); setFilterCom(''); }}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-primary-700 bg-primary-50 border border-primary-200 hover:bg-primary-600 hover:text-white hover:border-primary-600 active:scale-[0.98] shadow-sm transition-all"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h5M20 20v-5h-5M5.6 15A8 8 0 0018.4 9M18.4 9L15 9m-9.4 6L9 15" />
            </svg>
            Réinitialiser
          </button>
        )}
      </div>

      {/* Tableau */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-6 h-6 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
            <span className="ml-3 text-gray-400 text-sm">Chargement...</span>
          </div>
        ) : shown.length === 0 ? (
          <p className="text-gray-500 text-sm text-center py-16">
            {clients.length === 0 ? 'Aucun client. Ajoutez le premier.' : 'Aucun client ne correspond à la recherche.'}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 text-left text-xs uppercase tracking-wide">
                <tr>
                  <th className="px-5 py-3.5 font-semibold">Client</th>
                  <th className="px-5 py-3.5 font-semibold">Téléphone</th>
                  <th className="px-5 py-3.5 font-semibold">Adresse</th>
                  <th className="px-5 py-3.5 font-semibold">Createur</th>
                  <th className="px-5 py-3.5"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {shown.map((c) => (
                  <tr key={c._id} className="hover:bg-gray-50/80 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-xs font-semibold shrink-0">
                          {getInitials(c.nom)}
                        </div>
                        <span className="font-medium text-gray-800">{c.nom}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-gray-500 whitespace-nowrap">{c.telephone || '—'}</td>
                    <td className="px-5 py-3.5 text-gray-500">{c.adresse || '—'}</td>
                    <td className="px-5 py-3.5">
                      {comName(c) ? (
                        <span className="text-gray-700">{comName(c)}</span>
                      ) : (
                        <span className="inline-flex text-xs text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full font-medium">
                          Sans commercial
                        </span>
                      )}
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

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-5 py-3.5 border-t border-gray-100 bg-gray-50/50">
            <p className="text-xs text-gray-500">
              {startIndex + 1}–{Math.min(startIndex + PAGE_SIZE, filtered.length)} sur {filtered.length} clients
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-600 hover:bg-white hover:shadow-sm transition disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:shadow-none disabled:cursor-not-allowed"
                aria-label="Page précédente"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
              </button>

              {getPageNumbers().map((p, i) =>
                p === '...' ? (
                  <span key={`dots-${i}`} className="w-8 h-8 flex items-center justify-center text-gray-400 text-sm">
                    …
                  </span>
                ) : (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className={`w-8 h-8 rounded-lg text-sm font-medium transition ${
                      p === currentPage ? 'bg-primary-600 text-white shadow-sm' : 'text-gray-600 hover:bg-white hover:shadow-sm'
                    }`}
                  >
                    {p}
                  </button>
                )
              )}

              <button
                onClick={() => setPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-600 hover:bg-white hover:shadow-sm transition disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:shadow-none disabled:cursor-not-allowed"
                aria-label="Page suivante"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Formulaire ajouter / modifier */}
      {showForm && (
        <Modal title={editing ? 'Modifier le client' : 'Nouveau client'} onClose={() => setShowForm(false)}>
          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Nom *</label>
              <input required value={form.nom} onChange={setField('nom')} placeholder="Ex : Ahmed Ben Salah" className={inputClass} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Téléphone</label>
              <input value={form.telephone} onChange={setField('telephone')} placeholder="Ex : 20 123 456" className={inputClass} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Adresse</label>
              <input value={form.adresse} onChange={setField('adresse')} placeholder="Ex : Tunis, Cité Ennasr" className={inputClass} />
            </div>
            {/* <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Commercial responsable *</label>
              <select required value={form.commercial} onChange={setField('commercial')} className={inputClass}>
                <option value="">Choisir un commercial...</option>
                {selectableCommerciaux.map((u) => (
                  <option key={u._id} value={u._id}>
                    {u.nom}{!u.actif ? ' (désactivé)' : ''}
                  </option>
                ))}
              </select>
            </div> */}

            {formError && (
              <p className="text-red-600 text-sm bg-red-50 border border-red-100 rounded-lg px-3 py-2">{formError}</p>
            )}

            <button
              disabled={saving}
              className="w-full bg-primary-600 hover:bg-primary-700 text-white py-2.5 rounded-xl font-semibold text-sm transition-colors disabled:opacity-60"
            >
              {saving ? 'Enregistrement...' : editing ? 'Enregistrer les modifications' : 'Ajouter le client'}
            </button>
          </form>
        </Modal>
      )}

      {/* Suppression */}
      {toDelete && (
        <Modal title="Supprimer ce client ?" onClose={() => !deleting && setToDelete(null)}>
          <p className="text-sm text-gray-500">
            « {toDelete.nom} » sera supprimé définitivement.
          </p>
          {toDelete.soldeCredit > 0 && (
            <p className="text-amber-700 text-sm bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 mt-3">
              Attention : ce client a encore un crédit en cours de {toDelete.soldeCredit.toFixed(2)}.
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