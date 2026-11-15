import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/axios';
import Modal from '../../components/Modal';
import InvoicePaymentModal from '../../components/InvoicePaymentModal';
import { Invoice } from '../../types/stock';
import { buildInvoicePdf } from '../../utils/invoicePdf';

const PAGE_SIZE = 8;

const inputClass =
  'w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 transition-shadow';

const norm = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();

const formatDate = (d: string) =>
  new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });

const STATUT = {
  payee: { label: 'Payée', cls: 'bg-green-50 text-green-600' },
  partielle: { label: 'Partiellement payée', cls: 'bg-amber-50 text-amber-700' },
  impayee: { label: 'Non payée', cls: 'bg-red-50 text-red-600' },
  annulee: { label: 'Annulée', cls: 'bg-gray-200 text-gray-600' },
} as const;

export default function CommercialInvoices() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [search, setSearch] = useState('');
  const [statut, setStatut] = useState('');
  const [page, setPage] = useState(1);

  const [preview, setPreview] = useState<{ invoice: Invoice; url: string } | null>(null);
  const [payFor, setPayFor] = useState<Invoice | null>(null);

  const [toCancel, setToCancel] = useState<Invoice | null>(null);
  const [motif, setMotif] = useState('');
  const [cancelError, setCancelError] = useState('');
  const [cancelling, setCancelling] = useState(false);

  function load() {
    return api
      .get('/invoices')
      .then((r) => setInvoices(r.data))
      .catch((err) => setError(err.response?.data?.message || 'Impossible de charger vos factures'))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    setPage(1);
  }, [search, statut]);

  const filtered = invoices.filter(
    (inv) =>
      (!search.trim() ||
        norm(inv.clientNom).includes(norm(search)) ||
        norm(inv.numero).includes(norm(search))) &&
      (!statut || (inv.statut ?? 'impayee') === statut)
  );

  const active = filtered.filter((i) => !i.annulee);
  const totalSales = active.reduce((s, i) => s + i.total, 0);
  const totalReste = active.reduce((s, i) => s + (i.reste ?? 0), 0);
  const hasFilters = search !== '' || statut !== '';

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const startIndex = (currentPage - 1) * PAGE_SIZE;
  const shown = filtered.slice(startIndex, startIndex + PAGE_SIZE);

  async function openPreview(invoice: Invoice) {
    const doc = await buildInvoicePdf(invoice);
    setPreview({ invoice, url: URL.createObjectURL(doc.output('blob')) });
  }

  function closePreview() {
    if (preview) URL.revokeObjectURL(preview.url);
    setPreview(null);
  }

  async function download(invoice: Invoice) {
    const doc = await buildInvoicePdf(invoice);
    doc.save(`${invoice.numero}.pdf`);
  }

  function handlePaid(id: string, info: Pick<Invoice, 'montantPaye' | 'reste' | 'statut'>) {
    setInvoices((list) => list.map((i) => (i._id === id ? { ...i, ...info } : i)));
  }

  async function handleCancel() {
    if (!toCancel) return;
    setCancelling(true);
    setCancelError('');
    try {
      await api.post(`/invoices/${toCancel._id}/annuler`, { motif: motif.trim() || undefined });
      setToCancel(null);
      setMotif('');
      load();
    } catch (err: any) {
      const msg = err.response?.data?.message;
      setCancelError(Array.isArray(msg) ? msg.join(', ') : msg || "Erreur lors de l'annulation");
    } finally {
      setCancelling(false);
    }
  }

  return (
    <div className="max-w-6xl px-4 py-8 mx-auto">
      <div className="flex flex-col justify-between gap-4 mb-6 md:flex-row md:items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Mes factures</h1>
          <p className="flex flex-wrap items-center gap-2 mt-2 text-sm text-gray-500">
            <span className="inline-flex bg-gray-100 text-gray-700 px-2.5 py-1 rounded-full font-medium">
              {invoices.length} facture{invoices.length !== 1 ? 's' : ''}
            </span>
            <span className="inline-flex bg-primary-50 text-primary-700 px-2.5 py-1 rounded-full font-semibold">
              Ventes{hasFilters ? ' (résultats)' : ''} : {totalSales.toFixed(2)}
            </span>
            <span className="inline-flex bg-red-50 text-red-600 px-2.5 py-1 rounded-full font-semibold">
              Reste à encaisser : {totalReste.toFixed(2)}
            </span>
          </p>
        </div>
        <Link
          to="/factures/nouvelle"
          className="inline-flex items-center justify-center gap-2 bg-primary-600 hover:bg-primary-700 active:scale-[0.98] transition-all text-white px-5 py-2.5 rounded-xl text-sm font-semibold shadow-sm shadow-primary-600/20"
        >
          Nouvelle facture
        </Link>
      </div>

      {error && (
        <p className="px-3 py-2 mb-4 text-sm text-red-600 border border-red-100 rounded-lg bg-red-50">{error}</p>
      )}

      <div className="grid grid-cols-1 gap-3 p-4 mb-4 bg-white border border-gray-100 shadow-sm rounded-2xl md:grid-cols-[1.5fr_1fr_auto] items-end">
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1.5">Client ou numéro</label>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Ex : Ahmed ou FAC-2026-0001"
            className={inputClass}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1.5">Statut</label>
          <select value={statut} onChange={(e) => setStatut(e.target.value)} className={inputClass}>
            <option value="">Tous les statuts</option>
            <option value="impayee">Non payée</option>
            <option value="partielle">Partiellement payée</option>
            <option value="payee">Payée</option>
            <option value="annulee">Annulée</option>
          </select>
        </div>
        {hasFilters && (
          <button
            onClick={() => { setSearch(''); setStatut(''); }}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-primary-700 bg-primary-50 border border-primary-200 hover:bg-primary-600 hover:text-white hover:border-primary-600 active:scale-[0.98] shadow-sm transition-all"
          >
            Réinitialiser
          </button>
        )}
      </div>

      <div className="overflow-hidden bg-white border border-gray-100 shadow-sm rounded-2xl">
        {loading ? (
          <p className="py-16 text-sm text-center text-gray-400">Chargement...</p>
        ) : shown.length === 0 ? (
          <p className="py-16 text-sm text-center text-gray-500">
            {invoices.length === 0 ? 'Aucune facture pour le moment.' : 'Aucune facture ne correspond à la recherche.'}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs tracking-wide text-left text-gray-500 uppercase bg-gray-50">
                <tr>
                  <th className="px-5 py-3.5 font-semibold">Numéro</th>
                  <th className="px-5 py-3.5 font-semibold">Client</th>
                  <th className="px-5 py-3.5 font-semibold">Date</th>
                  <th className="px-5 py-3.5 font-semibold text-right">Total</th>
                  <th className="px-5 py-3.5 font-semibold">Statut</th>
                  <th className="px-5 py-3.5"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {shown.map((inv) => {
                  const s = STATUT[inv.statut ?? 'impayee'];
                  return (
                    <tr key={inv._id} className={`transition-colors hover:bg-gray-50/80 ${inv.annulee ? 'bg-gray-50/60 text-gray-400' : ''}`}>
                      <td className="px-5 py-3.5 font-semibold text-primary-700 whitespace-nowrap">{inv.numero}</td>
                      <td className="px-5 py-3.5 font-medium text-gray-800">{inv.clientNom}</td>
                      <td className="px-5 py-3.5 text-gray-500 whitespace-nowrap">{formatDate(inv.date)}</td>
                      <td className="px-5 py-3.5 font-semibold text-right text-gray-800 whitespace-nowrap">
                        {inv.total.toFixed(2)}
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${s.cls}`}>
                          {s.label}
                        </span>
                        {inv.statut === 'partielle' && (
                          <p className="mt-1 text-xs text-gray-400 whitespace-nowrap">Reste : {(inv.reste ?? 0).toFixed(2)}</p>
                        )}
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => openPreview(inv)}
                            title="Voir la facture"
                            aria-label="Voir la facture"
                            className="flex items-center justify-center w-8 h-8 text-gray-400 transition-colors rounded-lg hover:text-primary-600 hover:bg-primary-50"
                          >
                            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => download(inv)}
                            title="Télécharger le PDF"
                            aria-label="Télécharger le PDF"
                            className="flex items-center justify-center w-8 h-8 text-gray-400 transition-colors rounded-lg hover:text-primary-600 hover:bg-primary-50"
                          >
                            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M12 4v12m0 0l-4-4m4 4l4-4" />
                            </svg>
                          </button>
                          {!inv.annulee && (
                            <>
                              {(inv.montantPaye ?? 0) === 0 && (
                                <button
                                  onClick={() => { setCancelError(''); setMotif(''); setToCancel(inv); }}
                                  title="Annuler la facture"
                                  aria-label="Annuler la facture"
                                  className="flex items-center justify-center w-8 h-8 text-gray-400 transition-colors rounded-lg hover:text-red-600 hover:bg-red-50"
                                >
                                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                                  </svg>
                                </button>
                              )}
                              <button
                                onClick={() => setPayFor(inv)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                                  inv.statut === 'payee'
                                    ? 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                    : 'bg-primary-600 text-white hover:bg-primary-700 shadow-sm'
                                }`}
                              >
                                {inv.statut === 'payee' ? 'Paiements' : 'Payer'}
                              </button>
                            </>
                          )}
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
          <div className="flex items-center justify-between gap-3 px-5 py-3.5 border-t border-gray-100 bg-gray-50/50">
            <p className="text-xs text-gray-500">
              {startIndex + 1}–{Math.min(startIndex + PAGE_SIZE, filtered.length)} sur {filtered.length} factures
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1.5 rounded-lg text-sm text-gray-600 hover:bg-white hover:shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Précédent
              </button>
              <span className="text-sm text-gray-500">{currentPage} / {totalPages}</span>
              <button
                onClick={() => setPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1.5 rounded-lg text-sm text-gray-600 hover:bg-white hover:shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Suivant
              </button>
            </div>
          </div>
        )}
      </div>

      {preview && (
        <div className="fixed inset-0 z-[60] bg-black/60 p-3 sm:p-6 flex flex-col">
          <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 bg-white rounded-t-2xl">
            <div>
              <p className="font-semibold text-gray-900">Facture {preview.invoice.numero}</p>
              <p className="text-xs text-gray-500">{preview.invoice.clientNom}</p>
            </div>
            <div className="flex items-center gap-2">
              <a
                href={preview.url}
                target="_blank"
                rel="noreferrer"
                className="px-4 py-2 text-sm font-semibold text-gray-700 transition-colors bg-gray-100 rounded-xl hover:bg-gray-200"
              >
                Ouvrir
              </a>
              <button
                onClick={closePreview}
                className="px-4 py-2 text-sm font-semibold text-gray-700 transition-colors bg-gray-100 rounded-xl hover:bg-gray-200"
              >
                Fermer
              </button>
            </div>
          </div>
          <iframe title="Facture PDF" src={preview.url} className="flex-1 w-full bg-white rounded-b-2xl" />
        </div>
      )}

      {payFor && (
        <InvoicePaymentModal invoice={payFor} onClose={() => setPayFor(null)} onPaid={handlePaid} />
      )}

      {toCancel && (
        <Modal title="Annuler cette facture ?" onClose={() => !cancelling && setToCancel(null)}>
          <p className="text-sm text-gray-600">
            Facture <strong>{toCancel.numero}</strong> de <strong>{toCancel.clientNom}</strong>.
          </p>
          <p className="px-3 py-2 mt-3 text-xs border rounded-lg text-amber-700 bg-amber-50 border-amber-100">
            Les quantités reviendront dans votre stock. La facture restera dans la liste avec le statut « Annulée ».
            Cette action est définitive.
          </p>
          <label className="block mt-4 mb-1.5 text-xs font-medium text-gray-500">Motif (optionnel)</label>
          <input
            value={motif}
            onChange={(e) => setMotif(e.target.value)}
            placeholder="Ex : erreur de saisie, retour client"
            className={inputClass}
          />
          {cancelError && (
            <p className="px-3 py-2 mt-4 text-sm text-red-600 border border-red-100 rounded-lg bg-red-50">{cancelError}</p>
          )}
          <div className="flex gap-3 mt-6">
            <button
              onClick={() => setToCancel(null)}
              disabled={cancelling}
              className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-2.5 rounded-xl font-semibold text-sm disabled:opacity-60"
            >
              Retour
            </button>
            <button
              onClick={handleCancel}
              disabled={cancelling}
              className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2.5 rounded-xl font-semibold text-sm disabled:opacity-60"
            >
              {cancelling ? 'Annulation...' : 'Annuler la facture'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}