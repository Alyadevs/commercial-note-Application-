export type Role = 'admin' | 'commercial';

export interface Vehicule {
  marque?: string;
  modele?: string;
  immatriculation?: string;
}

export interface UserInfo {
  id: string;
  _id?: string;
  nom: string;
  email: string;
  role: Role;
  telephone?: string;
  vehicule?: Vehicule | null;
  actif?: boolean;
}

export interface Client {
  _id: string;
  nom: string;
  telephone?: string;
  adresse?: string;
  notes?: string;
  soldeCredit: number;
  commercial: UserInfo | string;
  createdAt: string;
}

export interface Credit {
  _id: string;
  client: Client | string;
  commercial: UserInfo | string;
  montant: number;
  description?: string;
  dateCredit: string;
  dateEcheance?: string;
  montantRembourse: number;
  statut: 'impaye' | 'partiel' | 'paye';
  createdAt: string;
}

export interface Payment {
  _id: string;
  client: Client | string;
  commercial: UserInfo | string;
  credit?: string;
  montant: number;
  methode: string;
  note?: string;
  date: string;
  createdAt: string;
}

export interface Remise {
  _id: string;
  client: Client | string;
  commercial: UserInfo | string;
  credit?: string;
  montant: number;
  raison?: string;
  date: string;
  createdAt: string;
}

export interface ActivityLogEntry {
  _id: string;
  commercial: string;
  commercialNom: string;
  action: string;
  description: string;
  niveau: 'info' | 'important';
  createdAt: string;
}
export interface Transaction {
  _id: string;
  type: 'credit' | 'paiement' | 'remise';
  montant: number;
  date: string;
  description?: string;
}