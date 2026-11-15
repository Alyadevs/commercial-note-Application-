import { FormEvent, ReactElement, useEffect, useState } from 'react';
import api from '../../api/axios';
import Modal from '../../components/Modal';
import IconBtn, { ICON_PATHS } from '../../components/IconBtn';
import { Category, Product, StockMovement } from '../../types/stock';
import { compressImage } from '../../utils/image';

const PAGE_SIZE = 5;
const HISTORY_PAGE_SIZE = 4;
const inputClass =
  'w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 transition-shadow';

const EMPTY_FORM = {
  nom: '', reference: '', categorie: '', sousCategorie: '',
  prixAchat: '', prixVente: '', stock: '0', seuilAlerte: '5',
  image: '',
};

const stockState = (p: Product) => (p.stock <= 0 ? 'rupture' : p.stock <= p.seuilAlerte ? 'faible' : 'ok');

const BADGES = {
  rupture: { label: 'Rupture', cls: 'bg-red-50 text-red-600' },
  faible: { label: 'Stock faible', cls: 'bg-amber-50 text-amber-700' },
  ok: { label: 'En stock', cls: 'bg-green-50 text-green-600' },
} as const;

const norm = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();

export default function Products() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
const [imageError, setImageError] = useState('');
  const [search, setSearch] = useState('');
  const [filterCat, setFilterCat] = useState('');
  const [filterStock, setFilterStock] = useState('');
  const [page, setPage] = useState(1);
  const [historyPage, setHistoryPage] = useState(1);

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState('');

  const [stockFor, setStockFor] = useState<Product | null>(null);
  const [mode, setMode] = useState<'entree' | 'sortie'>('entree');
  const [qty, setQty] = useState('');
  const [note, setNote] = useState('');
  const [stockError, setStockError] = useState('');

  const [historyFor, setHistoryFor] = useState<Product | null>(null);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
