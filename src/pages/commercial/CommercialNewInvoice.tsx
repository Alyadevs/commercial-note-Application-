import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/axios';
import { Client } from '../../types';
import { Invoice, MyStockItem } from '../../types/stock';
import { buildInvoicePdf } from '../../utils/invoicePdf';

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

export default function CommercialNewInvoice() {
  const [stock, setStock] = useState<MyStockItem[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [clientId, setClientId] = useState('');
  const [date, setDate] = useState(today());
  const [note, setNote] = useState('');
  const [lines, setLines] = useState<Line[]>([emptyLine()]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [pdfUrl, setPdfUrl] = useState('');

  async function loadStock() {
    const { data } = await api.get('/my-stock');
    setStock(data);
  }

  useEffect(() => {
    loadStock().catch(() => setError('Impossible de charger votre stock'));
    api.get('/clients').then((r) => setClients(r.data)).catch(() => setError('Impossible de charger vos clients'));
  }, []);

  const stockById = useMemo(() => new Map(stock.map((s) => [s.produit, s])), [stock]);

  function updateLine(i: number, patch: Partial<Line>) {
    setLines((ls) => ls.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));
  }

  const unitPrice = (l: Line) => stockById.get(l.produit)?.prixVente ?? 0;
  const lineTotal = (l: Line) => (parseFloat(l.quantite) || 0) * unitPrice(l);
  const total = lines.reduce((s, l) => s + lineTotal(l), 0);

  function lineProblem(l: Line): string {
    if (!l.produit) return '';
    const q = parseFloat(l.quantite);
    if (!q || q <= 0) return 'Quantité invalide';
    const s = stockById.get(l.produit);
    if (s && q > s.quantite) return `Votre stock : ${s.quantite}`;
    return '';
  }

  const filledLines = lines.filter((l) => l.produit);
  const canSubmit = clientId !== '' && filledLines.length > 0 && filledLines.every((l) => !lineProblem(l));

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const client = clients.find((c) => c._id === clientId);
      const { data } = await api.post('/invoices', {
        client: clientId,
        clientNom: client?.nom ?? '',
        date,
        note: note.trim() || undefined,
        lignes: filledLines.map((l) => ({ produit: l.produit, quantite: parseFloat(l.quantite) })),
      });
      const doc = await buildInvoicePdf(data); // fonctionne que la fonction soit synchrone ou asynchrone
      setInvoice(data);
      setPdfUrl(URL.createObjectURL(doc.output('blob')));
      loadStock(); // stock à jour
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
    setClientId('');
    setNote('');
    setLines([emptyLine()]);
    setDate(today());
  }

  return (
    <div className="max-w-4xl px-4 py-8 mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">Nouvelle facture</h1>
        <p className="mt-1 text-sm text-gray-500">Les produits sont pris dans votre stock</p>
      </div>

      {clients.length === 0 && !error && (
        <p className="px-4 py-3 mb-5 text-sm border rounded-xl text-amber-700 bg-amber-50 border-amber-100">
          Vous n'avez aucun client. Ajoutez-en un dans <Link to="/" className="font-semibold underline">Mes clients</Link>.
        </p>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="grid grid-cols-1 gap-4 p-5 bg-white border border-gray-100 shadow-sm rounded-2xl md:grid-cols-2">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">Client *</label>
            <select required value={clientId} onChange={(e) => setClientId(e.target.value)} className={inputClass}>
              <option value="">Choisir un client...</option>
              {clients.map((c) => (
                <option key={c._id} value={c._id}>{c.nom}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">Date *</label>
            <input required type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputClass} />
          </div>
        </div>

        <div className="p-5 bg-white border border-gray-100 shadow-sm rounded-2xl">
          <h2 className="mb-4 text-base font-semibold text-gray-800">Produits</h2>

          <div className="hidden md:grid grid-cols-[1fr_100px_110px_110px_36px] gap-3 text-xs font-medium text-gray-500 mb-2 px-1">
            <span>Produit</span>
            <span>Quantité</span>
            <span className="text-right">Prix</span>
            <span className="text-right">Total</span>
            <span />
          </div>

          <div className="space-y-3">
            {lines.map((l, i) => {
              const problem = lineProblem(l);
              const taken = new Set(lines.filter((_, idx) => idx !== i).map((x) => x.produit));
              return (
                <div key={i}>
                  <div className="grid grid-cols-1 md:grid-cols-[1fr_100px_110px_110px_36px] gap-3 items-center">
                    <select value={l.produit} onChange={(e) => updateLine(i, { produit: e.target.value })} className={inputClass}>
                      <option value="">Choisir un produit...</option>
                      {stock
                        .filter((s) => !taken.has(s.produit))
                        .map((s) => (
                          <option key={s.produit} value={s.produit}>
                            {s.nom} — stock : {s.quantite}
                          </option>
                        ))}
                    </select>
                    <input
                      type="number" min="0" step="any" placeholder="Qté"
                      value={l.quantite}
                      onChange={(e) => updateLine(i, { quantite: e.target.value })}
                      className={inputClass}
                    />
                    <p className="px-1 text-gray-600 md:text-right">{l.produit ? unitPrice(l).toFixed(2) : '—'}</p>
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

          {stock.length === 0 ? (
            <p className="mt-4 text-sm text-amber-700">
              Votre stock est vide : l'administrateur doit d'abord vous transférer des produits.
            </p>
          ) : (
            <button
              type="button"
              onClick={() => setLines((ls) => [...ls, emptyLine()])}
              className="inline-flex items-center gap-2 px-4 py-2 mt-4 text-sm font-semibold transition-all border text-primary-700 bg-primary-50 border-primary-200 rounded-xl hover:bg-primary-600 hover:text-white hover:border-primary-600"
            >
              Ajouter un produit
            </button>
          )}

          <div className="flex items-center justify-between pt-4 mt-6 border-t border-gray-100">
            <span className="font-medium text-gray-500">Total</span>
            <span className="text-2xl font-bold text-primary-700">{total.toFixed(2)}</span>
          </div>
        </div>

        <div className="p-5 bg-white border border-gray-100 shadow-sm rounded-2xl">
          <label className="block text-xs font-medium text-gray-500 mb-1.5">Note (optionnel)</label>
          <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ex : livraison demain" className={inputClass} />
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

      {invoice && pdfUrl && (
        <div className="fixed inset-0 z-[60] bg-black/60 p-3 sm:p-6 flex flex-col">
          <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 bg-white rounded-t-2xl">
            <div>
              <p className="font-semibold text-gray-900">Facture {invoice.numero}</p>
              <p className="text-xs text-green-600">Facture enregistrée, votre stock a été mis à jour</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <a
                href={pdfUrl}
                download={`${invoice.numero}.pdf`}
                className="px-4 py-2 text-sm font-semibold text-white transition-colors bg-primary-600 hover:bg-primary-700 rounded-xl"
              >
                Télécharger
              </a>
              <Link
                to="/factures"
                className="px-4 py-2 text-sm font-semibold text-gray-700 transition-colors bg-gray-100 rounded-xl hover:bg-gray-200"
              >
                Mes factures
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