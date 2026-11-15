import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/axios';
import { UserInfo } from '../../types';
import { Product, Transfer } from '../../types/stock';

interface Line {
  produit: string;
  quantite: string;
}

const inputClass =
  'w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 transition-shadow';

const emptyLine = (): Line => ({ produit: '', quantite: '1' });

const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export default function NewTransfer() {
  const [products, setProducts] = useState<Product[]>([]);
  const [commerciaux, setCommerciaux] = useState<UserInfo[]>([]);
  const [commercial, setCommercial] = useState('');
  const [date, setDate] = useState(today());
  const [note, setNote] = useState('');
  const [lines, setLines] = useState<Line[]>([emptyLine()]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState<Transfer | null>(null);

  async function loadProducts() {
    const { data } = await api.get('/products');
    setProducts(data);
  }

  useEffect(() => {
    loadProducts().catch(() => setError('Impossible de charger les produits'));
    api
      .get('/users/commerciaux')
      .then((r) => setCommerciaux(r.data.filter((u: UserInfo) => u.actif)))
      .catch(() => setError('Impossible de charger les commerciaux'));
  }, []);

  const productById = useMemo(() => new Map(products.map((p) => [p._id, p])), [products]);

  function updateLine(i: number, patch: Partial<Line>) {
    setLines((ls) => ls.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));
  }

  function lineProblem(l: Line): string {
    if (!l.produit) return '';
    const q = parseFloat(l.quantite);
    if (!q || q <= 0) return 'Quantité invalide';
    const p = productById.get(l.produit);
    if (p && q > p.stock) return `Stock disponible : ${p.stock}`;
    return '';
  }

  const filledLines = lines.filter((l) => l.produit);
  const totalQty = filledLines.reduce((s, l) => s + (parseFloat(l.quantite) || 0), 0);
  const canSubmit = commercial !== '' && filledLines.length > 0 && filledLines.every((l) => !lineProblem(l));

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const { data } = await api.post('/transfers', {
        commercial,
        date,
        note: note.trim() || undefined,
        lignes: filledLines.map((l) => ({ produit: l.produit, quantite: parseFloat(l.quantite) })),
      });
      setDone(data);
      setLines([emptyLine()]);
      setNote('');
      loadProducts(); // stocks à jour
    } catch (err: any) {
      const msg = err.response?.data?.message;
      setError(Array.isArray(msg) ? msg.join(', ') : msg || 'Erreur lors du transfert');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-4xl px-4 py-8 mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">Nouveau transfert</h1>
        <p className="mt-1 text-sm text-gray-500">
          Transférez des produits de votre stock vers le stock d'un commercial
        </p>
      </div>

      {done && (
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 mb-5 text-sm text-green-700 border border-green-100 rounded-xl bg-green-50">
          <span>
            Transfert <strong>{done.numero}</strong> enregistré pour <strong>{done.commercialNom}</strong>.
          </span>
          <Link to="/admin/transferts" className="font-semibold underline underline-offset-2">
            Voir les transferts
          </Link>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="grid grid-cols-1 gap-4 p-5 bg-white border border-gray-100 shadow-sm rounded-2xl md:grid-cols-2">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">Commercial *</label>
            <select required value={commercial} onChange={(e) => setCommercial(e.target.value)} className={inputClass}>
              <option value="">Choisir un commercial...</option>
              {commerciaux.map((u) => (
                <option key={u._id} value={u._id}>{u.nom}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">Date *</label>
            <input required type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputClass} />
          </div>
        </div>

        <div className="p-5 bg-white border border-gray-100 shadow-sm rounded-2xl">
          <h2 className="mb-4 text-base font-semibold text-gray-800">Produits à transférer</h2>

          <div className="space-y-3">
            {lines.map((l, i) => {
              const problem = lineProblem(l);
              const taken = new Set(lines.filter((_, idx) => idx !== i).map((x) => x.produit));
              return (
                <div key={i}>
                  <div className="grid grid-cols-1 md:grid-cols-[1fr_130px_36px] gap-3 items-center">
                    <select value={l.produit} onChange={(e) => updateLine(i, { produit: e.target.value })} className={inputClass}>
                      <option value="">Choisir un produit...</option>
                      {products
                        .filter((p) => !taken.has(p._id))
                        .map((p) => (
                          <option key={p._id} value={p._id} disabled={p.stock <= 0}>
                            {p.nom} — stock : {p.stock}
                          </option>
                        ))}
                    </select>
                    <input
                      type="number" min="0" step="any" placeholder="Quantité"
                      value={l.quantite}
                      onChange={(e) => updateLine(i, { quantite: e.target.value })}
                      className={inputClass}
                    />
                    <button
                      type="button"
                      onClick={() => setLines((ls) => (ls.length === 1 ? [emptyLine()] : ls.filter((_, idx) => idx !== i)))}
                      className="flex items-center justify-center text-gray-400 transition-colors rounded-lg w-9 h-9 hover:text-red-600 hover:bg-red-50"
                      aria-label="Retirer la ligne"
                      title="Retirer"
                    >
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                  {problem && <p className="px-1 mt-1 text-xs text-red-600">{problem}</p>}
                </div>
              );
            })}
          </div>

          <button
            type="button"
            onClick={() => setLines((ls) => [...ls, emptyLine()])}
            className="inline-flex items-center gap-2 px-4 py-2 mt-4 text-sm font-semibold transition-all border text-primary-700 bg-primary-50 border-primary-200 rounded-xl hover:bg-primary-600 hover:text-white hover:border-primary-600"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Ajouter un produit
          </button>

          <div className="flex items-center justify-between pt-4 mt-6 border-t border-gray-100">
            <span className="font-medium text-gray-500">Quantité totale transférée</span>
            <span className="text-2xl font-bold text-primary-700">{totalQty}</span>
          </div>
        </div>

        <div className="p-5 bg-white border border-gray-100 shadow-sm rounded-2xl">
          <label className="block text-xs font-medium text-gray-500 mb-1.5">Note (optionnel)</label>
          <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ex : tournée du lundi" className={inputClass} />
        </div>

        {error && (
          <p className="px-3 py-2 text-sm text-red-600 border border-red-100 rounded-lg bg-red-50">{error}</p>
        )}

        <button
          type="submit"
          disabled={!canSubmit || saving}
          className="w-full md:w-auto md:px-10 bg-primary-600 hover:bg-primary-700 active:scale-[0.99] transition-all text-white py-3 rounded-xl font-semibold text-sm shadow-sm shadow-primary-600/20 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? 'Transfert en cours...' : 'Valider le transfert'}
        </button>
      </form>
    </div>
  );
}