const [historyError, setHistoryError] = useState('');

  const [toDelete, setToDelete] = useState<Product | null>(null);
  const [deleteError, setDeleteError] = useState('');

  async function load() {
    try {
      const [p, c] = await Promise.all([api.get('/products'), api.get('/categories')]);
      setProducts(p.data);
      setCategories(c.data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Impossible de charger les produits');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const mains = categories.filter((c) => !c.parent);
  const subsOfForm = categories.filter((c) => c.parent === form.categorie);

  const filtered = products.filter(
    (p) =>
      (!search.trim() ||
        norm(p.nom).includes(norm(search)) ||
        norm(p.reference || '').includes(norm(search))) &&
      (!filterCat || p.categorie?._id === filterCat) &&
      (!filterStock ||
        (filterStock === 'alerte' ? stockState(p) !== 'ok' : stockState(p) === 'rupture'))
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const startIndex = (currentPage - 1) * PAGE_SIZE;
  const shown = filtered.slice(startIndex, startIndex + PAGE_SIZE);

 // Statistiques calculées selon les produits recherchés et filtrés
const stockValue = filtered.reduce(
  (s, p) => s + p.stock * p.prixAchat,
  0
);

const stockSaleValue = filtered.reduce(
  (s, p) => s + p.stock * p.prixVente,
  0
);

const potentialProfit = stockSaleValue - stockValue;

const alertCount = filtered.filter(
  (p) => stockState(p) !== 'ok'
).length;

const productCount = filtered.length;
const historyTotalPages = Math.max(
  1,
  Math.ceil(movements.length / HISTORY_PAGE_SIZE)
);

const currentHistoryPage = Math.min(historyPage, historyTotalPages);

const historyStartIndex = (currentHistoryPage - 1) * HISTORY_PAGE_SIZE;

const shownMovements = movements.slice(
  historyStartIndex,
  historyStartIndex + HISTORY_PAGE_SIZE
);
  function openCreate() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setFormError('');
    setShowForm(true);
  }

  function openEdit(p: Product) {
    setEditing(p);
    setForm({
      nom: p.nom,
      reference: p.reference || '',
      categorie: p.categorie?._id || '',
      sousCategorie: p.sousCategorie?._id || '',
      prixAchat: String(p.prixAchat),
      prixVente: String(p.prixVente),
      stock: String(p.stock),
      seuilAlerte: String(p.seuilAlerte),
      image: p.image || '',
    });
    setFormError('');
    setShowForm(true);
  }
async function handleImage(e: React.ChangeEvent<HTMLInputElement>) {
  const file = e.target.files?.[0];
  e.target.value = ''; // permet de rechoisir le même fichier
  if (!file) return;
  setImageError('');
  try {
    const dataUrl = await compressImage(file);
    setForm((f) => ({ ...f, image: dataUrl }));
  } catch (err: any) {
    setImageError(err.message || "Impossible de charger l'image");
  }
}
  async function handleSave(e: FormEvent) {
    e.preventDefault();
    setFormError('');
   const payload: any = {
  nom: form.nom,
  reference: form.reference || undefined,
  categorie: form.categorie,
  sousCategorie: form.sousCategorie || undefined,
  prixAchat: parseFloat(form.prixAchat),
  prixVente: parseFloat(form.prixVente),
  seuilAlerte: parseInt(form.seuilAlerte || '0', 10),
  image: form.image || (editing ? null : undefined),
};
    try {
      if (editing) {
        await api.put(`/products/${editing._id}`, payload);
      } else {
        await api.post('/products', { ...payload, stock: parseFloat(form.stock || '0') });
      }
      setShowForm(false);
      load();
    } catch (err: any) {
      const msg = err.response?.data?.message;
      setFormError(Array.isArray(msg) ? msg.join(', ') : msg || "Erreur lors de l'enregistrement");
    }
  }

  function openStock(p: Product) {
    setStockFor(p);
    setMode('entree');
    setQty('');
    setNote('');
    setStockError('');
  }

  async function handleStock(e: FormEvent) {
    e.preventDefault();
    if (!stockFor) return;
    setStockError('');
    const q = parseFloat(qty);
    if (!q || q <= 0) return setStockError('Entrez une quantité supérieure à 0');
    try {
      await api.post(`/products/${stockFor._id}/stock`, {
        quantite: mode === 'entree' ? q : -q,
        note: note || undefined,
      });
      setStockFor(null);
      load();
    } catch (err: any) {
      setStockError(err.response?.data?.message || "Erreur lors de l'ajustement");
    }
  }
  function getPageNumbers(): (number | '...')[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  const pages: (number | '...')[] = [1];
  const from = Math.max(2, currentPage - 1);
  const to = Math.min(totalPages - 1, currentPage + 1);

  if (from > 2) pages.push('...');

  for (let p = from; p <= to; p++) pages.push(p);

  if (to < totalPages - 1) pages.push('...');

  pages.push(totalPages);

  return pages;
}
function getHistoryPageNumbers(): (number | '...')[] {
  if (historyTotalPages <= 7) {
    return Array.from({ length: historyTotalPages }, (_, i) => i + 1);
  }

  const pages: (number | '...')[] = [1];
  const from = Math.max(2, currentHistoryPage - 1);
  const to = Math.min(historyTotalPages - 1, currentHistoryPage + 1);

  if (from > 2) pages.push('...');

  for (let p = from; p <= to; p++) pages.push(p);

  if (to < historyTotalPages - 1) pages.push('...');

  pages.push(historyTotalPages);

  return pages;
}
 async function openHistory(p: Product) {
  setHistoryFor(p);
  setMovements([]);
  setHistoryPage(1);
  setHistoryError('');
  setHistoryLoading(true);

  try {
    const { data } = await api.get(`/products/${p._id}/movements`);
    setMovements(data);
  } catch (err: any) {
    console.error('Historique :', err.response?.status, err.response?.data);
    setHistoryError(
      err.response?.data?.message || "Impossible de charger l'historique"
    );
  } finally {
    setHistoryLoading(false);
  }
}

  async function handleDelete() {
    if (!toDelete) return;
    setDeleteError('');
    try {
      await api.delete(`/products/${toDelete._id}`);
      setToDelete(null);
      load();
    } catch (err: any) {
      setDeleteError(err.response?.data?.message || 'Erreur lors de la suppression');
    }
  }
  
  const setField = (k: keyof typeof EMPTY_FORM) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value, ...(k === 'categorie' ? { sousCategorie: '' } : {}) }));

  return (
    <div className="max-w-6xl px-4 py-8 mx-auto">
      {/* En-tête */}
      <div className="flex flex-col justify-between gap-4 mb-6 md:flex-row md:items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Produits</h1>
          <p className="mt-1 text-sm text-gray-500">Gérez votre catalogue et suivez la valeur de votre stock</p>
        </div>
        <button
          onClick={openCreate}
          className="inline-flex items-center justify-center gap-2 bg-primary-600 hover:bg-primary-700 active:scale-[0.98] transition-all text-white px-5 py-2.5 rounded-xl text-sm font-semibold shadow-sm shadow-primary-600/20"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Nouveau produit
        </button>
      </div>

      {/* Cartes statistiques */}
      <div className="grid grid-cols-1 gap-4 mb-6 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Nombre de produits"
         value={String(productCount)}
          hint={alertCount > 0 ? `${alertCount} en alerte de stock` : 'Aucune alerte de stock'}
          hintClass={alertCount > 0 ? 'text-amber-600' : 'text-gray-400'}
          valueClass="text-gray-900"
          iconBg="bg-violet-50 text-violet-600"
          icon={
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
          }
        />
        <StatCard
          label="Valeur du stock (achat)"
          value={stockValue.toFixed(2)}
          hint="Ce que votre stock a coûté"
          hintClass="text-gray-400"
          valueClass="text-gray-900"
          iconBg="bg-amber-50 text-amber-600"
          icon={
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          }
        />
        <StatCard
          label="Valeur du stock (vente)"
          value={stockSaleValue.toFixed(2)}
          hint="Si tout est vendu au prix actuel"
          hintClass="text-gray-400"
          valueClass="text-primary-700"
          iconBg="bg-blue-50 text-blue-600"
          icon={
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
        <StatCard
          label="Bénéfice potentiel"
          value={`${potentialProfit >= 0 ? '+' : ''}${potentialProfit.toFixed(2)}`}
          hint={
            stockValue > 0
              ? `Marge de ${((potentialProfit / stockValue) * 100).toFixed(1)} % sur le coût`
              : 'Aucun stock valorisé'
          }
          hintClass="text-gray-400"
          valueClass={potentialProfit >= 0 ? 'text-green-600' : 'text-red-600'}
          iconBg={potentialProfit >= 0 ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}
          icon={
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          }
        />
      </div>

      {error && (
        <p className="px-3 py-2 mb-4 text-sm text-red-600 border border-red-100 rounded-lg bg-red-50">{error}</p>
      )}

      {/* Recherche et filtres */}
      <div className="grid grid-cols-1 gap-3 p-4 mb-4 bg-white border border-gray-100 shadow-sm rounded-2xl md:grid-cols-3">
        <input
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          placeholder="Rechercher par nom ou référence"
          className={inputClass}
        />
        <select value={filterCat} onChange={(e) => { setFilterCat(e.target.value); setPage(1); }} className={inputClass}>
          <option value="">Toutes les catégories</option>
          {mains.map((m) => (
            <option key={m._id} value={m._id}>{m.nom}</option>
          ))}
        </select>
        <select value={filterStock} onChange={(e) => { setFilterStock(e.target.value); setPage(1); }} className={inputClass}>
          <option value="">Tous les stocks</option>
          <option value="alerte">Stock faible ou rupture</option>
          <option value="rupture">Rupture seulement</option>
        </select>
      </div>

      {/* Tableau */}
      <div className="overflow-hidden bg-white border border-gray-100 shadow-sm rounded-2xl">
        {loading ? (
          <p className="py-16 text-sm text-center text-gray-400">Chargement...</p>
        ) : shown.length === 0 ? (
          <p className="py-16 text-sm text-center text-gray-500">
            {products.length === 0 ? 'Aucun produit. Créez le premier.' : 'Aucun produit ne correspond à la recherche.'}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs tracking-wide text-left text-gray-500 uppercase bg-gray-50">
                <tr>
                  <th className="px-5 py-3.5 font-semibold">Produit</th>
                  <th className="px-5 py-3.5 font-semibold">Catégorie</th>
                  <th className="px-5 py-3.5 font-semibold text-right">Prix achat</th>
                  <th className="px-5 py-3.5 font-semibold text-right">Prix vente</th>
                  <th className="px-5 py-3.5 font-semibold text-right">Stock</th>
                  <th className="px-5 py-3.5"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {shown.map((p) => {
                  const badge = BADGES[stockState(p)];
                  return (
                    <tr key={p._id} className="transition-colors hover:bg-gray-50/80">
                      <td className="px-5 py-3.5">
  <div className="flex items-center gap-3">
    <div className="flex items-center justify-center w-11 h-11 overflow-hidden bg-gray-50 border border-gray-100 rounded-lg shrink-0">
      {p.image ? (
        <img src={p.image} alt={p.nom} loading="lazy" className="object-cover w-full h-full" />
      ) : (
        <svg className="w-5 h-5 text-gray-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
        </svg>
      )}
    </div>
    <div>
      <p className="font-medium text-gray-800">{p.nom}</p>
      {p.reference && <p className="text-xs text-gray-400">{p.reference}</p>}
    </div>
  </div>
</td>
                      <td className="px-5 py-3.5">
                        <p className="font-medium text-gray-800">{p.nom}</p>
                        {p.reference && <p className="text-xs text-gray-400">{p.reference}</p>}
                      </td>
                      <td className="px-5 py-3.5 text-gray-500">
                        {p.categorie?.nom || '—'}
                        {p.sousCategorie && <span className="text-gray-400"> › {p.sousCategorie.nom}</span>}
                      </td>
                      <td className="px-5 py-3.5 text-right text-gray-600">{p.prixAchat.toFixed(2)}</td>
                      <td className="px-5 py-3.5 text-right font-medium text-gray-800">{p.prixVente.toFixed(2)}</td>
                      <td className="px-5 py-3.5 text-right whitespace-nowrap">
                        <span className="mr-2 font-semibold text-gray-800">{p.stock}</span>
                        <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${badge.cls}`}>
                          {badge.label}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center justify-end">
                          <IconBtn title="Ajuster le stock" d={ICON_PATHS.swap} hover="hover:text-primary-600 hover:bg-primary-50" onClick={() => openStock(p)} />
                          <IconBtn title="Historique du stock" d={ICON_PATHS.clock} hover="hover:text-primary-600 hover:bg-primary-50" onClick={() => openHistory(p)} />
                          <IconBtn title="Modifier" d={ICON_PATHS.edit} hover="hover:text-primary-600 hover:bg-primary-50" onClick={() => openEdit(p)} />
                          <IconBtn title="Supprimer" d={ICON_PATHS.trash} hover="hover:text-red-600 hover:bg-red-50" onClick={() => { setDeleteError(''); setToDelete(p); }} />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {totalPages > 1 && (
  <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-5 py-3.5 border-t border-gray-100 bg-gray-50/50">

    <p className="text-xs text-gray-500">
      {startIndex + 1}–
      {Math.min(startIndex + PAGE_SIZE, filtered.length)} sur {filtered.length} produits
    </p>

    <div className="flex items-center gap-1">

      {/* Précédent */}
      <button
        onClick={() => setPage(Math.max(1, currentPage - 1))}
        disabled={currentPage === 1}
        className="flex items-center justify-center w-8 h-8 text-gray-600 rounded-lg hover:bg-white hover:shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
      >
        ‹
      </button>

      {/* Numéros des pages */}
      {getPageNumbers().map((p, i) =>
        p === '...' ? (
          <span
            key={`dots-${i}`}
            className="flex items-center justify-center w-8 h-8 text-gray-400"
          >
            …
          </span>
        ) : (
          <button
            key={p}
            onClick={() => setPage(p)}
            className={`w-8 h-8 rounded-lg text-sm font-medium ${
              p === currentPage
                ? 'bg-primary-600 text-white shadow-sm'
                : 'text-gray-600 hover:bg-white hover:shadow-sm'
            }`}
          >
            {p}
          </button>
        )
      )}

      {/* Suivant */}
      <button
        onClick={() => setPage(Math.min(totalPages, currentPage + 1))}
        disabled={currentPage === totalPages}
        className="flex items-center justify-center w-8 h-8 text-gray-600 rounded-lg hover:bg-white hover:shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
      >
        ›
      </button>

    </div>
  </div>
)}
      </div>

      {/* Formulaire créer / modifier */}
      {showForm && (
        <Modal title={editing ? 'Modifier le produit' : 'Nouveau produit'} onClose={() => setShowForm(false)} wide>
          <form onSubmit={handleSave} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Nom *</label>
              <input required value={form.nom} onChange={setField('nom')} className={inputClass} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Référence</label>
              <input value={form.reference} onChange={setField('reference')} className={inputClass} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Catégorie *</label>
              <select required value={form.categorie} onChange={setField('categorie')} className={inputClass}>
                <option value="">Choisir...</option>
                {mains.map((m) => (
                  <option key={m._id} value={m._id}>{m.nom}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Sous-catégorie</label>
              <select value={form.sousCategorie} onChange={setField('sousCategorie')} disabled={!form.categorie} className={inputClass}>
                <option value="">Aucune</option>
                {subsOfForm.map((s) => (
                  <option key={s._id} value={s._id}>{s.nom}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Prix d'achat *</label>
              <input required type="number" step="0.01" min="0" value={form.prixAchat} onChange={setField('prixAchat')} className={inputClass} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Prix de vente *</label>
              <input required type="number" step="0.01" min="0" value={form.prixVente} onChange={setField('prixVente')} className={inputClass} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">
                {editing ? 'Stock actuel (modifiable via « Ajuster »)' : 'Stock initial'}
              </label>
              <input
                type="number"
                min="0"
                value={form.stock}
                onChange={setField('stock')}
                disabled={!!editing}
                className={`${inputClass} disabled:bg-gray-50 disabled:text-gray-400`}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Seuil d'alerte</label>
              <input type="number" min="0" value={form.seuilAlerte} onChange={setField('seuilAlerte')} className={inputClass} />
            </div>
             <div className="sm:col-span-2">
  <label className="block text-xs font-medium text-gray-500 mb-1.5">Image du produit</label>
  <div className="flex items-center gap-4">
    <div className="flex items-center justify-center w-20 h-20 overflow-hidden bg-gray-50 border border-gray-200 rounded-xl shrink-0">
      {form.image ? (
        <img src={form.image} alt="Aperçu" className="object-cover w-full h-full" />
      ) : (
        <svg className="w-8 h-8 text-gray-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      )}
    </div>
    <div className="flex flex-wrap items-center gap-2">
      <label className="px-4 py-2 text-sm font-semibold transition-colors border cursor-pointer text-primary-700 bg-primary-50 border-primary-200 rounded-xl hover:bg-primary-100">
        {form.image ? "Changer l'image" : 'Choisir une image'}
        <input type="file" accept="image/*" onChange={handleImage} className="hidden" />
      </label>
      {form.image && (
        <button
          type="button"
          onClick={() => setForm((f) => ({ ...f, image: '' }))}
          className="px-4 py-2 text-sm font-semibold text-red-600 transition-colors rounded-xl hover:bg-red-50"
        >
          Retirer
        </button>
      )}
    </div>
  </div>
  {imageError && <p className="mt-1.5 text-xs text-red-600">{imageError}</p>}
</div>
            {formError && (
              <p className="px-3 py-2 text-sm text-red-600 border border-red-100 rounded-lg sm:col-span-2 bg-red-50">{formError}</p>
            )}

            <button className="sm:col-span-2 bg-primary-600 hover:bg-primary-700 text-white py-2.5 rounded-xl font-semibold text-sm">
              {editing ? 'Enregistrer les modifications' : 'Créer le produit'}
            </button>
          </form>
        </Modal>
      )}

      {/* Ajustement de stock */}
      {stockFor && (
        <Modal title={`Stock : ${stockFor.nom}`} onClose={() => setStockFor(null)}>
          <p className="mb-4 text-sm text-gray-500">
            Stock actuel : <span className="font-semibold text-gray-800">{stockFor.stock}</span>
          </p>
          <form onSubmit={handleStock} className="space-y-4">
            <div className="flex p-1 text-sm bg-gray-100 rounded-lg">
              {(['entree', 'sortie'] as const).map((m) => (
                <button
                  type="button"
                  key={m}
                  onClick={() => setMode(m)}
                  className={`flex-1 py-2 rounded-md font-medium transition-colors ${
                    mode === m ? 'bg-white shadow-sm text-gray-800' : 'text-gray-500'
                  }`}
                >
                  {m === 'entree' ? 'Entrée (+)' : 'Sortie (−)'}
                </button>
              ))}
            </div>
            <input required type="number" min="0" step="any" value={qty} onChange={(e) => setQty(e.target.value)} placeholder="Quantité" className={inputClass} />
            <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Motif (optionnel) : casse, inventaire..." className={inputClass} />
            {stockError && <p className="text-sm text-red-600">{stockError}</p>}
            <button className="w-full bg-primary-600 hover:bg-primary-700 text-white py-2.5 rounded-xl font-semibold text-sm">
              Valider
            </button>
          </form>
        </Modal>
      )}

      {/* Historique des mouvements */}
      {historyFor && (
        <Modal title={`Historique : ${historyFor.nom}`} onClose={() => setHistoryFor(null)} wide>
          {historyLoading ? (
  <p className="py-8 text-sm text-center text-gray-400">Chargement...</p>
) : historyError ? (
  <p className="px-3 py-2 text-sm text-red-600 border border-red-100 rounded-lg bg-red-50">{historyError}</p>
) : movements.length === 0 ? (
  <p className="py-8 text-sm text-center text-gray-500">Aucun mouvement.</p>
) : (
            <table className="w-full text-sm">
              <thead className="text-xs text-left text-gray-500 uppercase border-b">
                <tr>
                  <th className="py-2">Date</th>
                  <th>Motif</th>
                  <th className="text-right">Quantité</th>
                  <th className="text-right">Stock après</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {shownMovements.map((m) => (
                  <tr key={m._id}>
                    <td className="py-2 text-gray-500 whitespace-nowrap">
                      {new Date(m.createdAt).toLocaleString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="text-gray-600">{m.note || '—'}</td>
                    <td className={`text-right font-semibold ${m.quantite > 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {m.quantite > 0 ? '+' : ''}{m.quantite}
                    </td>
                    <td className="text-right text-gray-800">{m.stockApres}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            
          )}
         {historyTotalPages > 1 && (
  <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-5 py-3.5 border-t border-gray-100 bg-gray-50/50">

    <p className="text-xs text-gray-500">
      {historyStartIndex + 1}–
      {Math.min(
        historyStartIndex + HISTORY_PAGE_SIZE,
        movements.length
      )} sur {movements.length} mouvements
    </p>

    <div className="flex items-center gap-1">

      {/* Précédent */}
      <button
        onClick={() => setHistoryPage(Math.max(1, currentHistoryPage - 1))}
        disabled={currentHistoryPage === 1}
        className="flex items-center justify-center w-8 h-8 text-gray-600 rounded-lg hover:bg-white hover:shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
      >
        ‹
      </button>

      {/* Numéros des pages */}
      {getHistoryPageNumbers().map((p, i) =>
        p === '...' ? (
          <span
            key={`dots-${i}`}
            className="flex items-center justify-center w-8 h-8 text-gray-400"
          >
            …
          </span>
        ) : (
          <button
            key={p}
            onClick={() => setHistoryPage(p)}
            className={`w-8 h-8 rounded-lg text-sm font-medium ${
              p === currentHistoryPage
                ? 'bg-primary-600 text-white shadow-sm'
                : 'text-gray-600 hover:bg-white hover:shadow-sm'
            }`}
          >
            {p}
          </button>
        )
      )}

      {/* Suivant */}
      <button
        onClick={() => setHistoryPage(Math.min(historyTotalPages, currentHistoryPage + 1))}
        disabled={currentHistoryPage === historyTotalPages}
        className="flex items-center justify-center w-8 h-8 text-gray-600 rounded-lg hover:bg-white hover:shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
      >
        ›
      </button>

    </div>
  </div>
)}  
        </Modal>
      )}

      {/* Suppression */}
      {toDelete && (
        <Modal title="Supprimer ce produit ?" onClose={() => setToDelete(null)}>
          <p className="text-sm text-gray-500">
            « {toDelete.nom} » et son historique de stock seront supprimés définitivement.
          </p>
          {deleteError && (
            <p className="px-3 py-2 mt-4 text-sm text-red-600 border border-red-100 rounded-lg bg-red-50">{deleteError}</p>
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

function StatCard({
  label,
  value,
  hint,
  hintClass,
  valueClass,
  icon,
  iconBg,
}: {
  label: string;
  value: string;
  hint: string;
  hintClass: string;
  valueClass: string;
  icon: ReactElement;
  iconBg: string;
}) {
  return (
    <div className="flex items-start justify-between gap-4 p-5 transition-shadow bg-white border border-gray-100 shadow-sm rounded-2xl hover:shadow-md">
      <div className="min-w-0">
        <p className="text-sm text-gray-500">{label}</p>
        <p className={`text-2xl font-bold mt-1 tracking-tight truncate ${valueClass}`}>{value}</p>
        <p className={`text-xs mt-1.5 ${hintClass}`}>{hint}</p>
      </div>
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${iconBg}`}>{icon}</div>
    </div>
  );
}