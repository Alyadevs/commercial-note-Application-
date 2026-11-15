import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/axios';
import { Product, Purchase } from '../../types/stock';
import { buildPurchasePdf } from '../../utils/purchasePdf';

interface Line {
  produit: string;
  quantite: string;
  prixAchat: string;
  prixVente: string;
}

const inputClass =
  'w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 transition-shadow';

const emptyLine = (): Line => ({ produit: '', quantite: '1', prixAchat: '', prixVente: '' });

const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export default function NewPurchase() {
  const [products, setProducts] = useState<Product[]>([]);
  const [suppliers, setSuppliers] = useState<string[]>([]);
  const [fournisseur, setFournisseur] = useState('');
  const [date, setDate] = useState(today());
  const [note, setNote] = useState('');
  const [lines, setLines] = useState<Line[]>([emptyLine()]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [purchase, setPurchase] = useState<Purchase | null>(null);
  const [pdfUrl, setPdfUrl] = useState('');

  useEffect(() => {
    api.get('/products').then((r) => setProducts(r.data)).catch(() => setError('Impossible de charger les produits'));
    api
      .get('/purchases')
      .then((r) => setSuppliers([...new Set<string>(r.data.map((p: Purchase) => p.fournisseur))]))
      .catch(() => {});
  }, []);

  const productById = useMemo(() => new Map(products.map((p) => [p._id, p])), [products]);

  function updateLine(i: number, patch: Partial<Line>) {
    setLines((ls) => ls.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));
  }

  function selectProduct(i: number, id: string) {
    const p = productById.get(id);
    updateLine(i, {
      produit: id,
      prixAchat: p ? String(p.prixAchat) : '',
      prixVente: p ? String(p.prixVente) : '',
    });
  }

  const lineTotal = (l: Line) => (parseFloat(l.quantite) || 0) * (parseFloat(l.prixAchat) || 0);
  const total = lines.reduce((s, l) => s + lineTotal(l), 0);

  function lineProblem(l: Line): string {
    if (!l.produit) return '';
    if (!(parseFloat(l.quantite) > 0)) return 'Quantité invalide';
    if (l.prixAchat === '' || parseFloat(l.prixAchat) < 0) return "Prix d'achat requis";
    if (l.prixVente === '' || parseFloat(l.prixVente) < 0) return 'Prix de vente requis';
    return '';
  }

  const lineWarning = (l: Line) =>
    l.produit && parseFloat(l.prixVente) < parseFloat(l.prixAchat)
      ? "Le prix de vente est inférieur au prix d'achat"
      : '';

  const filledLines = lines.filter((l) => l.produit);
  const canSubmit =
    fournisseur.trim() !== '' && filledLines.length > 0 && filledLines.every((l) => !lineProblem(l));

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const { data } = await api.post('/purchases', {
        fournisseur: fournisseur.trim(),
        date,
        note: note.trim() || undefined,
        lignes: filledLines.map((l) => ({
          produit: l.produit,
          quantite: parseFloat(l.quantite),
          prixAchat: parseFloat(l.prixAchat),
          prixVente: parseFloat(l.prixVente),
        })),
      });
      const blob = buildPurchasePdf(data).output('blob');
      setPurchase(data);
      setPdfUrl(URL.createObjectURL(blob));
      api.get('/products').then((r) => setProducts(r.data)); // stocks et prix à jour
    } catch (err: any) {
      const msg = err.response?.data?.message;
      setError(Array.isArray(msg) ? msg.join(', ') : msg || "Erreur lors de l'enregistrement de l'achat");
    } finally {
      setSaving(false);
    }
  }

  function closePreview() {
    URL.revokeObjectURL(pdfUrl);
    setPdfUrl('');
    setPurchase(null);
    setFournisseur('');
    setNote('');
    setLines([emptyLine()]);
    setDate(today());
  }

  return (
    <div className="max-w-5xl px-4 py-8 mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">Nouvel achat</h1>
        <p className="mt-1 text-sm text-gray-500">
          Saisissez le fournisseur et les produits reçus : le stock sera augmenté et un PDF généré
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Fournisseur et date */}
        <div className="grid grid-cols-1 gap-4 p-5 bg-white border border-gray-100 shadow-sm rounded-2xl md:grid-cols-2">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">Nom du fournisseur *</label>
            <input
              required
              list="suppliers-list"
              value={fournisseur}
              onChange={(e) => setFournisseur(e.target.value)}
              placeholder="Tapez ou choisissez un fournisseur"
              className={inputClass}
            />
            <datalist id="suppliers-list">
              {suppliers.map((s) => (
                <option key={s} value={s} />
              ))}
            </datalist>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">Date *</label>
            <input required type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputClass} />
          </div>
        </div>

        {/* Produits */}
        <div className="p-5 bg-white border border-gray-100 shadow-sm rounded-2xl">
          <h2 className="mb-4 text-base font-semibold text-gray-800">Produits reçus</h2>

          <div className="hidden md:grid grid-cols-[1fr_90px_120px_120px_110px_36px] gap-3 text-xs font-medium text-gray-500 mb-2 px-1">
            <span>Produit</span>
            <span>Quantité</span>
            <span>Prix d'achat</span>
            <span>Prix de vente</span>
            <span className="text-right">Total achat</span>
            <span />
          </div>

          <div className="space-y-3">
            {lines.map((l, i) => {
              const problem = lineProblem(l);
              const warning = lineWarning(l);
              const taken = new Set(lines.filter((_, idx) => idx !== i).map((x) => x.produit));
              return (
                <div key={i}>
                  <div className="grid grid-cols-1 md:grid-cols-[1fr_90px_120px_120px_110px_36px] gap-3 items-center">
                    <select value={l.produit} onChange={(e) => selectProduct(i, e.target.value)} className={inputClass}>
                      <option value="">Choisir un produit...</option>
                      {products
                        .filter((p) => !taken.has(p._id))
                        .map((p) => (
                          <option key={p._id} value={p._id}>
                            {p.nom} — stock : {p.stock}
                          </option>
                        ))}
                    </select>
                    <input
                      type="number" min="0" step="any" placeholder="Qté"
                      value={l.quantite}
                      onChange={(e) => updateLine(i, { quantite: e.target.value })}
                      className={inputClass}
                    />
                    <input
                      type="number" min="0" step="0.01" placeholder="Prix achat"
                      value={l.prixAchat}
                      onChange={(e) => updateLine(i, { prixAchat: e.target.value })}
                      className={inputClass}
                    />
                    <input
                      type="number" min="0" step="0.01" placeholder="Prix vente"
                      value={l.prixVente}
                      onChange={(e) => updateLine(i, { prixVente: e.target.value })}
                      className={inputClass}
                    />
                    <p className="px-1 font-semibold text-gray-800 md:text-right">{lineTotal(l).toFixed(2)}</p>
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
                  {!problem && warning && <p className="px-1 mt-1 text-xs text-amber-600">{warning}</p>}
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
            <span className="font-medium text-gray-500">Total de l'achat</span>
            <span className="text-2xl font-bold text-primary-700">{total.toFixed(2)}</span>
          </div>
        </div>

        {/* Note */}
        <div className="p-5 bg-white border border-gray-100 shadow-sm rounded-2xl">
          <label className="block text-xs font-medium text-gray-500 mb-1.5">Note (optionnel)</label>
          <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ex : livraison du 10/11" className={inputClass} />
        </div>

        {error && (
          <p className="px-3 py-2 text-sm text-red-600 border border-red-100 rounded-lg bg-red-50">{error}</p>
        )}

        <button
          type="submit"
          disabled={!canSubmit || saving}
          className="w-full md:w-auto md:px-10 bg-primary-600 hover:bg-primary-700 active:scale-[0.99] transition-all text-white py-3 rounded-xl font-semibold text-sm shadow-sm shadow-primary-600/20 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? 'Enregistrement...' : "Valider l'achat"}
        </button>
      </form>

      {/* Aperçu du PDF */}
      {purchase && pdfUrl && (
        <div className="fixed inset-0 z-[60] bg-black/60 p-3 sm:p-6 flex flex-col">
          <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 bg-white rounded-t-2xl">
            <div>
              <p className="font-semibold text-gray-900">Achat {purchase.numero}</p>
              <p className="text-xs text-green-600">Achat enregistré, le stock a été mis à jour</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <a
                href={pdfUrl}
                download={`${purchase.numero}.pdf`}
                className="px-4 py-2 text-sm font-semibold text-white transition-colors bg-primary-600 hover:bg-primary-700 rounded-xl"
              >
                Télécharger
              </a>
              <Link
                to="/admin/achats"
                className="px-4 py-2 text-sm font-semibold text-gray-700 transition-colors bg-gray-100 rounded-xl hover:bg-gray-200"
              >
                Voir les achats
              </Link>
              <button
                onClick={closePreview}
                className="px-4 py-2 text-sm font-semibold text-gray-700 transition-colors bg-gray-100 rounded-xl hover:bg-gray-200"
              >
                Nouvel achat
              </button>
            </div>
          </div>
          <iframe title="Facture d'achat PDF" src={pdfUrl} className="flex-1 w-full bg-white rounded-b-2xl" />
        </div>
      )}
    </div>
  );
}