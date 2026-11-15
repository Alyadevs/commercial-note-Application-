import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Purchase } from '../types/stock';

const COMPANY = 'METOO BRING TECHNOLOGY';

const money = (n: number) => {
  const [int, dec] = n.toFixed(2).split('.');
  return `${int.replace(/\B(?=(\d{3})+(?!\d))/g, ' ')}.${dec} DT`;
};

export function buildPurchasePdf(p: Purchase): jsPDF {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const blue: [number, number, number] = [29, 78, 216];

  // Bandeau d'en-tête
  doc.setFillColor(...blue);
  doc.rect(0, 0, W, 36, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.text(COMPANY, 14, 21);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text("FACTURE D'ACHAT", W - 14, 15, { align: 'right' });
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.text(p.numero, W - 14, 24, { align: 'right' });

  // Fournisseur et date : même colonne, à gauche
  doc.setTextColor(120, 120, 120);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text('Fournisseur', 14, 50);

  doc.setTextColor(30, 30, 30);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  const lines: string[] = doc.splitTextToSize(p.fournisseur, W / 2);
  doc.text(lines, 14, 58);

  const infoY = 58 + (lines.length - 1) * 6 + 10;

  doc.setTextColor(120, 120, 120);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text('DATE', 14, infoY);

  doc.setTextColor(30, 30, 30);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text(new Date(p.date).toLocaleDateString('fr-FR'), 14, infoY + 8);

  // Tableau des produits
  autoTable(doc, {
    startY: infoY + 18,
    head: [['#', 'Désignation', 'Qté', 'Prix achat', 'Prix vente', 'Total achat']],
    body: p.lignes.map((l, i) => [
      String(i + 1),
      l.reference ? `${l.nom}\n${l.reference}` : l.nom,
      String(l.quantite),
      money(l.prixAchat),
      money(l.prixVente),
      money(l.total),
    ]),
    theme: 'striped',
    headStyles: { fillColor: blue, textColor: 255, fontStyle: 'bold' },
    styles: { fontSize: 10, cellPadding: 3 },
    columnStyles: {
      0: { cellWidth: 10 },
      2: { halign: 'right', cellWidth: 16 },
      3: { halign: 'right', cellWidth: 30 },
      4: { halign: 'right', cellWidth: 30 },
      5: { halign: 'right', cellWidth: 32 },
    },
  });

  // Total
  let y = (doc as any).lastAutoTable.finalY + 10;
  if (y > H - 50) {
    doc.addPage();
    y = 20;
  }
  doc.setDrawColor(...blue);
  doc.setLineWidth(0.6);
  doc.line(W - 90, y - 4, W - 14, y - 4);
  doc.setTextColor(30, 30, 30);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text('TOTAL ACHAT', W - 90, y + 3);
  doc.setTextColor(...blue);
  doc.setFontSize(15);
  doc.text(money(p.total), W - 14, y + 3, { align: 'right' });

  // Note
  if (p.note) {
    doc.setTextColor(100, 100, 100);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(doc.splitTextToSize(`Note : ${p.note}`, W - 28), 14, y + 18);
  }

  // Tampon si annulé
  if (p.annulee) {
    doc.saveGraphicsState();
    doc.setGState(new (doc as any).GState({ opacity: 0.15 }));
    doc.setTextColor(220, 38, 38);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(80);
    doc.text('ANNULÉ', W / 2, H / 2, { align: 'center', angle: 35 });
    doc.restoreGraphicsState();
  }

  return doc;
}