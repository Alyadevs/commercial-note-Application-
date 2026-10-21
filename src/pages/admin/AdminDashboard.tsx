import { ReactElement, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/axios';
import { Client, UserInfo } from '../../types';

export default function AdminDashboard() {
  const [commerciaux, setCommerciaux] = useState<UserInfo[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
const [search, setSearch] = useState('');
  useEffect(() => {
    async function load() {
      const [c, cl] = await Promise.all([
        api.get('/users/commerciaux'),
        api.get('/clients'),
      ]);
      setCommerciaux(c.data);
      setClients(cl.data);
      setLoading(false);
    }
    load();
  }, []);

  const totalCredit = clients.reduce((s, c) => s + (c.soldeCredit || 0), 0);

  // function soldeParCommercial(commercialId: string) {
  //   return clients
  //     .filter((c) => (typeof c.commercial === 'string' ? c.commercial : c.commercial._id) === commercialId)
  //     .reduce((s, c) => s + (c.soldeCredit || 0), 0);
  // }

  // function nbClientsParCommercial(commercialId: string) {
  //   return clients.filter((c) => (typeof c.commercial === 'string' ? c.commercial : c.commercial._id) === commercialId).length;
  // }
// Retourne l'id du commercial d'un client, ou null s'il a été supprimé
function commercialIdOf(c: Client): string | null {
  const com: any = c.commercial;
  if (!com) return null;
  return typeof com === 'string' ? com : com._id ?? null;
}

// Minuscules, sans accents
const norm = (s: string) =>
  s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();

// Pour les matricules : "123 TUN 4567" et "123tun4567" doivent correspondre
const compact = (s: string) => norm(s).replace(/[\s\-_.]/g, '');

function matchesSearch(c: UserInfo): boolean {
  const q = norm(search);
  if (!q) return true;

  const solde = soldeParCommercial(c._id!);

  // Opérateurs sur le crédit : >500, <500, >=500, <=500
  const op = q.match(/^(>=|<=|>|<)\s*(\d+(?:[.,]\d+)?)$/);
  if (op) {
    const val = parseFloat(op[2].replace(',', '.'));
    if (op[1] === '>') return solde > val;
    if (op[1] === '<') return solde < val;
    if (op[1] === '>=') return solde >= val;
    return solde <= val;
  }

  // Nom du commercial, marque et modèle du véhicule
  const v = c.vehicule;
  const texts = [c.nom, v?.marque, v?.modele].filter(Boolean).map((x) => norm(String(x)));
  if (texts.some((t) => t.includes(q))) return true;

  // Matricule
  const qPlate = compact(q);
  if (qPlate && compact(v?.immatriculation || '').includes(qPlate)) return true;

  // Montant du crédit (ex : "1125" ou "960.00")
  if (/^\d+([.,]\d*)?$/.test(q) && solde.toFixed(2).includes(q.replace(',', '.'))) return true;

  return false;
}

const filteredCommerciaux = commerciaux.filter(matchesSearch);

function soldeParCommercial(commercialId: string) {
  return clients
    .filter((c) => commercialIdOf(c) === commercialId)
    .reduce((s, c) => s + (c.soldeCredit || 0), 0);
}

function nbClientsParCommercial(commercialId: string) {
  return clients.filter((c) => commercialIdOf(c) === commercialId).length;
}
  function getInitials(nom: string) {
    return nom
      .split(' ')
      .map((p) => p[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();
  }

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-20 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
        <span className="ml-3 text-gray-400 text-sm">Chargement...</span>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Tableau de bord</h1>
        <p className="text-gray-500 text-sm mt-1">Vue d'ensemble de votre activité commerciale</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
        <StatCard
          label="Commerciaux actifs"
          value={commerciaux.filter((c) => c.actif).length.toString()}
          tone="blue"
          icon={
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          }
        />
        <StatCard
          label="Clients au total"
          value={clients.length.toString()}
          tone="violet"
          icon={
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m6-1.13a4 4 0 100-8 4 4 0 000 8zm6 1.13a4 4 0 010 7.74" />
            </svg>
          }
        />
        <StatCard
          label="Crédit total en cours"
          value={totalCredit.toFixed(2)}
          tone="amber"
          highlight
          icon={
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
      </div>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-3">
  <div className="flex items-baseline gap-3">
    <h2 className="text-lg font-semibold text-gray-800">Vue par commercial</h2>
    <span className="text-xs text-gray-400">
      {filteredCommerciaux.length} / {commerciaux.length} commercial
      {commerciaux.length !== 1 ? 'aux' : ''}
    </span>
  </div>

  <div className="relative w-full md:w-96">
    <svg
      className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
      viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 10.5a6.5 6.5 0 11-13 0 6.5 6.5 0 0113 0z" />
    </svg>
    <input
      value={search}
      onChange={(e) => setSearch(e.target.value)}
      placeholder="Nom, matricule ou crédit (ex : >500)"
      className="w-full bg-white border border-gray-200 rounded-xl pl-10 pr-9 py-2.5 text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 transition-shadow"
    />
    {search && (
      <button
        onClick={() => setSearch('')}
        className="absolute right-2.5 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100"
        aria-label="Effacer la recherche"
      >
        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    )}
  </div>
</div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-left text-xs uppercase tracking-wide">
              <tr>
                <th className="px-5 py-3.5 font-semibold">Commercial</th>
                <th className="px-5 py-3.5 font-semibold">Véhicule</th>
                <th className="px-5 py-3.5 font-semibold text-right">Clients</th>
                <th className="px-5 py-3.5 font-semibold text-right">Crédit en cours</th>
                <th className="px-5 py-3.5"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredCommerciaux.map((c) => (
                <tr key={c._id} className="hover:bg-gray-50/80 transition-colors">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 ${
                          c.actif ? 'bg-primary-100 text-primary-700' : 'bg-gray-100 text-gray-400'
                        }`}
                      >
                        {getInitials(c.nom)}
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`font-medium ${c.actif ? 'text-gray-800' : 'text-gray-500'}`}>{c.nom.toUpperCase()}</span>
                        {!c.actif && (
                          <span className="text-xs text-red-600 bg-red-50 px-2 py-0.5 rounded-full font-medium">
                            désactivé
                          </span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-gray-500">
                    {c.vehicule?.marque
                      ? `${c.vehicule.marque} ${c.vehicule.modele || ''} — ${c.vehicule.immatriculation || ''}`
                      : '—'}
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <span className="inline-flex items-center justify-center min-w-[1.75rem] px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 text-xs font-semibold">
                      {nbClientsParCommercial(c._id!)}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <span
                      className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${
                        soldeParCommercial(c._id!) > 0 ? 'bg-primary-50 text-primary-700' : 'bg-green-50 text-green-600'
                      }`}
                    >
                      {soldeParCommercial(c._id!).toFixed(2)}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-right">
                   <Link
  to={`/admin/commerciaux/${c._id}/transactions`}
  className="inline-flex items-center gap-1 text-primary-600 hover:text-primary-700 font-medium text-xs"
>
  Voir les transactions
  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
  </svg>
</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

type Tone = 'blue' | 'violet' | 'amber';

const TONES: Record<Tone, { bg: string; text: string }> = {
  blue: { bg: 'bg-blue-50', text: 'text-blue-600' },
  violet: { bg: 'bg-violet-50', text: 'text-violet-600' },
  amber: { bg: 'bg-amber-50', text: 'text-amber-600' },
};

function StatCard({
  label,
  value,
  highlight,
  icon,
  tone,
}: {
  label: string;
  value: string;
  highlight?: boolean;
  icon: ReactElement;
  tone: Tone;
}) {
  const t = TONES[tone];
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 flex items-center justify-between gap-4 hover:shadow-md transition-shadow">
      <div>
        <p className="text-gray-500 text-sm">{label}</p>
        <p className={`text-3xl font-bold mt-1 tracking-tight ${highlight ? 'text-primary-700' : 'text-gray-900'}`}>
          {value}
        </p>
      </div>
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${t.bg} ${t.text}`}>
        {icon}
      </div>
    </div>
  );
}