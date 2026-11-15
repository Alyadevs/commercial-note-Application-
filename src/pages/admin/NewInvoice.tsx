import { FormEvent, useEffect, useMemo, useState } from 'react';
import api from '../../api/axios';
import { Client } from '../../types';
import { Invoice, Product } from '../../types/stock';
import { buildInvoicePdf } from '../../utils/invoicePdf';
import { Link } from 'react-router-dom';

interface Line {
  produit: string;
  quantite: string;
  prixUnitaire: string;
}

const inputClass =
  'w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 transition-shadow';

const emptyLine = (): Line => ({ produit: '', quantite: '1', prixUnitaire: '' });

const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export default function NewInvoice() {
  const [products, setProducts] = useState<Product[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [clientNom, setClientNom] = useState('');
  const [date, setDate] = useState(today());
  const [note, setNote] = useState('');
  const [lines, setLines] = useState<Line[]>([emptyLine()]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
const [remiseType, setRemiseType] = useState<'pourcentage' | 'montant'>('pourcentage');
const [remiseValeur, setRemiseValeur] = useState('');
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [pdfUrl, setPdfUrl] = useState('');

  async function loadProducts() {
    const { data } = await api.get('/products');
    setProducts(data);
  }

  useEffect(() => {
    loadProducts().catch(() => setError('Impossible de charger les produits'));
    api.get('/clients').then((r) => setClients(r.data)).catch(() => {});
  }, []);

  const productById = useMemo(() => new Map(products.map((p) => [p._id, p])), [products]);

  function updateLine(i: number, patch: Partial<Line>) {
    setLines((ls) => ls.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));
  }

  function selectProduct(i: number, id: string) {
    const p = productById.get(id);
    updateLine(i, { produit: id, prixUnitaire: p ? String(p.prixVente) : '' });
  }

  const lineTotal = (l: Line) => (parseFloat(l.quantite) || 0) * (parseFloat(l.prixUnitaire) || 0);
 const sousTotal = lines.reduce((s, l) => s + lineTotal(l), 0);
const rv = parseFloat(remiseValeur) || 0;
const remiseMontant = remiseType === 'pourcentage' ? (sousTotal * rv) / 100 : rv;
const remiseProblem =
  rv > 0 && remiseType === 'pourcentage' && rv > 100
    ? 'La remise ne peut pas dépasser 100 %'
    : rv > 0 && remiseType === 'montant' && rv > sousTotal
    ? 'La remise dépasse le total de la facture'
    : '';
const total = Math.max(0, sousTotal - (remiseProblem ? 0 : remiseMontant));


  // Message d'erreur par ligne (stock insuffisant, quantité invalide)
  function lineProblem(l: Line): string {
    if (!l.produit) return '';
    const p = productById.get(l.produit);
    const q = parseFloat(l.quantite);
    if (!q || q <= 0) return 'Quantité invalide';
    if (p && q > p.stock) return `Stock disponible : ${p.stock}`;
    return '';
  }

  const filledLines = lines.filter((l) => l.produit);
  const canSubmit =
  clientNom.trim() !== '' && filledLines.length > 0 && filledLines.every((l) => !lineProblem(l)) && !remiseProblem;
  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const matched = clients.find((c) => c.nom.trim().toLowerCase() === clientNom.trim().toLowerCase());
      const { data } = await api.post('/invoices', {
  client: matched?._id,
  clientNom: clientNom.trim(),
  date,
  note: note.trim() || undefined,

  lignes: filledLines.map((l) => ({
    produit: l.produit,
    quantite: parseFloat(l.quantite),
    prixUnitaire: l.prixUnitaire === '' ? undefined : parseFloat(l.prixUnitaire),
  })),

  remiseType: rv > 0 ? remiseType : undefined,
  remiseValeur: rv > 0 ? rv : undefined,
  remise: remiseProblem ? 0 : remiseMontant,
  sousTotal,
  total,
});
      const blob = buildInvoicePdf(data).output('blob');
      setInvoice(data);
      setPdfUrl(URL.createObjectURL(blob));
      loadProducts(); // met à jour les stocks affichés
    } catch (err: any) {
      const msg = err.response?.data?.message;
      setError(Array.isArray(msg) ? msg.join(', ') : msg || 'Erreur lors de la validation de la facture');
    } finally {
      setSaving(false);
    }
  }

  function closePreview() {
    URL.revokeObjectURL(pdfUrl);
    setPdfUrl('');
    setInvoice(null);
    setClientNom('');
    setNote('');
    setLines([emptyLine()]);
    setDate(today());
  }

  return (
    <div className="max-w-5xl px-4 py-8 mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">Nouvelle facture</h1>
        <p className="mt-1 text-sm text-gray-500">Choisissez le client et les produits, puis validez pour générer le PDF</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Client et date */}
        <div className="grid grid-cols-1 gap-4 p-5 bg-white border border-gray-100 shadow-sm rounded-2xl md:grid-cols-2">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">Nom du client *</label>
            <input
              required
              list="clients-list"
              value={clientNom}
              onChange={(e) => setClientNom(e.target.value)}
              placeholder="Tapez ou choisissez un client"
              className={inputClass}
            />
            <datalist id="clients-list">
              {clients.map((c) => (
                <option key={c._id} value={c.nom} />
              ))}
            </datalist>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">Date *</label>
            <input required type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputClass} />
          </div>
        </div>

        {/* Lignes de produits */}
        <div className="p-5 bg-white border border-gray-100 shadow-sm rounded-2xl">
          <h2 className="mb-4 text-base font-semibold text-gray-800">Produits</h2>

          <div className="hidden md:grid grid-cols-[1fr_100px_130px_120px_36px] gap-3 text-xs font-medium text-gray-500 mb-2 px-1">
            <span>Produit</span>
            <span>Quantité</span>
            <span>Prix unitaire</span>
            <span className="text-right">Total</span>
            <span />
          </div>

          <div className="space-y-3">
            {lines.map((l, i) => {
              const problem = lineProblem(l);
              const taken = new Set(lines.filter((_, idx) => idx !== i).map((x) => x.produit));
              return (
                <div key={i}>
                  <div className="grid grid-cols-1 md:grid-cols-[1fr_100px_130px_120px_36px] gap-3 items-center">
                    <select value={l.produit} onChange={(e) => selectProduct(i, e.target.value)} className={inputClass}>
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
                      type="number"
                      min="0"
                      step="any"
                      value={l.quantite}
                      onChange={(e) => updateLine(i, { quantite: e.target.value })}
                      placeholder="Qté"
                      className={inputClass}
                    />
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={l.prixUnitaire}
                      onChange={(e) => updateLine(i, { prixUnitaire: e.target.value })}
                      placeholder="Prix"
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
                </div>
              );
            })}
          </div>

          <button
            type="button"
            onClick={() => setLines((ls) => [...ls, emptyLine()])}
            className="inline-flex items-center gap-2 px-4 py-2 mt-4 text-sm font-semibold transition-all border rounded-xl text-primary-700 bg-primary-50 border-primary-200 hover:bg-primary-600 hover:text-white hover:border-primary-600"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Ajouter un produit
          </button>

          <div className="pt-4 mt-6 space-y-3 border-t border-gray-100">
  <div className="flex items-center justify-between">
    <span className="font-medium text-gray-500">Sous-total</span>
    <span className="font-semibold text-gray-800">{sousTotal.toFixed(2)}</span>
  </div>

  <div className="flex flex-wrap items-center justify-between gap-3">
    <span className="font-medium text-gray-500">Remise</span>
    <div className="flex items-center gap-2">
      <div className="flex p-1 text-xs bg-gray-100 rounded-lg">
        {(['pourcentage', 'montant'] as const).map((t) => (
          <button
            type="button"
            key={t}
            onClick={() => setRemiseType(t)}
            className={`px-3 py-1.5 rounded-md font-semibold transition-colors ${
              remiseType === t ? 'bg-white shadow-sm text-gray-800' : 'text-gray-500'
            }`}
          >
            {t === 'pourcentage' ? '%' : 'DT'}
          </button>
        ))}
      </div>
      <input
        type="number"
        min="0"
        step="any"
        value={remiseValeur}
        onChange={(e) => setRemiseValeur(e.target.value)}
        placeholder="0"
        className={`${inputClass} w-28`}
      />
    </div>
  </div>

  {remiseProblem ? (
    <p className="text-xs text-right text-red-600">{remiseProblem}</p>
  ) : (
    rv > 0 && (
      <p className="text-sm font-medium text-right text-amber-700">− {remiseMontant.toFixed(2)}</p>
    )
  )}

  <div className="flex items-center justify-between pt-3 border-t border-gray-100">
    <span className="font-medium text-gray-500">Total à payer</span>
    <span className="text-2xl font-bold text-primary-700">{total.toFixed(2)}</span>
  </div>
