import { ReactElement, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/axios';
import { Invoice } from '../../types/stock';
import { buildInvoicePdf } from '../../utils/invoicePdf';
import InvoicePaymentModal from '../../components/InvoicePaymentModal';

const PAGE_SIZE = 8;

const inputClass =
  'w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 transition-shadow';

// Minuscules, sans accents
const norm = (s: string) =>
  s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();

// Date locale au format AAAA-MM-JJ
const localDay = (d: string) => {
  const x = new Date(d);
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
};

const formatDate = (d: string) =>
  new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });

const STATUT = {
  payee: { label: 'Payée', cls: 'bg-green-50 text-green-600' },
  partielle: { label: 'Partiellement payée', cls: 'bg-amber-50 text-amber-700' },
  impayee: { label: 'Non payée', cls: 'bg-red-50 text-red-600' },
  annulee: { label: 'Annulée', cls: 'bg-gray-200 text-gray-600' },
} as const;

function StatutBadge({ inv }: { inv: Invoice }) {
  const s = STATUT[inv.statut ?? 'impayee'];
  return (
    <div title={inv.statut === 'annulee' ? inv.motifAnnulation || undefined : undefined}>
      <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${s.cls}`}>
        {s.label}
      </span>
      {inv.statut === 'partielle' && (
        <p className="mt-1 text-xs text-gray-400 whitespace-nowrap">Reste : {(inv.reste ?? 0).toFixed(2)}</p>
      )}
      {inv.statut === 'annulee' && inv.dateAnnulation && (
        <p className="mt-1 text-xs text-gray-400 whitespace-nowrap">le {formatDate(inv.dateAnnulation)}</p>
      )}
    </div>
  );
}



function StatCard({
  label,
  value,
  valueClass,
  iconBg,
  icon,
}: {
  label: string;
  value: string;
  valueClass: string;
  iconBg: string;
  icon: ReactElement;
}) {
  return (
    <div className="flex items-center gap-4 p-4 bg-white border border-gray-100 shadow-sm rounded-2xl">
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${iconBg}`}>{icon}</div>
      <div>
        <p className="text-sm text-gray-500">{label}</p>
        <p className={`text-xl font-bold ${valueClass}`}>{value}</p>
      </div>
    </div>
  );
}

export default function Invoices() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
const [searchTotal, setSearchTotal] = useState('');
const [searchStatut, setSearchStatut] = useState('');
  const [searchText, setSearchText] = useState('');
  const [searchDate, setSearchDate] = useState('');
  const [page, setPage] = useState(1);
const [payFor, setPayFor] = useState<Invoice | null>(null);
  const [preview, setPreview] = useState<{ invoice: Invoice; url: string } | null>(null);
const [toCancel, setToCancel] = useState<Invoice | null>(null);
const [cancelMotif, setCancelMotif] = useState('');
const [cancelError, setCancelError] = useState('');
const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    api
      .get('/invoices')
      .then((r) => setInvoices(r.data))
      .catch((err) => setError(err.response?.data?.message || 'Impossible de charger les factures'))
      .finally(() => setLoading(false));
  }, []);

  // Revient à la page 1 quand une recherche change
useEffect(() => {
  setPage(1);
}, [searchText, searchDate, searchTotal, searchStatut]);

 const filtered = invoices.filter((inv) => {
  const matchText =
    !searchText.trim() ||
    norm(inv.clientNom).includes(norm(searchText)) ||
    norm(inv.numero).includes(norm(searchText));

  const matchDate =
    !searchDate || localDay(inv.date) === searchDate;

  const matchTotal =
    searchTotal === '' ||
    inv.total.toString().includes(searchTotal.trim());

  const matchStatut =
    !searchStatut || (inv.statut ?? 'impayee') === searchStatut;

  return matchText && matchDate && matchTotal && matchStatut;
});
  

  const hasFilters =
  searchText !== '' || searchDate !== '' || searchTotal !== '' || searchStatut !== '';
