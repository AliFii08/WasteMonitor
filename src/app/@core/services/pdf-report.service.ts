import { Injectable } from '@angular/core';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

export interface PdfTableSection {
  subtitle: string;
  rows: string[][];
}

export async function loadWasteMonitorLogo(): Promise<string> {
  const logoResponse = await fetch(new URL('icons/icon-192x192.png', document.baseURI));
  if (!logoResponse.ok) {
    throw new Error(`No se pudo cargar el logo para el PDF (${logoResponse.status}).`);
  }

  const logoBytes = new Uint8Array(await logoResponse.arrayBuffer());
  let logoBinary = '';
  logoBytes.forEach((byte) => logoBinary += String.fromCharCode(byte));
  return `data:image/png;base64,${btoa(logoBinary)}`;
}

@Injectable({ providedIn: 'root' })
export class PdfReportService {
  async generate(
    title: string,
    fileName: string,
    filterSummary: string,
    headers: string[],
    rows: string[][],
    sections?: PdfTableSection[],
  ): Promise<void> {
    const logoData = await loadWasteMonitorLogo();

    const doc = new jsPDF({
      orientation: headers.length > 5 ? 'landscape' : 'portrait',
      unit: 'mm',
      format: 'a4',
    });
    const pageWidth = doc.internal.pageSize.getWidth();
    const generatedAt = new Date().toLocaleString('es-ES');

    doc.setFillColor(0, 54, 40);
    doc.rect(0, 0, pageWidth, 34, 'F');
    doc.setFillColor(104, 163, 87);
    doc.rect(0, 34, pageWidth, 2, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.addImage(logoData, 'PNG', 14, 9, 14, 14);
    doc.text(title, 34, 16, { maxWidth: pageWidth - 48 });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(`Generado: ${generatedAt}`, 34, 25);

    doc.setTextColor(15, 75, 58);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('Criterio aplicado', 14, 44);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(55, 65, 81);
    doc.setFontSize(9);
    const filterLines = doc.splitTextToSize(filterSummary, pageWidth - 28) as string[];
    doc.text(filterLines, 14, 50);

    let cursorY = 55 + Math.max(0, filterLines.length - 1) * 4;
    const tableSections = sections ?? [{ subtitle: '', rows }];

    for (const section of tableSections) {
      if (section.subtitle) {
        if (cursorY + 18 > doc.internal.pageSize.getHeight() - 18) {
          doc.addPage();
          cursorY = 18;
        }

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.setTextColor(15, 75, 58);
        doc.text(section.subtitle, 14, cursorY + 4);
        cursorY += 8;
      }

      autoTable(doc, {
        startY: cursorY,
        head: [headers],
        body: section.rows,
        theme: 'grid',
        margin: { left: 14, right: 14, bottom: 18 },
        styles: {
          font: 'helvetica',
          fontSize: 8,
          cellPadding: 3,
          textColor: [31, 55, 46],
          lineColor: [218, 230, 222],
          lineWidth: 0.2,
          overflow: 'linebreak',
        },
        headStyles: {
          fillColor: [15, 75, 58],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
        },
        alternateRowStyles: { fillColor: [242, 248, 244] },
        didDrawPage: () => {
          const pageHeight = doc.internal.pageSize.getHeight();
          doc.setDrawColor(218, 230, 222);
          doc.line(14, pageHeight - 13, pageWidth - 14, pageHeight - 13);
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(8);
          doc.setTextColor(100, 116, 109);
          doc.text('WasteMonitor · Informe generado desde el sistema', 14, pageHeight - 8);
          doc.text(`Página ${doc.getNumberOfPages()}`, pageWidth - 14, pageHeight - 8, {
            align: 'right',
          });
        },
      });

      cursorY = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;
    }

    doc.save(fileName);
  }
}
