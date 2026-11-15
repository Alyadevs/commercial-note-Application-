import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/axios';
import Modal from '../../components/Modal';
import { CommercialStockRow, Transfer } from '../../types/stock';

const PAGE_SIZE = 8;

const inputClass =
  'w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 transition-shadow';

const norm = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();

const formatDate = (d: string) =>
  new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });

const qtyOf = (t: Transfer) => t.lignes.reduce((s, l) => s + l.quantite, 0);

export default function Transfers() {
  const [tab, setTab] = useState<'historique' | 'stock'>('historique');
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [stock, setStock] = useState<CommercialStockRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [stockFilter, setStockFilter] = useState('');

  const [detail, setDetail] = useState<Transfer | null>(null);
  const [toCancel, setToCancel] = useState<Transfer | null>(null);
  const [motif, setMotif] = useState('');
  const [cancelError, setCancelError] = useState('');
  const [cancelling, setCancelling] = useState(false);

  function load() {
    return Promise.all([api.get('/transfers'), api.get('/transfers/stock')])
      .then(([t, s]) => {
        setTransfers(t.data);
        setStock(s.data);
      })
      .catch((err) => setError(err.response?.data?.message || 'Impossible de charger les transferts'))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    setPage(1);
  }, [search]);

  const filtered = transfers.filter(
    (t) =>
      !search.trim() ||
      norm(t.commercialNom).includes(norm(search)) ||
      norm(t.numero).includes(norm(search))
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const startIndex = (currentPage - 1) * PAGE_SIZE;
  const shown = filtered.slice(startIndex, startIndex + PAGE_SIZE);

  // Stock des commerciaux
  const commerciauxInStock = Array.from(
    new Map(stock.filter((r) => r.commercial).map((r) => [r.commercial!._id, r.commercial!.nom]))
  );
  const stockRows = stock
    .filter((r) => r.produit && r.commercial && (!stockFilter || r.commercial._id === stockFilter))
    .sort((a, b) => a.commercial!.nom.localeCompare(b.commercial!.nom) || a.produit!.nom.localeCompare(b.produit!.nom));
  const stockSaleValue = stockRows.reduce((s, r) => s + r.quantite * r.produit!.prixVente, 0);

  async function handleCancel() {
    if (!toCancel) return;
    setCancelling(true);
    setCancelError('');
    try {
      await api.post(`/transfers/${toCancel._id}/annuler`, { motif: motif.trim() || undefined });
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
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Transferts</h1>
          <p className="mt-1 text-sm text-gray-500">Produits transférés de votre stock vers les commerciaux</p>
        </div>
        <Link
          to="/admin/transferts/nouveau"
          className="inline-flex items-center justify-center gap-2 bg-primary-600 hover:bg-primary-700 active:scale-[0.98] transition-all text-white px-5 py-2.5 rounded-xl text-sm font-semibold shadow-sm shadow-primary-600/20"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Nouveau transfert
        </Link>
      </div>

      {error && (
        <p className="px-3 py-2 mb-4 text-sm text-red-600 border border-red-100 rounded-lg bg-red-50">{error}</p>
      )}

      {/* Onglets */}
      <div className="inline-flex p-1 mb-4 text-sm bg-gray-100 rounded-xl">
        {([['historique', 'Historique'], ['stock', 'Stock des commerciaux']] as const).map(([k, label]) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              tab === k ? 'bg-white shadow-sm text-gray-800' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'historique' ? (
        <>
          <div className="p-4 mb-4 bg-white border border-gray-100 shadow-sm rounded-2xl">
            <label className="block text-xs font-medium text-gray-500 mb-1.5">Commercial ou numéro</label>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Ex : Eya ou TRF-2026-0001"
              className={`${inputClass} md:max-w-md`}
            />
          </div>

          <div className="overflow-hidden bg-white border border-gray-100 shadow-sm rounded-2xl">
            {loading ? (
              <p className="py-16 text-sm text-center text-gray-400">Chargement...</p>
            ) : shown.length === 0 ? (
              <p className="py-16 text-sm text-center text-gray-500">
                {transfers.length === 0 ? 'Aucun transfert pour le moment.' : 'Aucun transfert ne correspond à la recherche.'}
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-xs tracking-wide text-left text-gray-500 uppercase bg-gray-50">
                    <tr>
                      <th className="px-5 py-3.5 font-semibold">Numéro</th>
                      <th className="px-5 py-3.5 font-semibold">Commercial</th>
                      <th className="px-5 py-3.5 font-semibold">Date</th>
                      <th className="px-5 py-3.5 font-semibold text-right">Produits</th>
                      <th className="px-5 py-3.5 font-semibold text-right">Quantité</th>
                      <th className="px-5 py-3.5 font-semibold">Statut</th>
                      <th className="px-5 py-3.5"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {shown.map((t) => (
                      <tr key={t._id} className={`transition-colors hover:bg-gray-50/80 ${t.annule ? 'bg-gray-50/60 text-gray-400' : ''}`}>
                        <td className="px-5 py-3.5 font-semibold text-primary-700 whitespace-nowrap">{t.numero}</td>
                        <td className="px-5 py-3.5 font-medium text-gray-800">{t.commercialNom}</td>
                        <td className="px-5 py-3.5 text-gray-500 whitespace-nowrap">{formatDate(t.date)}</td>
                        <td className="px-5 py-3.5 text-right">
                          <span className="inline-flex items-center justify-center min-w-[1.75rem] px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 text-xs font-semibold">
                            {t.lignes.length}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 font-semibold text-right text-gray-800">{qtyOf(t)}</td>
                        <td className="px-5 py-3.5">
                          <span
                            title={t.annule ? t.motifAnnulation || undefined : undefined}
                            className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${
                              t.annule ? 'bg-gray-200 text-gray-600' : 'bg-green-50 text-green-600'
                            }`}
                          >
                            {t.annule ? 'Annulé' : 'Transféré'}
                          </span>
                          {t.annule && t.dateAnnulation && (
                            <p className="mt-1 text-xs text-gray-400 whitespace-nowrap">le {formatDate(t.dateAnnulation)}</p>
                          )}
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => setDetail(t)}
                              title="Voir le détail"
                              aria-label="Voir le détail"
                              className="flex items-center justify-center w-8 h-8 text-gray-400 transition-colors rounded-lg hover:text-primary-600 hover:bg-primary-50"
                            >
                              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                              </svg>
                            </button>
                            {!t.annule && (
                              <button
                                onClick={() => { setCancelError(''); setMotif(''); setToCancel(t); }}
                                title="Annuler le transfert"
                                aria-label="Annuler le transfert"
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
                  {startIndex + 1}–{Math.min(startIndex + PAGE_SIZE, filtered.length)} sur {filtered.length} transferts
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
        </>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-3 p-4 mb-4 bg-white border border-gray-100 shadow-sm rounded-2xl md:grid-cols-[1fr_auto] items-end">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Commercial</label>
              <select value={stockFilter} onChange={(e) => setStockFilter(e.target.value)} className={`${inputClass} md:max-w-md`}>
                <option value="">Tous les commerciaux</option>
                {commerciauxInStock.map(([id, nom]) => (
                  <option key={id} value={id}>{nom}</option>
                ))}
              </select>
            </div>
            <p className="text-sm text-gray-500">
              Valeur de vente : <span className="font-bold text-primary-700">{stockSaleValue.toFixed(2)}</span>
            </p>
          </div>

          <div className="overflow-hidden bg-white border border-gray-100 shadow-sm rounded-2xl">
            {loading ? (
              <p className="py-16 text-sm text-center text-gray-400">Chargement...</p>
            ) : stockRows.length === 0 ? (
              <p className="py-16 text-sm text-center text-gray-500">Aucun produit en stock chez les commerciaux.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-xs tracking-wide text-left text-gray-500 uppercase bg-gray-50">
                    <tr>
                      <th className="px-5 py-3.5 font-semibold">Commercial</th>
                      <th className="px-5 py-3.5 font-semibold">Produit</th>
                      <th className="px-5 py-3.5 font-semibold text-right">Quantité</th>
                      <th className="px-5 py-3.5 font-semibold text-right">Prix vente</th>
                      <th className="px-5 py-3.5 font-semibold text-right">Valeur vente</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {stockRows.map((r) => (
                      <tr key={r._id} className="transition-colors hover:bg-gray-50/80">
                        <td className="px-5 py-3.5 font-medium text-gray-800">{r.commercial!.nom}</td>
                        <td className="px-5 py-3.5">
                          <p className="text-gray-800">{r.produit!.nom}</p>
                          {r.produit!.reference && <p className="text-xs text-gray-400">{r.produit!.reference}</p>}
                        </td>
                        <td className="px-5 py-3.5 font-semibold text-right text-gray-800">{r.quantite}</td>
                        <td className="px-5 py-3.5 text-right text-gray-600">{r.produit!.prixVente.toFixed(2)}</td>
                        <td className="px-5 py-3.5 font-medium text-right text-gray-800">
                          {(r.quantite * r.produit!.prixVente).toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* Détail */}
      {detail && (
        <Modal title={`Transfert ${detail.numero}`} onClose={() => setDetail(null)}>
          <p className="mb-1 text-sm text-gray-600">
            Vers <strong>{detail.commercialNom}</strong> · {formatDate(detail.date)}
          </p>
          {detail.note && <p className="mb-3 text-sm text-gray-500">Note : {detail.note}</p>}
          <div className="mt-3 overflow-hidden border border-gray-100 rounded-xl">
            <table className="w-full text-sm">
              <thead className="text-xs text-left text-gray-500 uppercase bg-gray-50">
                <tr>
                  <th className="px-4 py-2.5 font-semibold">Produit</th>
                  <th className="px-4 py-2.5 font-semibold text-right">Quantité</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {detail.lignes.map((l) => (
                  <tr key={l.produit}>
                    <td className="px-4 py-2.5 text-gray-800">
                      {l.nom}
                      {l.reference && <span className="ml-2 text-xs text-gray-400">{l.reference}</span>}
                    </td>
                    <td className="px-4 py-2.5 font-semibold text-right text-gray-800">{l.quantite}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {detail.annule && (
            <p className="px-3 py-2 mt-4 text-sm text-gray-600 bg-gray-100 rounded-lg">
              Annulé{detail.dateAnnulation ? ` le ${formatDate(detail.dateAnnulation)}` : ''}
              {detail.motifAnnulation ? ` : ${detail.motifAnnulation}` : ''}
            </p>
          )}
        </Modal>
      )}

      {/* Annulation */}
      {toCancel && (
        <Modal title="Annuler ce transfert ?" onClose={() => !cancelling && setToCancel(null)}>
          <p className="text-sm text-gray-600">
            Transfert <strong>{toCancel.numero}</strong> vers <strong>{toCancel.commercialNom}</strong>.
          </p>
          <p className="px-3 py-2 mt-3 text-xs border rounded-lg text-amber-700 bg-amber-50 border-amber-100">
            Les quantités seront retirées du stock du commercial et remises dans votre stock. L'annulation est refusée
            si le commercial n'a plus assez de ces produits. Le transfert restera dans la liste avec le statut « Annulé ».
          </p>
          <label className="block mt-4 mb-1.5 text-xs font-medium text-gray-500">Motif (optionnel)</label>
          <input
            value={motif}
            onChange={(e) => setMotif(e.target.value)}
            placeholder="Ex : erreur de saisie, retour de tournée"
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
              {cancelling ? 'Annulation...' : 'Annuler le transfert'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}