const active = filtered.filter((inv) => !inv.annulee);
const totalFiltered = active.reduce((s, inv) => s + inv.total, 0);
const totalBenefice = active.reduce((s, inv) => s + (inv.benefice ?? 0), 0);
const marge = totalFiltered > 0 ? (totalBenefice / totalFiltered) * 100 : 0;

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
  function handlePaid(id: string, info: Pick<Invoice, 'montantPaye' | 'reste' | 'statut'>) {
  setInvoices((list) => list.map((i) => (i._id === id ? { ...i, ...info } : i)));
}
function loadInvoices() {
  return api
    .get('/invoices')
    .then((r) => setInvoices(r.data))
    .catch((err) => setError(err.response?.data?.message || 'Impossible de charger les factures'))
    .finally(() => setLoading(false));
}

useEffect(() => {
  loadInvoices();
}, []);

async function handleCancel() {
  if (!toCancel) return;
  setCancelling(true);
  setCancelError('');
  try {
    await api.post(`/invoices/${toCancel._id}/annuler`, { motif: cancelMotif.trim() || undefined });
    setToCancel(null);
    setCancelMotif('');
    loadInvoices();
  } catch (err: any) {
    const msg = err.response?.data?.message;
    setCancelError(Array.isArray(msg) ? msg.join(', ') : msg || "Erreur lors de l'annulation");
  } finally {
    setCancelling(false);
  }
}

  function openPreview(invoice: Invoice) {
    const url = URL.createObjectURL(buildInvoicePdf(invoice).output('blob'));
    setPreview({ invoice, url });
  }

  function closePreview() {
    if (preview) URL.revokeObjectURL(preview.url);
    setPreview(null);
  }

  function download(invoice: Invoice) {
    buildInvoicePdf(invoice).save(`${invoice.numero}.pdf`);
  }

  return (
    <div className="max-w-6xl px-4 py-8 mx-auto">
      {/* En-tête */}
      <div className="flex flex-col justify-between gap-4 mb-6 md:flex-row md:items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Factures</h1>
          
        </div>
        <Link
          to="/admin/factures/nouvelle"
          className="inline-flex items-center justify-center gap-2 bg-primary-600 hover:bg-primary-700 active:scale-[0.98] transition-all text-white px-5 py-2.5 rounded-xl text-sm font-semibold shadow-sm shadow-primary-600/20"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Nouvelle facture
        </Link>
      </div>
       <div className="grid grid-cols-1 gap-4 mb-6 md:grid-cols-3">
  <StatCard
    label={`Total des ventes${hasFilters ? ' (résultats)' : ''}`}
    value={totalFiltered.toFixed(2)}
    valueClass="text-gray-900"
    iconBg="bg-blue-50 text-blue-600"
    icon={
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    }
  />
  <StatCard
    label={`Bénéfice total${hasFilters ? ' (résultats)' : ''}`}
    value={totalBenefice.toFixed(2)}
    valueClass={totalBenefice >= 0 ? 'text-green-600' : 'text-red-600'}
    iconBg={totalBenefice >= 0 ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}
    icon={
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
      </svg>
    }
  />
  <StatCard
    label="Marge moyenne"
    value={`${marge.toFixed(1)} %`}
    valueClass="text-primary-700"
    iconBg="bg-violet-50 text-violet-600"
    icon={
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z" />
      </svg>
    }
  />
</div>
      {error && (
        <p className="px-3 py-2 mb-4 text-sm text-red-600 border border-red-100 rounded-lg bg-red-50">{error}</p>
      )}

      {/* Recherche et filtres */}
<div className="p-4 mb-4 bg-white border border-gray-100 shadow-sm rounded-2xl">
  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">

    {/* Client ou numéro */}
    <div>
      <label className="block text-xs font-medium text-gray-500 mb-1.5">
        Client ou numéro
      </label>
      <input
        value={searchText}
        onChange={(e) => setSearchText(e.target.value)}
        placeholder="Nom ou numéro facture"
        className={inputClass}
      />
    </div>

    {/* Date */}
    <div>
      <label className="block text-xs font-medium text-gray-500 mb-1.5">
        Date
      </label>
      <input
        type="date"
        value={searchDate}
        onChange={(e) => setSearchDate(e.target.value)}
        className={inputClass}
      />
    </div>

    {/* Total */}
    <div>
      <label className="block text-xs font-medium text-gray-500 mb-1.5">
        Recherche par total
      </label>
      <input
        type="number"
        min="0"
        step="0.01"
        value={searchTotal}
        onChange={(e) => setSearchTotal(e.target.value)}
        placeholder="Ex : 150"
        className={inputClass}
      />
    </div>

    {/* Statut */}
    <div>
      <label className="block text-xs font-medium text-gray-500 mb-1.5">
        Statut de paiement
      </label>
      <select
        value={searchStatut}
        onChange={(e) => setSearchStatut(e.target.value)}
        className={inputClass}
      >
        <option value="">Tous les statuts</option>
        <option value="payee">Payée</option>
        <option value="partielle">Partiellement payée</option>
        <option value="impayee">Non payée</option>
        <option value="annulee">Annulée</option>
      </select>
    </div>

  </div>

  {/* Résultats et réinitialisation */}
  <div className="flex flex-wrap items-center justify-between gap-3 mt-4">
    <p className="text-xs text-gray-500">
      {filtered.length} facture(s) trouvée(s)
    </p>

    {(searchText || searchDate || searchTotal || searchStatut) && (
      <button
        onClick={() => {
          setSearchText('');
          setSearchDate('');
          setSearchTotal('');
          setSearchStatut('');
        }}
        className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold transition-all border rounded-xl text-primary-700 bg-primary-50 border-primary-200 hover:bg-primary-600 hover:text-white"
      >
        Réinitialiser 
      </button>
    )}
  </div>
</div>

      {/* Tableau */}
      <div className="overflow-hidden bg-white border border-gray-100 shadow-sm rounded-2xl">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-6 h-6 border-2 rounded-full border-primary-600 border-t-transparent animate-spin" />
            <span className="ml-3 text-sm text-gray-400">Chargement...</span>
          </div>
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
                  <th className="px-5 py-3.5 font-semibold">Vendu par</th>
                  <th className="px-5 py-3.5 font-semibold">Date</th>
                  <th className="px-5 py-3.5 font-semibold text-right">Articles</th>
                  <th className="px-5 py-3.5 font-semibold text-right">Total</th>
                  <th className="px-5 py-3.5 font-semibold text-right">Bénéfice</th>
                  <th className="px-5 py-3.5 font-semibold">Statut</th>
                  <th className="px-5 py-3.5"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {shown.map((inv) => (
                  <tr key={inv._id} className="transition-colors hover:bg-gray-50/80">
                    <td className="px-5 py-3.5 font-semibold text-primary-700 whitespace-nowrap">{inv.numero}</td>
                    <td className="px-5 py-3.5 font-medium text-gray-800">{inv.clientNom}</td>
                    <td className="px-5 py-3.5 text-gray-500">
  {inv.commercialNom || <span className="text-xs text-gray-400">Stock principal</span>}
</td>
                    <td className="px-5 py-3.5 text-gray-500 whitespace-nowrap">{formatDate(inv.date)}</td>
                    <td className="px-5 py-3.5 text-right">
                      <span className="inline-flex items-center justify-center min-w-[1.75rem] px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 text-xs font-semibold">
                        {inv.lignes.length}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right font-semibold text-gray-800 whitespace-nowrap">
                      {inv.total.toFixed(2)}
                    </td>
                    <td className="px-5 py-3.5 text-right font-semibold whitespace-nowrap">
  <span
    className={(inv.benefice ?? 0) >= 0 ? 'text-orange-600' : 'text-red-600'}
    title={inv.beneficeEstime ? "Estimé avec le prix d'achat actuel (facture antérieure au suivi du bénéfice)" : undefined}
  >
    {inv.beneficeEstime ? '~ ' : ''}
    {(inv.benefice ?? 0) >= 0 ? '' : ''}
    {(inv.benefice ?? 0).toFixed(2)}
  </span>
</td>
<td className="px-5 py-3.5">
  <StatutBadge inv={inv} />
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
                        {/* Modifier */}


{!inv.annulee && (
  <>
    {/* {(inv.montantPaye ?? 0) === 0 && (
      <Link
        to={`/admin/factures/${inv._id}/modifier`}
        title="Modifier la facture"
        aria-label="Modifier la facture"
        className="flex items-center justify-center w-8 h-8 text-gray-400 transition-colors rounded-lg hover:text-blue-600 hover:bg-blue-50"
      >
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 20h9" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 3.5a2.12 2.12 0 013 3L8 18l-4 1 1-4Z" />
        </svg>
      </Link>
    )} */}

    {(inv.montantPaye ?? 0) === 0 && (
      <button
        type="button"
        onClick={() => { setCancelError(''); setCancelMotif(''); setToCancel(inv); }}
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
                ))}

              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-5 py-3.5 border-t border-gray-100 bg-gray-50/50">
            <p className="text-xs text-gray-500">
              {startIndex + 1}–{Math.min(startIndex + PAGE_SIZE, filtered.length)} sur {filtered.length} factures
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="flex items-center justify-center w-8 h-8 text-gray-600 transition rounded-lg hover:bg-white hover:shadow-sm disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:shadow-none disabled:cursor-not-allowed"
                aria-label="Page précédente"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
              </button>

              {getPageNumbers().map((p, i) =>
                p === '...' ? (
                  <span key={`dots-${i}`} className="flex items-center justify-center w-8 h-8 text-sm text-gray-400">
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
                className="flex items-center justify-center w-8 h-8 text-gray-600 transition rounded-lg hover:bg-white hover:shadow-sm disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:shadow-none disabled:cursor-not-allowed"
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

      {/* Aperçu du PDF */}
      {preview && (
        <div className="fixed inset-0 z-[60] bg-black/60 p-3 sm:p-6 flex flex-col">
          <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 bg-white rounded-t-2xl">
            <div>
              <p className="font-semibold text-gray-900">NumeroFacture {preview.invoice.numero}</p>
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
  <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/50">
    <div className="w-full max-w-md p-6 bg-white shadow-xl rounded-2xl">
      <h2 className="text-lg font-bold text-gray-900">Annuler la facture</h2>
      <p className="mt-2 text-sm text-gray-600">
        Voulez-vous vraiment annuler la facture <strong>{toCancel.numero}</strong> de{' '}
        <strong>{toCancel.clientNom}</strong> ?
      </p>
      <p className="px-3 py-2 mt-3 text-xs border rounded-lg text-amber-700 bg-amber-50 border-amber-100">
        Les quantités des produits seront remises en stock. La facture restera dans la liste avec le statut
        « Annulée » et ne comptera plus dans les totaux. Cette action est définitive.
      </p>

      <label className="block mt-4 mb-1.5 text-xs font-medium text-gray-500">Motif (optionnel)</label>
      <input
        value={cancelMotif}
        onChange={(e) => setCancelMotif(e.target.value)}
        placeholder="Ex : erreur de saisie, retour client"
        className={inputClass}
      />

      {cancelError && (
        <p className="p-3 mt-4 text-sm text-red-600 rounded-lg bg-red-50">{cancelError}</p>
      )}

      <div className="flex justify-end gap-3 mt-6">
        <button
          type="button"
          onClick={() => setToCancel(null)}
          disabled={cancelling}
          className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200 disabled:opacity-60"
        >
          Retour
        </button>
        <button
          type="button"
          onClick={handleCancel}
          disabled={cancelling}
          className="px-4 py-2 text-sm font-semibold text-white bg-red-600 rounded-xl hover:bg-red-700 disabled:opacity-60"
        >
          {cancelling ? 'Annulation...' : "Annuler la facture"}
        </button>
      </div>
    </div>
  </div>
)}
    </div>
    
  );
  
}

function load() {
  throw new Error('Function not implemented.');
}
