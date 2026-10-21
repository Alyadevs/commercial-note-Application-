import { useEffect, useState, ReactElement } from 'react';
import api from '../api/axios';
import { Transaction } from '../types';

interface Props {
  clientId: string;
}

type TypeConfig = {
  label: string;
  color: string;
  bg: string;
  icon: ReactElement;
  sign: string;
};

const TYPE_CONFIG: Record<Transaction['type'], TypeConfig> = {
  credit: {
    label: 'Crédit',
    color: 'text-red-600',
    bg: 'bg-red-50',
    sign: '+',
    icon: (
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8l-8 8-8-8" />
      </svg>
    ),
  },
  paiement: {
    label: 'Paiement',
    color: 'text-green-600',
    bg: 'bg-green-50',
    sign: '−',
    icon: (
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 20V4m-8 8l8-8 8 8" />
      </svg>
    ),
  },
  remise: {
    label: 'Remise',
    color: 'text-blue-600',
    bg: 'bg-blue-50',
    sign: '−',
    icon: (
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M20 12H4" />
      </svg>
    ),
  },
};

export default function TransactionHistory({ clientId }: Props) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<'tous' | Transaction['type']>('tous');

  async function loadTransactions() {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get(`/clients/${clientId}/transactions`);
      setTransactions(data);
    } catch (err: any) {
  console.error('Transactions:', err.response?.status, err.response?.data);
  setError(err.response?.data?.message || "Impossible de charger l'historique des transactions");
} finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadTransactions();
  }, [clientId]);

  const filtered =
    filter === 'tous' ? transactions : transactions.filter((t) => t.type === filter);

  const sorted = [...filtered].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-base font-semibold text-gray-800">Historique des transactions</h2>

        <div className="flex items-center gap-1.5 bg-gray-100 p-1 rounded-lg text-xs">
          {(['tous', 'credit', 'paiement', 'remise'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
                filter === f
                  ? 'bg-white shadow-sm text-gray-800'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {f === 'tous' ? 'Tous' : TYPE_CONFIG[f].label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-14">
          <div className="w-5 h-5 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
          <span className="ml-3 text-gray-400 text-sm">Chargement...</span>
        </div>
      ) : error ? (
        <p className="text-red-600 text-sm px-5 py-6">{error}</p>
      ) : sorted.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-14">
          <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-3">
            <svg className="w-6 h-6 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <p className="text-gray-500 text-sm">Aucune transaction pour ce filtre</p>
        </div>
      ) : (
        <ul className="divide-y divide-gray-100">
          {sorted.map((t) => {
            const cfg = TYPE_CONFIG[t.type];
            return (
              <li key={t._id} className="flex items-center gap-3 px-5 py-3.5 hover:bg-gray-50/80 transition-colors">
                <span className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${cfg.bg} ${cfg.color}`}>
                  {cfg.icon}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-800">{cfg.label}</span>
                  </div>
                  {t.description && (
                    <p className="text-xs text-gray-500 truncate mt-0.5">{t.description}</p>
                  )}
                  <p className="text-xs text-gray-400 mt-0.5">{formatDate(t.date)}</p>
                </div>
                <span className={`text-sm font-semibold shrink-0 ${cfg.color}`}>
                  {cfg.sign} {t.montant.toFixed(2)}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}