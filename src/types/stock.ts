export interface Category {
  _id: string;
  nom: string;
  parent?: string | null;
}

export interface Product {
  _id: string;
  nom: string;
  reference?: string;
  categorie: { _id: string; nom: string } | null;
  sousCategorie?: { _id: string; nom: string } | null;
  prixAchat: number;
  prixVente: number;
  stock: number;
  seuilAlerte: number;
  image?: string | null;
}

export interface StockMovement {
  _id: string;
  type: 'entree' | 'sortie';
  quantite: number;
  stockApres: number;
  note?: string;
  createdAt: string;
}
export interface InvoiceLine {
  produit: string;
  nom: string;
  reference?: string;
  quantite: number;
  prixUnitaire: number;
  total: number;
  prixAchat?: number;
}

export interface Invoice {
  _id: string;
  numero: string;
  clientNom: string;
  date: string;
  lignes: InvoiceLine[];
  total: number;
  note?: string;
   benefice: number;
  beneficeEstime?: boolean;
  sousTotal?: number;
remise?: number;
remiseType?: 'pourcentage' | 'montant';
remiseValeur?: number;
montantPaye?: number;
reste?: number;
statut?: 'impayee' | 'partielle' | 'payee' | 'annulee';
annulee?: boolean;
dateAnnulation?: string;
motifAnnulation?: string;
commercialNom?: string;
}
export interface InvoicePayment {
  _id: string;
  montant: number;
  mode: 'especes' | 'cheque' | 'virement' | 'autre';
  date: string;
  note?: string;
}
export interface PurchaseLine {
  produit: string;
  nom: string;
  reference?: string;
  quantite: number;
  prixAchat: number;
  prixVente: number;
  total: number;
}

export interface Purchase {
  _id: string;
  numero: string;
  fournisseur: string;
  date: string;
  lignes: PurchaseLine[];
  total: number;
  note?: string;
  annulee?: boolean;
  dateAnnulation?: string;
  motifAnnulation?: string;
}
export interface TransferLine {
  produit: string;
  nom: string;
  reference?: string;
  quantite: number;
}

export interface Transfer {
  _id: string;
  numero: string;
  commercial: string;
  commercialNom: string;
  date: string;
  lignes: TransferLine[];
  note?: string;
  annule?: boolean;
  dateAnnulation?: string;
  motifAnnulation?: string;
}

export interface CommercialStockRow {
  _id: string;
  quantite: number;
  produit: { _id: string; nom: string; reference?: string; prixAchat: number; prixVente: number } | null;
  commercial: { _id: string; nom: string } | null;
}
export interface MyStockItem {
  produit: string;
  nom: string;
  reference?: string;
  prixVente: number;
  quantite: number;
}
