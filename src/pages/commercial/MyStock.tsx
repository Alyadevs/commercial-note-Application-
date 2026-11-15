import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/axios';
import { MyStockItem } from '../../types/stock';

const inputClass =
  'w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 transition-shadow';

const norm = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();

export default function MyStock() {
  const [items, setItems] = useState<MyStockItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    api
      .get('/my-stock')
      .then((r) => setItems(r.data))
      .catch((err) => setError(err.response?.data?.message || 'Impossible de charger votre stock'))
      .finally(() => setLoading(false));
  }, []);

  const filtered = items.filter(
    (i) => !search.trim() || norm(i.nom).includes(norm(search)) || norm(i.reference || '').includes(norm(search))
  );
  const totalQty = items.reduce((s, i) => s + i.quantite, 0);
  const totalValue = items.reduce((s, i) => s + i.quantite * i.prixVente, 0);

  return (
    <div className="max-w-5xl px-4 py-8 mx-auto">
      <div className="flex flex-col justify-between gap-4 mb-6 md:flex-row md:items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Mon stock</h1>
          <p className="flex flex-wrap items-center gap-2 mt-2 text-sm text-gray-500">
            <span className="inline-flex bg-gray-100 text-gray-700 px-2.5 py-1 rounded-full font-medium">
              {items.length} produit{items.length !== 1 ? 's' : ''}
            </span>
            <span className="inline-flex bg-blue-50 text-blue-700 px-2.5 py-1 rounded-full font-semibold">
              {totalQty} unité{totalQty !== 1 ? 's' : ''}
            </span>
            <span className="inline-flex bg-primary-50 text-primary-700 px-2.5 py-1 rounded-full font-semibold">
              Valeur de vente : {totalValue.toFixed(2)}
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

      <div className="p-4 mb-4 bg-white border border-gray-100 shadow-sm rounded-2xl">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher un produit"
          className={`${inputClass} md:max-w-md`}
        />
      </div>

      <div className="overflow-hidden bg-white border border-gray-100 shadow-sm rounded-2xl">
        {loading ? (
          <p className="py-16 text-sm text-center text-gray-400">Chargement...</p>
        ) : filtered.length === 0 ? (
          <p className="py-16 text-sm text-center text-gray-500">
            {items.length === 0
              ? "Votre stock est vide. L'administrateur doit vous transférer des produits."
              : 'Aucun produit ne correspond à la recherche.'}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs tracking-wide text-left text-gray-500 uppercase bg-gray-50">
                <tr>
                  <th className="px-5 py-3.5 font-semibold">Produit</th>
                  <th className="px-5 py-3.5 font-semibold text-right">Quantité</th>
                  <th className="px-5 py-3.5 font-semibold text-right">Prix de vente</th>
                  <th className="px-5 py-3.5 font-semibold text-right">Valeur</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((i) => (
                  <tr key={i.produit} className="transition-colors hover:bg-gray-50/80">
                    <td className="px-5 py-3.5">
                      <p className="font-medium text-gray-800">{i.nom}</p>
                      {i.reference && <p className="text-xs text-gray-400">{i.reference}</p>}
                    </td>
                    <td className="px-5 py-3.5 font-semibold text-right text-gray-800">{i.quantite}</td>
                    <td className="px-5 py-3.5 text-right text-gray-600">{i.prixVente.toFixed(2)}</td>
                    <td className="px-5 py-3.5 font-medium text-right text-gray-800">
                      {(i.quantite * i.prixVente).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}