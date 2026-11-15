import { FormEvent, useEffect, useState } from 'react';
import api from '../../api/axios';
import Modal from '../../components/Modal';
import IconBtn, { ICON_PATHS } from '../../components/IconBtn';
import { Category } from '../../types/stock';

const inputClass =
  'w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 transition-shadow';

export default function Categories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [nom, setNom] = useState('');
  const [parent, setParent] = useState('');
  const [editing, setEditing] = useState<Category | null>(null);
  const [editNom, setEditNom] = useState('');
  const [toDelete, setToDelete] = useState<Category | null>(null);
  const [modalError, setModalError] = useState('');

  async function load() {
    try {
      const { data } = await api.get('/categories');
      setCategories(data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Impossible de charger les catégories');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const mains = categories.filter((c) => !c.parent);
  const subsOf = (id: string) => categories.filter((c) => c.parent === id);

  async function handleAdd(e: FormEvent) {
    e.preventDefault();
    setError('');
    try {
      await api.post('/categories', { nom, parent: parent || undefined });
      setNom('');
      load();
    } catch (err: any) {
      setError(err.response?.data?.message || "Erreur lors de l'ajout");
    }
  }

  async function handleRename(e: FormEvent) {
    e.preventDefault();
    if (!editing) return;
    setModalError('');
    try {
      await api.put(`/categories/${editing._id}`, { nom: editNom });
      setEditing(null);
      load();
    } catch (err: any) {
      setModalError(err.response?.data?.message || 'Erreur lors de la modification');
    }
  }

  async function handleDelete() {
    if (!toDelete) return;
    setModalError('');
    try {
      await api.delete(`/categories/${toDelete._id}`);
      setToDelete(null);
      load();
    } catch (err: any) {
      setModalError(err.response?.data?.message || 'Erreur lors de la suppression');
    }
  }

  function Row({ c, sub }: { c: Category; sub?: boolean }) {
    return (
      <div className={`flex items-center justify-between gap-3 ${sub ? 'pl-6 py-2' : 'py-1'}`}>
        <span className={sub ? 'text-sm text-gray-600' : 'font-semibold text-gray-800'}>
          {sub && <span className="text-gray-300 mr-2">└</span>}
          {c.nom}
        </span>
        <div className="flex items-center">
          <IconBtn
            title="Renommer"
            d={ICON_PATHS.edit}
            hover="hover:text-primary-600 hover:bg-primary-50"
            onClick={() => { setModalError(''); setEditNom(c.nom); setEditing(c); }}
          />
          <IconBtn
            title="Supprimer"
            d={ICON_PATHS.trash}
            hover="hover:text-red-600 hover:bg-red-50"
            onClick={() => { setModalError(''); setToDelete(c); }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Catégories</h1>
        <p className="text-gray-500 text-sm mt-1">Organisez vos produits en catégories et sous-catégories</p>
      </div>

      <form
        onSubmit={handleAdd}
        className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mb-6 grid grid-cols-1 md:grid-cols-[1fr_1fr_auto] gap-3 items-end"
      >
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1.5">Nom</label>
          <input required value={nom} onChange={(e) => setNom(e.target.value)} placeholder="Ex : Boissons" className={inputClass} />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1.5">Type</label>
          <select value={parent} onChange={(e) => setParent(e.target.value)} className={inputClass}>
            <option value="">Catégorie principale</option>
            {mains.map((m) => (
              <option key={m._id} value={m._id}>Sous-catégorie de : {m.nom}</option>
            ))}
          </select>
        </div>
        <button className="bg-primary-600 hover:bg-primary-700 active:scale-[0.98] transition-all text-white px-5 py-2.5 rounded-xl text-sm font-semibold shadow-sm shadow-primary-600/20">
          Ajouter
        </button>
      </form>

      {error && (
        <p className="text-red-600 text-sm bg-red-50 border border-red-100 rounded-lg px-3 py-2 mb-4">{error}</p>
      )}

      {loading ? (
        <p className="text-gray-400 text-sm text-center py-16">Chargement...</p>
      ) : mains.length === 0 ? (
        <p className="text-gray-500 text-sm text-center py-16 bg-white rounded-2xl border border-dashed border-gray-200">
          Aucune catégorie. Créez la première ci-dessus.
        </p>
      ) : (
        <div className="space-y-3">
          {mains.map((m) => (
            <div key={m._id} className="bg-white rounded-2xl shadow-sm border border-gray-100 px-5 py-3">
              <Row c={m} />
              {subsOf(m._id).map((s) => (
                <Row key={s._id} c={s} sub />
              ))}
            </div>
          ))}
        </div>
      )}

      {editing && (
        <Modal title="Renommer" onClose={() => setEditing(null)}>
          <form onSubmit={handleRename} className="space-y-4">
            <input required value={editNom} onChange={(e) => setEditNom(e.target.value)} className={inputClass} />
            {modalError && <p className="text-red-600 text-sm">{modalError}</p>}
            <button className="w-full bg-primary-600 hover:bg-primary-700 text-white py-2.5 rounded-xl font-semibold text-sm">
              Enregistrer
            </button>
          </form>
        </Modal>
      )}

      {toDelete && (
        <Modal title="Supprimer cette catégorie ?" onClose={() => setToDelete(null)}>
          <p className="text-sm text-gray-500">« {toDelete.nom} » sera supprimée définitivement.</p>
          {modalError && (
            <p className="text-red-600 text-sm bg-red-50 border border-red-100 rounded-lg px-3 py-2 mt-4">{modalError}</p>
          )}
          <div className="flex gap-3 mt-6">
            <button onClick={() => setToDelete(null)} className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-2.5 rounded-xl font-semibold text-sm">
              Annuler
            </button>
            <button onClick={handleDelete} className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2.5 rounded-xl font-semibold text-sm">
              Supprimer
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}