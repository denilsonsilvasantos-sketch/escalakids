import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import { Schedule, Micro, MicroFunction } from '../types';
import { storageService } from './storageService';
import { formatDateBR } from '../utils/dateUtils';

export class ExportService {
  private logoDataUrlPromise: Promise<{ dataUrl: string; width: number; height: number } | null> | null = null;

  // Fetches the app logo once and converts it to a data URL jsPDF can embed
  // directly (addImage needs a data: URI or raw base64, not a plain <img> src).
  // Cached across calls since the same logo is reused on every PDF export.
  private loadLogo(): Promise<{ dataUrl: string; width: number; height: number } | null> {
    if (!this.logoDataUrlPromise) {
      this.logoDataUrlPromise = new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
          try {
            const canvas = document.createElement('canvas');
            canvas.width = img.naturalWidth;
            canvas.height = img.naturalHeight;
            const ctx = canvas.getContext('2d');
            if (!ctx) {
              resolve(null);
              return;
            }
            ctx.drawImage(img, 0, 0);
            resolve({ dataUrl: canvas.toDataURL('image/png'), width: img.naturalWidth, height: img.naturalHeight });
          } catch {
            resolve(null);
          }
        };
        img.onerror = () => resolve(null);
        img.src = '/mevam-kids-logo.png';
      });
    }
    return this.logoDataUrlPromise;
  }

  /**
   * Generates a structured Matrix for a Schedule:
   * Rows = Sections / Functions
   * Cols = Dates
   */
  private generateScheduleMatrix(
    schedule: Schedule,
    selectedMicroIds?: string[]
  ) {
    const activeMicroIds = selectedMicroIds || schedule.microIds;
    const micros = storageService.getMicros().filter((m) => activeMicroIds.includes(m.id));
    const functions = storageService.getFunctions();
    const dates = schedule.dates;

    const sections: {
      micro: Micro;
      rows: {
        functionName: string;
        category?: string;
        slotIndex: number;
        assignmentsByDate: Record<string, string>;
      }[];
    }[] = [];

    for (const micro of micros) {
      const microFunctions = functions.filter((f) => f.microId === micro.id);
      const rows: {
        functionName: string;
        category?: string;
        slotIndex: number;
        assignmentsByDate: Record<string, string>;
      }[] = [];

      for (const fn of microFunctions) {
        const count = fn.defaultRequiredCount || 1;
        for (let i = 1; i <= count; i++) {
          const assignments: Record<string, string> = {};

          for (const d of dates) {
            const slot = schedule.slots.find(
              (s) => s.microId === micro.id && s.functionId === fn.id && s.date === d && s.slotIndex === i
            );
            assignments[d] = slot?.assignedPersonName || '-';
          }

          const label = count > 1 ? `${fn.name} ${i}` : fn.name;
          rows.push({
            functionName: label,
            category: fn.category,
            slotIndex: i,
            assignmentsByDate: assignments
          });
        }
      }

      if (rows.length > 0) {
        sections.push({ micro, rows });
      }
    }

    return { sections, dates };
  }

  /**
   * Exports to XLSX matching MEVAM Kids Excel layout
   */
  exportToExcel(schedule: Schedule, selectedMicroIds?: string[], filename?: string): void {
    const { sections, dates } = this.generateScheduleMatrix(schedule, selectedMicroIds);
    const dateHeaders = dates.map((d) => formatDateBR(d));

    const worksheetData: (string | number)[][] = [];

    // Header Title
    worksheetData.push(['MEVAM KIDS']);
    worksheetData.push([schedule.eventName || schedule.title]);
    worksheetData.push(['Período:', dates.map((d) => formatDateBR(d)).join(', ')]);
    worksheetData.push([]); // Empty line

    // Table Header
    worksheetData.push(['SETOR / FUNÇÃO', ...dateHeaders]);

    for (const sec of sections) {
      // Micro Section Banner
      worksheetData.push([`>>> ${sec.micro.name.toUpperCase()} <<<`, ...dates.map(() => '')]);

      for (const row of sec.rows) {
        const rowData = [row.functionName];
        for (const d of dates) {
          rowData.push(row.assignmentsByDate[d] || '-');
        }
        worksheetData.push(rowData);
      }
      worksheetData.push([]); // blank line between micros
    }

    const ws = XLSX.utils.aoa_to_sheet(worksheetData);

    // Auto-fit column widths
    const colWidths = [{ wch: 32 }, ...dates.map(() => ({ wch: 22 }))];
    ws['!cols'] = colWidths;

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Escala MEVAM Kids');

    const defaultName = filename || `Escala_MEVAM_Kids_${schedule.eventName || 'Geral'}.xlsx`;
    XLSX.writeFile(wb, defaultName);
  }

  /**
   * Exports to PDF matching high-contrast printable document
   */
  async exportToPDF(schedule: Schedule, selectedMicroIds?: string[], filename?: string): Promise<void> {
    const { sections, dates } = this.generateScheduleMatrix(schedule, selectedMicroIds);
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const logo = await this.loadLogo();

    const dateHeaders = dates.map((d) => formatDateBR(d));

    let currentY = 15;

    // Header Banner
    doc.setFillColor(30, 41, 59); // Slate 800
    doc.rect(10, currentY, 277, 18, 'F');

    if (logo) {
      let logoHeight = 11;
      let logoWidth = (logo.width / logo.height) * logoHeight;
      if (logoWidth > 60) {
        logoWidth = 60;
        logoHeight = (logo.height / logo.width) * logoWidth;
      }
      doc.addImage(logo.dataUrl, 'PNG', 14, currentY + 2, logoWidth, logoHeight);
    } else {
      // Fallback if the logo couldn't be loaded (e.g. offline export)
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text('MEVAM KIDS - ESCALA OFICIAL', 16, currentY + 8);
    }

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`${schedule.eventName || schedule.title} | Status: ${schedule.status}`, 16, currentY + 15.5);

    currentY += 24;

    const colWidth = 277 / (dates.length + 1);

    // Table Header
    doc.setFillColor(241, 245, 249); // Slate 100
    doc.rect(10, currentY, 277, 8, 'F');
    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('MICRO / FUNÇÃO', 14, currentY + 5.5);

    dates.forEach((_, idx) => {
      const x = 10 + colWidth * (idx + 1);
      doc.text(dateHeaders[idx], x + 4, currentY + 5.5);
    });

    currentY += 8;

    // Iterate sections
    for (const sec of sections) {
      if (currentY > 185) {
        doc.addPage();
        currentY = 15;
      }

      // Micro Header row
      doc.setFillColor(226, 232, 240); // Slate 200
      doc.rect(10, currentY, 277, 6, 'F');
      doc.setTextColor(30, 41, 59);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.text(`[ ${sec.micro.name.toUpperCase()} ]`, 14, currentY + 4.5);
      currentY += 6;

      for (const row of sec.rows) {
        if (currentY > 190) {
          doc.addPage();
          currentY = 15;
        }

        doc.setDrawColor(226, 232, 240);
        doc.line(10, currentY + 6, 287, currentY + 6);

        doc.setTextColor(51, 65, 85);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8.5);
        doc.text(row.functionName, 14, currentY + 4.5);

        dates.forEach((d, idx) => {
          const x = 10 + colWidth * (idx + 1);
          const name = row.assignmentsByDate[d] || '-';
          doc.text(name, x + 4, currentY + 4.5);
        });

        currentY += 6;
      }
      currentY += 2;
    }

    // Footer info
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184);
    doc.text(
      `Gerado automaticamente pelo Sistema MEVAM Kids em ${new Date().toLocaleDateString('pt-BR')} - Documento Oficial`,
      10,
      202
    );

    const defaultName = filename || `Escala_MEVAM_Kids_${schedule.eventName || 'Geral'}.pdf`;
    doc.save(defaultName);
  }
}

export const exportService = new ExportService();
