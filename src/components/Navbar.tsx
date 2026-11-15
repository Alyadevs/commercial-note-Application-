import { ReactElement, useEffect, useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface NavItem {
  to: string;
  label: string;
  end?: boolean;
  icon: ReactElement;
}

const svg = (d: string) => (
  <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d={d} />
  </svg>
);

const ICONS = {
  clients: svg('M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m6-1.13a4 4 0 100-8 4 4 0 000 8zm6 1.13a4 4 0 010 7.74'),
  dashboard: svg('M4 6a2 2 0 012-2h3a2 2 0 012 2v3a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v3a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h3a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z'),
  commerciaux: svg('M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z'),
  journal: svg('M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z'),
  produits: svg('M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4'),
categories: svg('M7 7h.01M7 3h5a1.99 1.99 0 011.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.99 1.99 0 013 12V7a4 4 0 014-4z'),
  facture: svg('M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z'),
  liste: svg('M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4'),
  achats: svg('M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z'),
  transfert: svg('M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4'),
};

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  // Ferme le menu mobile à chaque changement de page
  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  if (!user) return null;

  function handleLogout() {
    logout();
    navigate('/login');
  }

  function getInitials(nom: string) {
    return nom
      .split(' ')
      .map((p) => p[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();
  }

  const items: NavItem[] =
    user.role === 'admin'
      ? [
          { to: '/admin', label: 'Tableau de bord', end: true, icon: ICONS.dashboard },
          { to: '/admin/commerciaux', label: 'Commerciaux', icon: ICONS.commerciaux },
          { to: '/admin/journal', label: "Journal d'activité", icon: ICONS.journal },
            { to: '/admin/clients', label: 'Clients', icon: ICONS.clients },
          { to: '/admin/produits', label: 'Produits', icon: ICONS.produits },
          { to: '/admin/categories', label: 'Catégories', icon: ICONS.categories }, 
          { to: '/admin/achats', label: 'Achats', end: true, icon: ICONS.achats },
{ to: '/admin/achats/nouveau', label: 'Nouvel achat', icon: ICONS.achats },
          { to: '/admin/factures/nouvelle', label: 'Nouvelle facture', icon: ICONS.facture },
          { to: '/admin/factures', label: 'Liste des factures', icon: ICONS.liste },
          
{ to: '/admin/transferts', label: 'Transferts', end: true, icon: ICONS.transfert },
{ to: '/admin/transferts/nouveau', label: 'Nouveau transfert', icon: ICONS.transfert },
          
        
          
          
        ]
     : user.role === 'commercial'
? [
    { to: '/', label: 'Mes clients', end: true, icon: ICONS.clients },
    { to: '/mon-stock', label: 'Mon stock', icon: ICONS.produits },
    { to: '/factures', label: 'Mes factures', end: true, icon: ICONS.liste },
    { to: '/factures/nouvelle', label: 'Nouvelle facture', icon: ICONS.facture },
  ]
: [];

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors ${
      isActive
        ? 'bg-white/20 text-white shadow-sm ring-1 ring-white/20'
        : 'text-white/75 hover:text-white hover:bg-white/10'
    }`;

  const Logo = (
    <button onClick={() => navigate('/')} className="flex items-center gap-3" aria-label="Accueil">
      <span className="w-10 h-10 rounded-xl bg-white/15 ring-1 ring-white/20 flex items-center justify-center shrink-0">
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 7l9-4 9 4M5 10v8m4-8v8m6-8v8m4-8v8M3 21h18" />
        </svg>
      </span>
      <span className="font-bold text-lg tracking-tight leading-tight text-left">Commercial Note</span>
    </button>
  );

  return (
    <>
      {/* Barre du haut : mobile uniquement */}
      <div className="md:hidden fixed top-0 inset-x-0 z-40 h-14 px-4 flex items-center justify-between bg-gradient-to-r from-primary-700 to-primary-600 text-white shadow-lg">
        <span className="font-bold tracking-tight">Gestion Commercial</span>
        <button
          onClick={() => setMenuOpen(true)}
          className="w-10 h-10 flex items-center justify-center rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
          aria-label="Ouvrir le menu"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </div>

      {/* Fond sombre derrière le menu mobile */}
      {menuOpen && (
        <div className="md:hidden fixed inset-0 z-40 bg-black/50" onClick={() => setMenuOpen(false)} />
      )}

      {/* Barre latérale */}
      <aside
        className={`fixed top-0 left-0 z-50 h-screen w-64 flex flex-col bg-gradient-to-b from-primary-700 to-primary-800 text-white shadow-2xl transition-transform duration-200 md:translate-x-0 ${
          menuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Logo + fermer (mobile) */}
        <div className="flex items-center justify-between px-5 h-20 border-b border-white/10">
          {Logo}
          <button
            onClick={() => setMenuOpen(false)}
            className="md:hidden w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/10"
            aria-label="Fermer le menu"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Liens */}
        <nav className="flex-1 overflow-y-auto px-3 py-5 space-y-1">
          <p className="px-3.5 mb-2 text-[11px] font-semibold uppercase tracking-wider text-white/40">Menu</p>
          {items.map((it) => (
            <NavLink key={it.to} to={it.to} end={it.end} className={linkClass}>
              {it.icon}
              {it.label}
            </NavLink>
          ))}
        </nav>

        {/* Profil + déconnexion */}
        <div className="px-3 py-4 border-t border-white/10 space-y-2">
          <button
            onClick={() => navigate('/profile')}
            title="Voir mon profil"
            className="group w-full flex items-center gap-3 bg-white/10 hover:bg-white/20 ring-1 ring-white/10 px-3 py-2.5 rounded-xl transition-colors"
          >
            <span className="w-9 h-9 rounded-full bg-white text-primary-700 flex items-center justify-center text-xs font-bold shrink-0">
              {getInitials(user.nom)}
            </span>
            <span className="flex-1 min-w-0 flex flex-col items-start leading-tight">
              <span className="text-sm font-semibold truncate max-w-full">{user.nom}</span>
              <span className="text-[11px] text-white/60 capitalize">{user.role}</span>
            </span>
            <svg
              className="w-4 h-4 text-white/60 transition-transform group-hover:translate-x-0.5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>

          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium text-white/75 hover:text-white hover:bg-red-500/80 transition-colors"
          >
            <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Déconnexion
          </button>
        </div>
      </aside>
    </>
  );
}