</div>
        </div>

        {/* Note */}
        <div className="p-5 bg-white border border-gray-100 shadow-sm rounded-2xl">
          <label className="block text-xs font-medium text-gray-500 mb-1.5">Note (optionnel)</label>
          <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ex : livraison le lundi" className={inputClass} />
        </div>

        {error && (
          <p className="px-3 py-2 text-sm text-red-600 border border-red-100 rounded-lg bg-red-50">{error}</p>
        )}

        <button
          type="submit"
          disabled={!canSubmit || saving}
          className="w-full md:w-auto md:px-10 bg-primary-600 hover:bg-primary-700 active:scale-[0.99] transition-all text-white py-3 rounded-xl font-semibold text-sm shadow-sm shadow-primary-600/20 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? 'Validation...' : 'Valider la facture'}
        </button>
      </form>

      {/* Aperçu du PDF */}
      {invoice && pdfUrl && (
        <div className="fixed inset-0 z-[60] bg-black/60 p-3 sm:p-6 flex flex-col">
          <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 bg-white rounded-t-2xl">
            <div>
              <p className="font-semibold text-gray-900">Facture {invoice.numero}</p>
              <p className="text-xs text-green-600">Facture enregistrée, le stock a été mis à jour</p>
            </div>
            <div className="flex items-center gap-2">
             
              <a
                href={pdfUrl}
                target="_blank"
                rel="noreferrer"
                className="px-4 py-2 text-sm font-semibold text-gray-700 transition-colors bg-gray-100 rounded-xl hover:bg-gray-200"
              >
                Ouvrir
              </a>
              <Link
  to="/admin/factures"
  className="px-4 py-2 text-sm font-semibold text-gray-700 transition-colors bg-gray-100 rounded-xl hover:bg-gray-200"
>
  Voir les factures
</Link>
<button
  onClick={closePreview}
  className="px-4 py-2 text-sm font-semibold text-gray-700 transition-colors bg-gray-100 rounded-xl hover:bg-gray-200"
>
  Nouvelle facture
</button>
            </div>
          </div>
          <iframe title="Facture PDF" src={pdfUrl} className="flex-1 w-full bg-white rounded-b-2xl" />
        </div>
      )}
    </div>
  );
}