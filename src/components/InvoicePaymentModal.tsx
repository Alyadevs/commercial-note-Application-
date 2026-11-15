import { FormEvent, useEffect, useState } from 'react';
import api from '../api/axios';
import Modal from './Modal';
import { Invoice, InvoicePayment } from '../types/stock';

const MODES = {
  especes: 'Espèces',
  cheque: 'Chèque',
  virement: 'Virement',
  autre: 'Autre',
} as const;
type Mode = keyof typeof MODES;

const inputClass =
  'w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 transition-shadow';

const round2 = (n: number) => Math.round(n * 100) / 100;

const todayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const formatDate = (d: string) =>
  new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });

interface Props {
  invoice: Invoice;
  onClose: () => void;
  onPaid: (id: string, info: Pick<Invoice, 'montantPaye' | 'reste' | 'statut'>) => void;
}

export default function InvoicePaymentModal({ invoice, onClose, onPaid }: Props) {
  const [paid, setPaid] = useState(round2(invoice.montantPaye ?? 0));
  const [payments, setPayments] = useState<InvoicePayment[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [historyError, setHistoryError] = useState('');

  const [montant, setMontant] = useState('');
  const [mode, setMode] = useState<Mode>('especes');
  const [date, setDate] = useState(todayStr());
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const reste = Math.max(0, round2(invoice.total - paid));
  const percent = invoice.total > 0 ? Math.min(100, (paid / invoice.total) * 100) : 100;

  // Pré-remplit le montant avec le reste à payer
  useEffect(() => {
    setMontant(reste > 0 ? reste.toFixed(2) : '');
  }, [reste]);

  useEffect(() => {
    api
      .get(`/invoices/${invoice._id}/payments`)
      .then((r) => setPayments(r.data))
      .catch((err) =>
        setHistoryError(err.response?.data?.message || "Impossible de charger l'historique des paiements")
      )
      .finally(() => setLoadingHistory(false));
  }, [invoice._id]);

  async function handlePay(e: FormEvent) {
    e.preventDefault();
    setError('');
    const m = parseFloat(montant);
    if (!m || m <= 0) return setError('Entrez un montant supérieur à 0');
    if (round2(m) > reste) return setError(`Le montant dépasse le reste à payer (${reste.toFixed(2)})`);

    setSaving(true);
    try {
      const { data } = await api.post(`/invoices/${invoice._id}/payments`, {
        montant: m,
        mode,
        date,
        note: note.trim() || undefined,
      });
      setPaid(data.montantPaye);
      setPayments((p) => [data.paiement, ...p]);
      setNote('');
      onPaid(invoice._id, { montantPaye: data.montantPaye, reste: data.reste, statut: data.statut });
    } catch (err: any) {
      const msg = err.response?.data?.message;
      setError(Array.isArray(msg) ? msg.join(', ') : msg || "Erreur lors de l'enregistrement du paiement");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title={`Paiement : ${invoice.numero}`} onClose={() => !saving && onClose()} wide>
      <p className="mb-4 -mt-2 text-sm text-gray-500">{invoice.clientNom}</p>

      {/* Résumé */}
      <div className="grid grid-cols-3 gap-3 mb-3">
        <div className="p-3 bg-gray-50 rounded-xl">
          <p className="text-xs text-gray-500">Total</p>
          <p className="text-lg font-bold text-gray-900">{invoice.total.toFixed(2)}</p>
        </div>
        <div className="p-3 bg-green-50 rounded-xl">
          <p className="text-xs text-green-700">Déjà payé</p>
          <p className="text-lg font-bold text-green-600">{paid.toFixed(2)}</p>
        </div>
        <div className={`rounded-xl p-3 ${reste > 0 ? 'bg-red-50' : 'bg-gray-50'}`}>
          <p className={`text-xs ${reste > 0 ? 'text-red-700' : 'text-gray-500'}`}>Reste à payer</p>
          <p className={`text-lg font-bold ${reste > 0 ? 'text-red-600' : 'text-gray-400'}`}>{reste.toFixed(2)}</p>
        </div>
      </div>

      <div className="h-2 mb-6 overflow-hidden bg-gray-100 rounded-full">
        <div
          className={`h-full rounded-full transition-all ${reste <= 0 ? 'bg-green-500' : 'bg-primary-500'}`}
          style={{ width: `${percent}%` }}
        />
      </div>

      {/* Formulaire de paiement */}
      {reste > 0 ? (
        <form onSubmit={handlePay} className="grid grid-cols-1 gap-4 mb-6 sm:grid-cols-2">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-medium text-gray-500">Montant à payer *</label>
              <button
                type="button"
                onClick={() => setMontant(reste.toFixed(2))}
                className="text-xs font-semibold text-primary-600 hover:text-primary-700"
              >
                Tout le reste
              </button>
            </div>
            <input
              required
              type="number"
              min="0.01"
              step="0.01"
              value={montant}
              onChange={(e) => setMontant(e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">Mode de paiement</label>
            <select value={mode} onChange={(e) => setMode(e.target.value as Mode)} className={inputClass}>
              {(Object.keys(MODES) as Mode[]).map((m) => (
                <option key={m} value={m}>{MODES[m]}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">Date</label>
            <input type="date" required value={date} onChange={(e) => setDate(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">Note (optionnel)</label>
            <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ex : acompte" className={inputClass} />
          </div>

          {error && (
            <p className="px-3 py-2 text-sm text-red-600 border border-red-100 rounded-lg sm:col-span-2 bg-red-50">
              {error}
            </p>
          )}

          <button
            disabled={saving}
            className="sm:col-span-2 bg-primary-600 hover:bg-primary-700 text-white py-2.5 rounded-xl font-semibold text-sm transition-colors disabled:opacity-60"
          >
            {saving ? 'Enregistrement...' : 'Enregistrer le paiement'}
          </button>
        </form>
      ) : (
        <p className="px-3 py-2 mb-6 text-sm font-medium text-green-700 border border-green-100 rounded-lg bg-green-50">
          Cette facture est entièrement payée.
        </p>
      )}

      {/* Historique des paiements */}
      <h4 className="mb-2 text-sm font-semibold text-gray-800">Historique des paiements</h4>
      {loadingHistory ? (
        <p className="py-4 text-sm text-center text-gray-400">Chargement...</p>
      ) : historyError ? (
        <p className="px-3 py-2 text-sm text-red-600 border border-red-100 rounded-lg bg-red-50">{historyError}</p>
      ) : payments.length === 0 ? (
        <p className="py-4 text-sm text-center text-gray-500 bg-gray-50 rounded-xl">Aucun paiement enregistré.</p>
      ) : (
        <div className="overflow-hidden border border-gray-100 rounded-xl">
          <table className="w-full text-sm">
            <thead className="text-xs tracking-wide text-left text-gray-500 uppercase bg-gray-50">
              <tr>
                <th className="px-4 py-2.5 font-semibold">Date</th>
                <th className="px-4 py-2.5 font-semibold">Mode</th>
                <th className="px-4 py-2.5 font-semibold">Note</th>
                <th className="px-4 py-2.5 font-semibold text-right">Montant</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {payments.map((p) => (
                <tr key={p._id}>
                  <td className="px-4 py-2.5 text-gray-500 whitespace-nowrap">{formatDate(p.date)}</td>
                  <td className="px-4 py-2.5 text-gray-700">{MODES[p.mode] ?? p.mode}</td>
                  <td className="px-4 py-2.5 text-gray-500">{p.note || '—'}</td>
                  <td className="px-4 py-2.5 text-right font-semibold text-green-600 whitespace-nowrap">
                    + {p.montant.toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Modal>
  );
}