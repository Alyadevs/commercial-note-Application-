import { FormEvent, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/axios';
import { Client } from '../../types';
import { useNavigate } from 'react-router-dom';
import ChatBot from '../../components/chatbot';
const PAGE_SIZE = 6;
export default function Clients() {
  const [page, setPage] = useState(1);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [nom, setNom] = useState('');
  const [telephone, setTelephone] = useState('');
  const [adresse, setAdresse] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const [searchNom, setSearchNom] = useState('');
const [searchTel, setSearchTel] = useState('');
const [searchAdresse, setSearchAdresse] = useState('');
const [searchMontant, setSearchMontant] = useState('');

  async function loadClients() {
    setLoading(true);
    const { data } = await api.get('/clients');
    setClients(data);
    setLoading(false);
  }

  useEffect(() => {
    loadClients();
  }, []);

  async function handleAddClient(e: FormEvent) {
    e.preventDefault();
    setError('');
    try {
      await api.post('/clients', { nom, telephone, adresse });
      setNom(''); setTelephone(''); setAdresse('');
      setShowForm(false);
      loadClients();
    } catch (err: any) {
      setError(err.response?.data?.message || "Erreur lors de l'ajout du client");
    }
  }

  const totalCredit = clients.reduce((sum, c) => sum + (c.soldeCredit || 0), 0);
// Minuscules, sans accents
const norm = (s: string) =>
  s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();

// Garde uniquement les chiffres : "20 123-456" -> "20123456"
const digits = (s: string) => s.replace(/\D/g, '');

// Montant : "200", "40.00", ou avec opérateur : ">100", "<=500"
function matchMontant(solde: number, raw: string) {
  const q = raw.trim().replace(',', '.');
  if (!q) return true;
  if (/^(>=|<=|>|<)$/.test(q)) return true; // opérateur en cours de frappe

  const op = q.match(/^(>=|<=|>|<)\s*(\d+(?:\.\d+)?)$/);
  if (op) {
    const val = parseFloat(op[2]);
    if (op[1] === '>') return solde > val;
    if (op[1] === '<') return solde < val;
    if (op[1] === '>=') return solde >= val;
    return solde <= val;
  }
  if (/^\d+(\.\d*)?$/.test(q)) return solde.toFixed(2).includes(q);
  return false;
}

const filteredClients = clients.filter(
  (c) =>
    (!searchNom.trim() || norm(c.nom).includes(norm(searchNom))) &&
    (!digits(searchTel) || digits(c.telephone || '').includes(digits(searchTel))) &&
    (!searchAdresse.trim() || norm(c.adresse || '').includes(norm(searchAdresse))) &&
    matchMontant(c.soldeCredit || 0, searchMontant)
);

const hasFilters = !!(searchNom || searchTel || searchAdresse || searchMontant);

function resetFilters() {
  setSearchNom('');
  setSearchTel('');
  setSearchAdresse('');
  setSearchMontant('');
}

// Revient à la page 1 quand une recherche change
useEffect(() => {
  setPage(1);
}, [searchNom, searchTel, searchAdresse, searchMontant]);

const totalPages = Math.max(1, Math.ceil(filteredClients.length / PAGE_SIZE));
const startIndex = (page - 1) * PAGE_SIZE;
const paginatedClients = filteredClients.slice(startIndex, startIndex + PAGE_SIZE);

// Si la page courante n'existe plus (ex. après une suppression), on revient en arrière
useEffect(() => {
  if (page > totalPages) setPage(totalPages);
}, [page, totalPages]);

// Numéros de page affichés : 1 … 4 5 6 … 10
function getPageNumbers(): (number | '...')[] {
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
  const pages: (number | '...')[] = [1];
  const from = Math.max(2, page - 1);
  const to = Math.min(totalPages - 1, page + 1);
  if (from > 2) pages.push('...');
  for (let p = from; p <= to; p++) pages.push(p);
  if (to < totalPages - 1) pages.push('...');
  pages.push(totalPages);
  return pages;
}
  function getInitials(nom: string) {
    return nom
      .split(' ')
      .map((p) => p[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Header */}
     <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
  <div>
    <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Mes clients</h1>
    <p className="text-gray-500 text-sm mt-2 flex items-center gap-2 flex-wrap">
      <span className="inline-flex items-center gap-1.5 bg-gray-100 text-gray-700 px-2.5 py-1 rounded-full font-medium">
        {clients.length} client{clients.length !== 1 ? 's' : ''}
      </span>
      <span className="inline-flex items-center gap-1.5 bg-primary-50 text-primary-700 px-2.5 py-1 rounded-full font-semibold">
        Total crédit : {totalCredit.toFixed(2)}
      </span>
    </p>
  </div>

  <div className="flex items-center gap-3">
    <button
      onClick={() => setShowForm(!showForm)}
      className="inline-flex items-center justify-center gap-2 bg-primary-600 hover:bg-primary-700 active:scale-[0.98] transition-all text-white px-5 py-2.5 rounded-xl text-sm font-semibold shadow-sm shadow-primary-600/20"
    >
      {showForm ? (
        <>
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
          Annuler
        </>
      ) : (
        <>
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Nouveau client
        </>
      )}
    </button>

    
  </div>
</div>

      {/* Form */}
      {showForm && (
        <form
          onSubmit={handleAddClient}
          className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 mb-8 grid grid-cols-1 md:grid-cols-3 gap-4 animate-in fade-in slide-in-from-top-2 duration-200"
        >
          <div className="md:col-span-3 mb-1">
            <h2 className="text-base font-semibold text-gray-800">Ajouter un nouveau client</h2>
            <p className="text-xs text-gray-400 mt-0.5">Renseignez au moins le nom du client</p>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">Nom *</label>
            <input
              required
              placeholder="Ex : Ahmed Ben Salah"
              value={nom}
              onChange={(e) => setNom(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 transition-shadow"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">Téléphone</label>
            <input
              placeholder="Ex : 20 123 456"
              value={telephone}
              onChange={(e) => setTelephone(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 transition-shadow"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">Adresse</label>
            <input
              placeholder="Ex : Tunis, Cité Ennasr"
              value={adresse}
              onChange={(e) => setAdresse(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 transition-shadow"
            />
          </div>

          {error && (
            <p className="md:col-span-3 text-red-600 text-sm bg-red-50 border border-red-100 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <button
            type="submit"
            className="md:col-span-3 bg-primary-600 hover:bg-primary-700 active:scale-[0.99] transition-all text-white py-2.5 rounded-xl font-semibold text-sm shadow-sm shadow-primary-600/20"
          >
            Enregistrer le client
          </button>
        </form>
      )}
      {clients.length > 0 && (
  <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mb-4">
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
      <SearchField label="Nom" value={searchNom} onChange={setSearchNom} placeholder="Nom du client" />
      <SearchField label="Téléphone" value={searchTel} onChange={setSearchTel} placeholder="Ex : 20 123" inputMode="tel" />
      <SearchField label="Adresse" value={searchAdresse} onChange={setSearchAdresse} placeholder="Ex : Tunis" />
      <SearchField label="Montant" value={searchMontant} onChange={setSearchMontant} placeholder="Ex : 200 ou >100" />
    </div>

    {hasFilters && (
      <div className="flex items-center justify-between gap-3 mt-3 pt-3 border-t border-gray-100">
        <p className="text-xs text-gray-500">
          {filteredClients.length} résultat{filteredClients.length !== 1 ? 's' : ''} sur {clients.length}
        </p>
        <button
          onClick={resetFilters}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-primary-700 bg-primary-50 border border-primary-200 hover:bg-primary-600 hover:text-white hover:border-primary-600 active:scale-[0.98] shadow-sm transition-all"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h5M20 20v-5h-5M5.6 15A8 8 0 0018.4 9M18.4 9L15 9m-9.4 6L9 15" />
          </svg>
          Réinitialiser
        </button>
      </div>
    )}
  </div>
)}

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-6 h-6 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
          <span className="ml-3 text-gray-400 text-sm">Chargement...</span>
        </div>
      ) : clients.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-dashed border-gray-200">
          <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center mb-4">
            <svg className="w-7 h-7 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m6-1.13a4 4 0 100-8 4 4 0 000 8zm6 1.13a4 4 0 010 7.74" />
            </svg>
          </div>
          <p className="text-gray-500 text-sm">Aucun client pour le moment.</p>
          <p className="text-gray-400 text-xs mt-1">Ajoutez votre premier client pour commencer.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-left text-xs uppercase tracking-wide">
              <tr>
                <th className="px-5 py-3.5 font-semibold">Client</th>
                <th className="px-5 py-3.5 font-semibold">Téléphone</th>
                <th className="px-5 py-3.5 font-semibold">Adresse</th>
                <th className="px-5 py-3.5 font-semibold text-right">Solde crédit</th>
                <th className="px-5 py-3.5"></th>
              </tr>
            </thead>
           <tbody className="divide-y divide-gray-100">
  {filteredClients.length === 0 && (
    <tr>
      <td colSpan={5} className="px-5 py-14 text-center text-gray-500 text-sm">
        Aucun client ne correspond à votre recherche.
      </td>
    </tr>
  )}
              
            {paginatedClients.map((c) => (
  <tr key={c._id} className="hover:bg-gray-50/80 transition-colors">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-xs font-semibold shrink-0">
                        {getInitials(c.nom)}
                      </div>
                      <span className="font-medium text-gray-800">{c.nom}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-gray-500">{c.telephone || '—'}</td>
                  <td className="px-5 py-3.5 text-gray-500">{c.adresse || '—'}</td>
                  <td className="px-5 py-3.5 text-right">
                    <span
                      className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${
                        c.soldeCredit > 0
                          ? 'bg-red-50 text-red-600'
                          : 'bg-green-50 text-green-600'
                      }`}
                    >
                      {c.soldeCredit.toFixed(2)}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <Link
                      to={`/clients/${c._id}`}
                      className="inline-flex items-center gap-1 text-primary-600 hover:text-primary-700 font-medium text-xs"
                    >
                      Détails
                      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                      </svg>
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
            
          </table>
          {totalPages > 1 && (
  <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-5 py-3.5 border-t border-gray-100 bg-gray-50/50">
    <p className="text-xs text-gray-500">
     {startIndex + 1}–{Math.min(startIndex + PAGE_SIZE, filteredClients.length)} sur {filteredClients.length} clients
    </p>

    <div className="flex items-center gap-1">
      <button
        onClick={() => setPage((p) => Math.max(1, p - 1))}
        disabled={page === 1}
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
              p === page
                ? 'bg-primary-600 text-white shadow-sm'
                : 'text-gray-600 hover:bg-white hover:shadow-sm'
            }`}
          >
            {p}
          </button>
        )
      )}

      <button
        onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
        disabled={page === totalPages}
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
          <ChatBot />
        </div>
      )}
    </div>
  );
}
function SearchField({
  label,
  value,
  onChange,
  placeholder,
  inputMode,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  inputMode?: 'text' | 'tel';
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-500 mb-1.5">{label}</label>
      <div className="relative">
        <svg
          className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
          viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 10.5a6.5 6.5 0 11-13 0 6.5 6.5 0 0113 0z" />
        </svg>
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          inputMode={inputMode}
          placeholder={placeholder}
          className="w-full border border-gray-200 rounded-xl pl-10 pr-9 py-2.5 text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 transition-shadow"
        />
        {value && (
          <button
            onClick={() => onChange('')}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100"
            aria-label={`Effacer ${label.toLowerCase()}`}
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}