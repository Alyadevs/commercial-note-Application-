import { ReactElement, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/axios';
import Modal from '../../components/Modal';
import { Purchase } from '../../types/stock';
import { buildPurchasePdf } from '../../utils/purchasePdf';

const PAGE_SIZE = 8;

const inputClass =
  'w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 transition-shadow';

const norm = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();

const localDay = (d: string) => {
  const x = new Date(d);
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
};

const formatDate = (d: string) =>
  new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });

export default function Purchases() {
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [searchText, setSearchText] = useState('');
  const [searchDate, setSearchDate] = useState('');
  const [page, setPage] = useState(1);

  const [preview, setPreview] = useState<{ purchase: Purchase; url: string } | null>(null);

  const [toCancel, setToCancel] = useState<Purchase | null>(null);
  const [motif, setMotif] = useState('');
  const [cancelError, setCancelError] = useState('');
  const [cancelling, setCancelling] = useState(false);

  function load() {
    return api
      .get('/purchases')
      .then((r) => setPurchases(r.data))
      .catch((err) => setError(err.response?.data?.message || 'Impossible de charger les achats'))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    setPage(1);
  }, [searchText, searchDate]);

  const filtered = purchases.filter(
    (p) =>
      (!searchText.trim() ||
        norm(p.fournisseur).includes(norm(searchText)) ||
        norm(p.numero).includes(norm(searchText))) &&
      (!searchDate || localDay(p.date) === searchDate)
  );

  const hasFilters = searchText !== '' || searchDate !== '';
  const active = filtered.filter((p) => !p.annulee);
  const totalAchats = active.reduce((s, p) => s + p.total, 0);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const startIndex = (currentPage - 1) * PAGE_SIZE;
  const shown = filtered.slice(startIndex, startIndex + PAGE_SIZE);

  function openPreview(purchase: Purchase) {
    const url = URL.createObjectURL(buildPurchasePdf(purchase).output('blob'));
    setPreview({ purchase, url });
  }

  function closePreview() {
    if (preview) URL.revokeObjectURL(preview.url);
    setPreview(null);
  }

  function StatCard({
  label,
  value,
  hint,
  valueClass,
  iconBg,
  icon,
}: {
  label: string;
  value: string;
  hint: string;
  valueClass: string;
  iconBg: string;
  icon: ReactElement;
}) {
  return (
    <div className="flex items-start justify-between gap-4 p-5 transition-shadow bg-white border border-gray-100 shadow-sm rounded-2xl hover:shadow-md">
      <div className="min-w-0">
        <p className="text-sm text-gray-500">{label}</p>
        <p className={`mt-1 text-2xl font-bold tracking-tight truncate ${valueClass}`}>{value}</p>
        <p className="mt-1.5 text-xs text-gray-400">{hint}</p>
      </div>
      <div className={`flex items-center justify-center w-11 h-11 rounded-xl shrink-0 ${iconBg}`}>{icon}</div>
    </div>
  );
}

  async function handleCancel() {
    if (!toCancel) return;
    setCancelling(true);
    setCancelError('');
    try {
      await api.post(`/purchases/${toCancel._id}/annuler`, { motif: motif.trim() || undefined });
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
      {/* En-tête */}
   {/* En-tête */}
<div className="flex flex-col justify-between gap-4 mb-6 md:flex-row md:items-center">
  <div>
    <h1 className="text-3xl font-bold tracking-tight text-gray-900">Achats</h1>
    <p className="mt-1 text-sm text-gray-500">Suivez vos achats auprès des fournisseurs</p>
  </div>
  <Link
    to="/admin/achats/nouveau"
    className="inline-flex items-center justify-center gap-2 bg-primary-600 hover:bg-primary-700 active:scale-[0.98] transition-all text-white px-5 py-2.5 rounded-xl text-sm font-semibold shadow-sm shadow-primary-600/20"
  >
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
    </svg>
    Nouvel achat
  </Link>
</div>

{/* Cartes statistiques */}
<div className="grid grid-cols-1 gap-4 mb-6 sm:grid-cols-2">
  <StatCard
    label={`Nombre d'achats${hasFilters ? ' (résultats)' : ''}`}
    value={String(filtered.length)}
    hint={hasFilters ? `sur ${purchases.length} au total` : 'Achats enregistrés'}
    valueClass="text-gray-900"
    iconBg="bg-violet-50 text-violet-600"
    icon={
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
      </svg>
    }
  />
  <StatCard
    label={`Total acheté${hasFilters ? ' (résultats)' : ''}`}
    value={totalAchats.toFixed(2)}
    hint="Achats annulés exclus"
    valueClass="text-primary-700"
    iconBg="bg-blue-50 text-blue-600"
    icon={
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    }
  />
</div>

      {error && (
        <p className="px-3 py-2 mb-4 text-sm text-red-600 border border-red-100 rounded-lg bg-red-50">{error}</p>
      )}

      {/* Recherche */}
      <div className="grid grid-cols-1 gap-3 p-4 mb-4 bg-white border border-gray-100 shadow-sm rounded-2xl md:grid-cols-[1.5fr_1fr_auto] items-end">
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1.5">Fournisseur ou numéro</label>
          <input
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            placeholder="Ex : Société Ben Salah ou ACH-2026-0001"
            className={inputClass}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1.5">Date</label>
          <input type="date" value={searchDate} onChange={(e) => setSearchDate(e.target.value)} className={inputClass} />
        </div>
        {hasFilters && (
          <button
            onClick={() => { setSearchText(''); setSearchDate(''); }}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-primary-700 bg-primary-50 border border-primary-200 hover:bg-primary-600 hover:text-white hover:border-primary-600 active:scale-[0.98] shadow-sm transition-all"
          >
            Réinitialiser
          </button>
        )}
      </div>

      {/* Tableau */}
      <div className="overflow-hidden bg-white border border-gray-100 shadow-sm rounded-2xl">
        {loading ? (
          <p className="py-16 text-sm text-center text-gray-400">Chargement...</p>
        ) : shown.length === 0 ? (
          <p className="py-16 text-sm text-center text-gray-500">
            {purchases.length === 0 ? 'Aucun achat pour le moment.' : 'Aucun achat ne correspond à la recherche.'}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs tracking-wide text-left text-gray-500 uppercase bg-gray-50">
                <tr>
                  <th className="px-5 py-3.5 font-semibold">Numéro</th>
                  <th className="px-5 py-3.5 font-semibold">Fournisseur</th>
                  <th className="px-5 py-3.5 font-semibold">Date</th>
                  <th className="px-5 py-3.5 font-semibold text-right">Articles</th>
                  <th className="px-5 py-3.5 font-semibold text-right">Total</th>
                  <th className="px-5 py-3.5 font-semibold">Statut</th>
                  <th className="px-5 py-3.5"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {shown.map((p) => (
                  <tr key={p._id} className={`transition-colors hover:bg-gray-50/80 ${p.annulee ? 'bg-gray-50/60 text-gray-400' : ''}`}>
                    <td className="px-5 py-3.5 font-semibold text-primary-700 whitespace-nowrap">{p.numero}</td>
                    <td className="px-5 py-3.5 font-medium text-gray-800">{p.fournisseur}</td>
                    <td className="px-5 py-3.5 text-gray-500 whitespace-nowrap">{formatDate(p.date)}</td>
                    <td className="px-5 py-3.5 text-right">
                      <span className="inline-flex items-center justify-center min-w-[1.75rem] px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 text-xs font-semibold">
                        {p.lignes.length}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right font-semibold text-gray-800 whitespace-nowrap">
                      {p.total.toFixed(2)}
                    </td>
                    <td className="px-5 py-3.5">
                      <span
                        title={p.annulee ? p.motifAnnulation || undefined : undefined}
                        className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${
                          p.annulee ? 'bg-gray-200 text-gray-600' : 'bg-green-50 text-green-600'
                        }`}
                      >
                        {p.annulee ? 'Annulé' : 'Reçu'}
                      </span>
                      {p.annulee && p.dateAnnulation && (
                        <p className="mt-1 text-xs text-gray-400 whitespace-nowrap">le {formatDate(p.dateAnnulation)}</p>
                      )}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => openPreview(p)}
                          title="Voir le PDF"
                          aria-label="Voir le PDF"
                          className="flex items-center justify-center w-8 h-8 text-gray-400 transition-colors rounded-lg hover:text-primary-600 hover:bg-primary-50"
                        >
                          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => buildPurchasePdf(p).save(`${p.numero}.pdf`)}
                          title="Télécharger le PDF"
                          aria-label="Télécharger le PDF"
                          className="flex items-center justify-center w-8 h-8 text-gray-400 transition-colors rounded-lg hover:text-primary-600 hover:bg-primary-50"
                        >
                          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M12 4v12m0 0l-4-4m4 4l4-4" />
                          </svg>
                        </button>
                        {!p.annulee && (
                          <button
                            onClick={() => { setCancelError(''); setMotif(''); setToCancel(p); }}
                            title="Annuler l'achat"
                            aria-label="Annuler l'achat"
                            className="flex items-center justify-center w-8 h-8 text-gray-400 transition-colors rounded-lg hover:text-red-600 hover:bg-red-50"
                          >
                            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                            </svg>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-between gap-3 px-5 py-3.5 border-t border-gray-100 bg-gray-50/50">
            <p className="text-xs text-gray-500">
              {startIndex + 1}–{Math.min(startIndex + PAGE_SIZE, filtered.length)} sur {filtered.length} achats
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

      {/* Aperçu du PDF */}
      {preview && (
        <div className="fixed inset-0 z-[60] bg-black/60 p-3 sm:p-6 flex flex-col">
          <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 bg-white rounded-t-2xl">
            <div>
              <p className="font-semibold text-gray-900">Achat {preview.purchase.numero}</p>
              <p className="text-xs text-gray-500">{preview.purchase.fournisseur}</p>
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
          <iframe title="Facture d'achat PDF" src={preview.url} className="flex-1 w-full bg-white rounded-b-2xl" />
        </div>
      )}

      {/* Annulation */}
      {toCancel && (
        <Modal title="Annuler cet achat ?" onClose={() => !cancelling && setToCancel(null)}>
          <p className="text-sm text-gray-600">
            Achat <strong>{toCancel.numero}</strong> chez <strong>{toCancel.fournisseur}</strong>.
          </p>
          <p className="px-3 py-2 mt-3 text-xs border rounded-lg text-amber-700 bg-amber-50 border-amber-100">
            Les quantités reçues seront retirées du stock. L'annulation est refusée si une partie a déjà été vendue.
            Les prix des produits ne reviennent pas à leur valeur précédente. L'achat restera dans la liste avec le
            statut « Annulé ».
          </p>
          <label className="block mt-4 mb-1.5 text-xs font-medium text-gray-500">Motif (optionnel)</label>
          <input
            value={motif}
            onChange={(e) => setMotif(e.target.value)}
            placeholder="Ex : erreur de saisie, retour fournisseur"
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
              {cancelling ? 'Annulation...' : "Annuler l'achat"}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}