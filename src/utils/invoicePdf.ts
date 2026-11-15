import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Invoice } from '../types/stock';

const COMPANY = 'METOO BRING TECHNOLOGY'; // nom affiché en haut de la facture

// Espaces simples comme séparateur de milliers (le format fr-FR casse l'affichage dans le PDF)
const money = (n: number) => {
  const [int, dec] = n.toFixed(2).split('.');
  return `${int.replace(/\B(?=(\d{3})+(?!\d))/g, ' ')}.${dec} DT`;
};

export function buildInvoicePdf(inv: Invoice): jsPDF {
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
  doc.text('NUMERO FACTURE', W - 14, 15, { align: 'right' });
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.text(inv.numero, W - 14, 24, { align: 'right' });

  // Client et date : même colonne, à gauche
  doc.setTextColor(120, 120, 120);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text('Nom client', 14, 50);

  doc.setTextColor(30, 30, 30);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  const clientLines: string[] = doc.splitTextToSize(inv.clientNom, W / 2); // coupe les noms trop longs
  doc.text(clientLines, 14, 58);

  let infoY = 58 + (clientLines.length - 1) * 6 + 10;

  doc.setTextColor(120, 120, 120);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text('DATE', 14, infoY);

  doc.setTextColor(30, 30, 30);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text(new Date(inv.date).toLocaleDateString('fr-FR'), 14, infoY + 8);

  // Tableau des produits
  autoTable(doc, {
    startY: infoY + 18,
    head: [['#', 'Désignation', 'Qté', 'Prix unitaire', 'Total']],
    body: inv.lignes.map((l, i) => [
      String(i + 1),
      l.reference ? `${l.nom}` : l.nom,
      String(l.quantite),
      money(l.prixUnitaire),
      money(l.total),
    ]),
    theme: 'striped',
    headStyles: { fillColor: blue, textColor: 255, fontStyle: 'bold' },
    styles: { fontSize: 10, cellPadding: 3 },
    columnStyles: {
      0: { cellWidth: 12 },
      2: { halign: 'right', cellWidth: 22 },
      3: { halign: 'right', cellWidth: 36 },
      4: { halign: 'right', cellWidth: 36 },
    },
  });

  // Sous-total, remise et total
let y = (doc as any).lastAutoTable.finalY + 10;

const remise = inv.remise ?? 0;
const sousTotal = inv.sousTotal ?? (inv.total + remise);

if (y > H - (remise > 0 ? 70 : 50)) {
  doc.addPage();
  y = 20;
}

// Sous-total
doc.setFont('helvetica', 'normal');
doc.setFontSize(11);
doc.setTextColor(90, 90, 90);

doc.text('Sous-total', W - 90, y);
doc.text(money(sousTotal), W - 14, y, { align: 'right' });

y += 8;

// Remise
if (remise > 0) {
  const remiseLabel =
    inv.remiseType === 'pourcentage' && inv.remiseValeur
      ? `Remise (${inv.remiseValeur} %)`
      : 'Remise';

  doc.text(remiseLabel, W - 90, y);
  doc.setTextColor(220, 38, 38);
  doc.text(`- ${money(remise)}`, W - 14, y, { align: 'right' });

  y += 9;
}

// Ligne de séparation
doc.setDrawColor(...blue);
doc.setLineWidth(0.6);
doc.line(W - 90, y - 3, W - 14, y - 3);

// Total final
doc.setTextColor(30, 30, 30);
doc.setFont('helvetica', 'bold');
doc.setFontSize(13);
doc.text('TOTAL À PAYER', W - 90, y + 5);

doc.setTextColor(...blue);
doc.setFontSize(15);
doc.text(money(inv.total), W - 14, y + 5, { align: 'right' });
  // Note
  if (inv.note) {
    doc.setTextColor(100, 100, 100);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(doc.splitTextToSize(`Note : ${inv.note}`, W - 28), 14, y + 18);
  }

  // Pied de page
  doc.setTextColor(150, 150, 150);
  doc.setFontSize(9);
  doc.text('Merci pour votre confiance.', W / 2, H - 12, { align: 'center' });
if (inv.annulee) {
  doc.saveGraphicsState();
  doc.setGState(new (doc as any).GState({ opacity: 0.15 }));
  doc.setTextColor(220, 38, 38);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(80);
  doc.text('ANNULÉE', W / 2, H / 2, { align: 'center', angle: 35 });
  doc.restoreGraphicsState();
}
  return doc;
}