import { ReactElement, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import api from '../api/axios';
import { UserInfo } from '../types';

interface Row {
  _id: string;
  type: 'credit' | 'paiement' | 'remise';
  montant: number;
  description?: string;
  date: string;
  clientId: string;
  clientNom: string;
}

const TYPES = {
  credit: { label: 'Crédit', sign: '+', badge: 'bg-red-50 text-red-600' },
  paiement: { label: 'Paiement', sign: '−', badge: 'bg-green-50 text-green-600' },
  remise: { label: 'Remise', sign: '−', badge: 'bg-blue-50 text-blue-600' },
} as const;

const PAGE_SIZE = 10;

export default function CommercialTransactions() {
  const { id = '' } = useParams();
  const [commercial, setCommercial] = useState<UserInfo | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<'tous' | Row['type']>('tous');
 // const [visible, setVisible] = useState(PAGE_SIZE);
 const [page, setPage] = useState(1);
const [searchClient, setSearchClient] = useState('');
const [searchDate, setSearchDate] = useState(''); // format AAAA-MM-JJ
  useEffect(() => {
    async function load() {
      try {
        const [t, c] = await Promise.all([
          api.get(`/admin/commerciaux/${id}/transactions`),
          api.get('/users/commerciaux'),
        ]);
        setRows(t.data);
        setCommercial(c.data.find((u: UserInfo) => u._id === id) || null);
      } catch (err: any) {
        setError(err.response?.data?.message || 'Impossible de charger les transactions');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  const sum = (type: Row['type']) =>
    rows.filter((r) => r.type === type).reduce((s, r) => s + r.montant, 0);

 // Minuscules, sans accents
const norm = (s: string) =>
  s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();

// Date locale au format AAAA-MM-JJ (évite les décalages de fuseau horaire)
const localDay = (d: string) => {
  const x = new Date(d);
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
};

const filtered = rows.filter(
  (r) =>
    (filter === 'tous' || r.type === filter) &&
    (!searchClient.trim() || norm(r.clientNom).includes(norm(searchClient))) &&
    (!searchDate || localDay(r.date) === searchDate)
);

const hasFilters = searchClient !== '' || searchDate !== '';
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

  function formatDate(d: string) {
    return new Date(d).toLocaleDateString('fr-FR', {
      day: '2-digit', month: 'short', year: 'numeric',
    });
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-6 h-6 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
        <span className="ml-3 text-gray-400 text-sm">Chargement...</span>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <Link to="/" className="inline-flex items-center gap-1.5 text-gray-500 hover:text-gray-700 text-sm mb-6">
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
        Retour au tableau de bord
      </Link>

      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 tracking-tight">
          Transactions{commercial ? ` de ${commercial.nom}` : ''}
        </h1>
        <p className="text-gray-500 text-sm mt-1">Crédits, paiements et remises de ses clients</p>
      </div>

      {error && (
        <p className="text-red-600 text-sm bg-red-50 border border-red-100 rounded-lg px-3 py-2 mb-4">{error}</p>
      )}

     <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
  <SummaryCard
    label="Total crédits"
    value={sum('credit')}
    color="text-red-600"
    tone="red"
    icon={
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8l-8 8-8-8" />
      </svg>
    }
  />
  <SummaryCard
    label="Total paiements"
    value={sum('paiement')}
    color="text-green-600"
    tone="green"
    icon={
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 20V4m-8 8l8-8 8 8" />
      </svg>
    }
  />
  <SummaryCard
    label="Total remises"
    value={sum('remise')}
    color="text-blue-600"
    tone="blue"
    icon={
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21l-7-3-7 3V5a2 2 0 012-2h10a2 2 0 012 2v16z" />
      </svg>
    }
  />
</div>
<div className=" border-gray-100 p-4 mb-4 grid grid-cols-1 md:grid-cols-[1fr_1fr_auto] gap-3 items-end">
  {/* Recherche par nom de client */}
  <div>
    <label className="block text-m font-medium text-gray-500 mb-1.5">Client</label>
    <div className="relative">
      <svg
        className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
        viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 10.5a6.5 6.5 0 11-13 0 6.5 6.5 0 0113 0z" />
      </svg>
      <input
        value={searchClient}
        onChange={(e) => { setSearchClient(e.target.value); setPage(PAGE_SIZE); }}
        placeholder="Nom du client"
        className="w-full border border-gray-200 rounded-xl pl-10 pr-9 py-2.5 text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 transition-shadow"
      />
      {searchClient && (
        <button
          onClick={() => { setSearchClient(''); setPage(PAGE_SIZE); }}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100"
          aria-label="Effacer le nom"
        >
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  </div>

  {/* Recherche par date (calendrier) */}
  <div>
    <label className="block text-m font-medium text-gray-500 mb-1.5">Date</label>
    <input
      type="date"
      value={searchDate}
      onChange={(e) => { setSearchDate(e.target.value); setPage(PAGE_SIZE); }}
      className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 transition-shadow"
    />
  </div>

  {/* Réinitialiser */}
 {hasFilters && (
  <button
    onClick={() => { setSearchClient(''); setSearchDate(''); setPage(PAGE_SIZE); }}
    className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-primary-700 bg-primary-50 border border-primary-200 hover:bg-primary-600 hover:text-white hover:border-primary-600 active:scale-[0.98] shadow-sm transition-all"
  >
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h5M20 20v-5h-5M5.6 15A8 8 0 0018.4 9M18.4 9L15 9m-9.4 6L9 15" />
    </svg>
    Réinitialiser
  </button>
)}
</div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between flex-wrap gap-3">
          <h2 className="text-base font-semibold text-gray-800">
            {filtered.length} transaction{filtered.length !== 1 ? 's' : ''}
          </h2>
          <div className="flex items-center gap-1.5 bg-gray-100 p-1 rounded-lg text-xs">
            {(['tous', 'credit', 'paiement', 'remise'] as const).map((f) => (
              <button
                key={f}
                onClick={() => { setFilter(f); setPage(PAGE_SIZE); }}
                className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
                  filter === f ? 'bg-white shadow-sm text-gray-800' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {f === 'tous' ? 'Tous' : TYPES[f].label}
              </button>
            ))}
          </div>
        </div>

        {shown.length === 0 ? (
          <p className="text-gray-500 text-sm text-center py-14">Aucune transaction pour ce filtre.</p>
        ) : (
          <div>
            
          <div className="overflow-x-auto">
            
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 text-left text-xs uppercase tracking-wide">
                <tr>
                  <th className="px-5 py-3.5 font-semibold">Date</th>
                  <th className="px-5 py-3.5 font-semibold">Client</th>
                  <th className="px-5 py-3.5 font-semibold">Type</th>
                  <th className="px-5 py-3.5 font-semibold">Description</th>
                  <th className="px-5 py-3.5 font-semibold text-right">Montant</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {shown.map((r) => {
                  const cfg = TYPES[r.type];
                  return (
                    <tr key={`${r.type}-${r._id}`} className="hover:bg-gray-50/80 transition-colors">
                      <td className="px-5 py-3.5 text-gray-500 whitespace-nowrap">{formatDate(r.date)}</td>
                      <td className="px-5 py-3.5">
                        <Link to={`/clients/${r.clientId}`} className="font-medium text-gray-800 hover:text-primary-600">
                          {r.clientNom}
                        </Link>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${cfg.badge}`}>
                          {cfg.label}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-gray-500">{r.description || '—'}</td>
                      <td className="px-5 py-3.5 text-right font-semibold text-gray-800 whitespace-nowrap">
                        {cfg.sign} {r.montant.toFixed(2)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          </div>
        )}

     {totalPages > 1 && (
  <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-5 py-3.5 border-t border-gray-100 bg-gray-50/50">
    <p className="text-xs text-gray-500">
      {startIndex + 1}–{Math.min(startIndex + PAGE_SIZE, filtered.length)} sur {filtered.length} transactions
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
              p === currentPage
                ? 'bg-primary-600 text-white shadow-sm'
                : 'text-gray-600 hover:bg-white hover:shadow-sm'
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
    </div>
  );
}

type Tone = 'red' | 'green' | 'blue';

const TONES: Record<Tone, { bg: string; text: string }> = {
  red: { bg: 'bg-red-50', text: 'text-red-600' },
  green: { bg: 'bg-green-50', text: 'text-green-600' },
  blue: { bg: 'bg-blue-50', text: 'text-blue-600' },
};

function SummaryCard({
  label,
  value,
  color,
  icon,
  tone,
}: {
  label: string;
  value: number;
  color: string;
  icon: ReactElement;
  tone: Tone;
}) {
  const t = TONES[tone];
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 flex items-center justify-between gap-4 hover:shadow-md transition-shadow">
      <div>
        <p className="text-gray-500 text-sm">{label}</p>
        <p className={`text-3xl font-bold mt-1 tracking-tight ${color}`}>{value.toFixed(2)}</p>
      </div>
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${t.bg} ${t.text}`}>
        {icon}
      </div>
    </div>
  );
}