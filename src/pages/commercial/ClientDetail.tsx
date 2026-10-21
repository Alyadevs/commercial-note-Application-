import { FormEvent, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import api from '../../api/axios';
import { Client, Credit, Payment, Remise } from '../../types';
import TransactionHistory from '../../components/TransactionHistory';

type Tab = 'credits' | 'paiements' | 'remises';

export default function ClientDetail() {
  const { id = '' } = useParams();
  const [client, setClient] = useState<Client | null>(null);
  const [credits, setCredits] = useState<Credit[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [remises, setRemises] = useState<Remise[]>([]);
  const [tab, setTab] = useState<Tab>('credits');
  const [error, setError] = useState('');

  // Champs des formulaires
  const [creditMontant, setCreditMontant] = useState('');
  const [creditDesc, setCreditDesc] = useState('');
  const [paiementMontant, setPaiementMontant] = useState('');
  const [paiementNote, setPaiementNote] = useState('');
  const [remiseMontant, setRemiseMontant] = useState('');
  const [remiseRaison, setRemiseRaison] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);
  async function loadAll() {
    const [c, cr, pa, re] = await Promise.all([
      api.get(`/clients/${id}`),
      api.get(`/credits?clientId=${id}`),
      api.get(`/payments?clientId=${id}`),
      api.get(`/remises?clientId=${id}`),
    ]);
    setClient(c.data);
    setCredits(cr.data);
    setPayments(pa.data);
    setRemises(re.data);
    setRefreshKey((k) => k + 1);
  }

  useEffect(() => {
    loadAll();
  }, [id]);

  async function handleAddCredit(e: FormEvent) {
    e.preventDefault();
    setError('');
    try {
      await api.post('/credits', { clientId: id, montant: parseFloat(creditMontant), description: creditDesc });
      setCreditMontant(''); setCreditDesc('');
      loadAll();
    } catch (err: any) {
      setError(err.response?.data?.message || "Erreur lors de l'ajout du crédit");
    }
  }

  async function handleAddPayment(e: FormEvent) {
    e.preventDefault();
    setError('');
    try {
      await api.post('/payments', { clientId: id, montant: parseFloat(paiementMontant), note: paiementNote });
      setPaiementMontant(''); setPaiementNote('');
      loadAll();
    } catch (err: any) {
      setError(err.response?.data?.message || "Erreur lors de l'enregistrement du paiement");
    }
  }

  async function handleAddRemise(e: FormEvent) {
    e.preventDefault();
    setError('');
    try {
      await api.post('/remises', { clientId: id, montant: parseFloat(remiseMontant), raison: remiseRaison });
      setRemiseMontant(''); setRemiseRaison('');
      loadAll();
    } catch (err: any) {
      setError(err.response?.data?.message || "Erreur lors de l'ajout de la remise");
    }
  }

  if (!client) return <div className="max-w-4xl mx-auto px-4 py-8 text-gray-500">Chargement...</div>;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <Link to="/" className="text-primary-600 text-sm hover:underline">&larr; Retour aux clients</Link>

      <div className="bg-white rounded-xl shadow p-6 my-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">{client.nom}</h1>
            <p className="text-gray-500 text-sm mt-1">{client.telephone || 'Pas de téléphone'} · {client.adresse || 'Pas d\'adresse'}</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-500">Solde crédit</p>
            <p className={`text-2xl font-bold ${client.soldeCredit > 0 ? 'text-red-600' : 'text-green-600'}`}>
              {client.soldeCredit.toFixed(2)}
            </p>
          </div>
        </div>
      </div>

      <div className="flex gap-2 mb-4">
        {(['credits', 'paiements', 'remises'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-lg text-sm font-medium capitalize ${tab === t ? 'bg-primary-600 text-white' : 'bg-white text-gray-600 border'}`}
          >
            {t === 'credits' ? 'Crédits' : t === 'paiements' ? 'Espèces reçues' : 'Remises'}
          </button>
        ))}
      </div>

      {error && <p className="text-red-600 text-sm mb-3">{error}</p>}

      {tab === 'credits' && (
        <div className="bg-white rounded-xl shadow p-5">
          <form onSubmit={handleAddCredit} className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-5">
            <input required type="number" step="0.01" min="0.01" placeholder="Montant du crédit" value={creditMontant}
              onChange={(e) => setCreditMontant(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-2" />
            <input placeholder="Description (optionnel)" value={creditDesc} onChange={(e) => setCreditDesc(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 md:col-span-2" />
            <button className="bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-medium">Ajouter un crédit</button>
          </form>
          <CreditsTable credits={credits} />
        </div>
      )}

      {tab === 'paiements' && (
        <div className="bg-white rounded-xl shadow p-5">
          <form onSubmit={handleAddPayment} className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-5">
            <input required type="number" step="0.01" min="0.01" placeholder="Montant reçu (espèces)" value={paiementMontant}
              onChange={(e) => setPaiementMontant(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-2" />
            <input placeholder="Note (optionnel)" value={paiementNote} onChange={(e) => setPaiementNote(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 md:col-span-2" />
            <button className="bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium">Enregistrer paiement</button>
          </form>
          <PaymentsTable payments={payments} />
        </div>
      )}

      {tab === 'remises' && (
        <div className="bg-white rounded-xl shadow p-5">
          <form onSubmit={handleAddRemise} className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-5">
            <input required type="number" step="0.01" min="0.01" placeholder="Montant de la remise" value={remiseMontant}
              onChange={(e) => setRemiseMontant(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-2" />
            <input placeholder="Raison (optionnel)" value={remiseRaison} onChange={(e) => setRemiseRaison(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 md:col-span-2" />
            <button className="bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-medium">Accorder la remise</button>
          </form>
          <RemisesTable remises={remises} />
        </div>
      )}
      <div className="mt-6">
  <TransactionHistory key={refreshKey} clientId={id} />{/* id = paramètre de l'URL du client */}
</div>
    </div>
  );
}

function CreditsTable({ credits }: { credits: Credit[] }) {
  if (credits.length === 0) return <p className="text-gray-500 text-sm">Aucun crédit enregistré.</p>;
  return (
    <table className="w-full text-sm">
      <thead className="text-left text-gray-500 border-b">
        <tr><th className="py-2">Date</th><th>Description</th><th className="text-right">Montant</th><th className="text-right">Remboursé</th><th className="text-right">Statut</th></tr>
      </thead>
      <tbody>
        {credits.map((c) => (
          <tr key={c._id} className="border-b last:border-0">
            <td className="py-2">{new Date(c.dateCredit).toLocaleDateString('fr-FR')}</td>
            <td>{c.description || '—'}</td>
            <td className="text-right">{c.montant.toFixed(2)}</td>
            <td className="text-right">{c.montantRembourse.toFixed(2)}</td>
            <td className="text-right">
              <span className={`px-2 py-0.5 rounded-full text-xs ${c.statut === 'paye' ? 'bg-green-100 text-green-700' : c.statut === 'partiel' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>
                {c.statut === 'paye' ? 'Payé' : c.statut === 'partiel' ? 'Partiel' : 'Impayé'}
              </span>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function PaymentsTable({ payments }: { payments: Payment[] }) {
  if (payments.length === 0) return <p className="text-gray-500 text-sm">Aucun paiement enregistré.</p>;
  return (
    <table className="w-full text-sm">
      <thead className="text-left text-gray-500 border-b">
        <tr><th className="py-2">Date</th><th>Note</th><th className="text-right">Montant</th></tr>
      </thead>
      <tbody>
        {payments.map((p) => (
          <tr key={p._id} className="border-b last:border-0">
            <td className="py-2">{new Date(p.date).toLocaleDateString('fr-FR')}</td>
            <td>{p.note || '—'}</td>
            <td className="text-right text-green-700 font-medium">{p.montant.toFixed(2)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function RemisesTable({ remises }: { remises: Remise[] }) {
  if (remises.length === 0) return <p className="text-gray-500 text-sm">Aucune remise accordée.</p>;
  return (
    <table className="w-full text-sm">
      <thead className="text-left text-gray-500 border-b">
        <tr><th className="py-2">Date</th><th>Raison</th><th className="text-right">Montant</th></tr>
      </thead>
      <tbody>
        {remises.map((r) => (
          <tr key={r._id} className="border-b last:border-0">
            <td className="py-2">{new Date(r.date).toLocaleDateString('fr-FR')}</td>
            <td>{r.raison || '—'}</td>
            <td className="text-right text-amber-700 font-medium">{r.montant.toFixed(2)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
