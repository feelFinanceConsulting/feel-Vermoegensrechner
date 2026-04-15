import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { CalculationResult, WithdrawalResult, CalculatorInputs } from '@/types/calculator';
import { formatCurrency } from './financial-calculations';

const ORANGE: [number, number, number] = [238, 130, 70];
const GRAY_DARK: [number, number, number] = [26, 26, 26];
const GRAY_MID: [number, number, number] = [108, 117, 125];
const RED_BG: [number, number, number] = [254, 242, 242];
const RED_TEXT: [number, number, number] = [185, 28, 28];
const ORANGE_BG: [number, number, number] = [255, 237, 213];
const ORANGE_TEXT: [number, number, number] = [194, 65, 12];
const GREEN_BG: [number, number, number] = [240, 253, 244];
const GREEN_TEXT: [number, number, number] = [21, 128, 61];
const GRAY_BG: [number, number, number] = [248, 249, 250];
const GREEN_VALUE: [number, number, number] = [21, 128, 61];

const MARGIN = 18;
const PAGE_W = 210;
const CONTENT_W = PAGE_W - 2 * MARGIN;

// Fixed column offsets for input rows (spec-compliant, no overlap)
const L_LABEL = MARGIN;
const L_VALUE = MARGIN + 42;
const R_LABEL = MARGIN + 105;
const R_VALUE = MARGIN + 147;
const MAX_L_VAL_W = R_LABEL - L_VALUE - 4; // max width of left value before right label
const MAX_R_VAL_W = PAGE_W - MARGIN - R_VALUE - 2; // max width of right value

function addFooter(doc: jsPDF, pageNum: number, totalPages: number) {
  const pageH = doc.internal.pageSize.getHeight();
  doc.setDrawColor(...ORANGE);
  doc.setLineWidth(0.5);
  doc.line(MARGIN, pageH - 16, PAGE_W - MARGIN, pageH - 16);
  doc.setFontSize(9);
  doc.setTextColor(...ORANGE);
  doc.setFont('helvetica', 'normal');
  doc.text('feelfinance.at', MARGIN, pageH - 9);
  doc.setTextColor(...GRAY_MID);
  doc.text(`Seite ${pageNum} / ${totalPages}`, PAGE_W / 2, pageH - 9, { align: 'center' });
  // Fix 4: changed right footer to office@feelfinance.at
  doc.text('office@feelfinance.at', PAGE_W - MARGIN, pageH - 9, { align: 'right' });
}

function addPageHeader(doc: jsPDF): number {
  let y = MARGIN;
  doc.setFontSize(20);
  doc.setTextColor(...ORANGE);
  doc.setFont('helvetica', 'bold');
  doc.text('feelfinance', MARGIN, y);
  doc.setFontSize(13);
  doc.setTextColor(...GRAY_DARK);
  doc.setFont('helvetica', 'normal');
  doc.text('Spar-Rechner – Auswertung', MARGIN + 40, y);
  doc.setFontSize(8.5);
  doc.setTextColor(...GRAY_MID);
  doc.text(`Erstellt am ${new Date().toLocaleDateString('de-AT')}`, PAGE_W - MARGIN, y, { align: 'right' });
  y += 5;
  doc.setDrawColor(...ORANGE);
  doc.setLineWidth(0.8);
  doc.line(MARGIN, y, PAGE_W - MARGIN, y);
  y += 7;
  return y;
}

function sectionTitle(doc: jsPDF, text: string, y: number): number {
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...ORANGE);
  doc.text(text, MARGIN, y);
  doc.setFont('helvetica', 'normal');
  return y + 7;
}

function resultBox(
  doc: jsPDF,
  x: number, y: number, w: number, h: number,
  bg: [number, number, number],
  labelColor: [number, number, number],
  valueColor: [number, number, number],
  labelText: string,
  valueText: string,
) {
  doc.setFillColor(...bg);
  doc.roundedRect(x, y, w, h, 2, 2, 'F');
  doc.setFontSize(8);
  doc.setTextColor(...labelColor);
  doc.setFont('helvetica', 'bold');
  doc.text(labelText, x + w / 2, y + 7, { align: 'center' });
  doc.setFontSize(12);
  doc.setTextColor(...valueColor);
  doc.setFont('helvetica', 'bold');
  doc.text(valueText, x + w / 2, y + 17, { align: 'center' });
  doc.setFont('helvetica', 'normal');
}

async function renderChartToCanvas(element: HTMLElement): Promise<HTMLCanvasElement> {
  const canvas = await html2canvas(element, {
    backgroundColor: '#ffffff',
    scale: 2,
    useCORS: true,
    logging: false,
    allowTaint: true,
  });
  if (!canvas || canvas.width === 0 || canvas.height === 0) {
    throw new Error('Chart konnte nicht gerendert werden');
  }
  return canvas;
}

// Renders the wealth chart without its internal Recharts legend.
// Targets the innermost chart element (.recharts-wrapper) so no surrounding
// UI is captured, and forcefully hides all legend DOM nodes before html2canvas runs.
async function renderChartWithoutInternalLegend(element: HTMLElement): Promise<HTMLCanvasElement> {
  const candidates = Array.from(
    element.querySelectorAll<HTMLElement>(
      '.recharts-default-legend, .recharts-legend-wrapper, .recharts-surface + ul'
    )
  );

  const originalStyles = candidates.map(el => ({
    el,
    display: el.style.display,
    visibility: el.style.visibility,
    height: el.style.height,
    overflow: el.style.overflow,
  }));

  candidates.forEach(el => {
    el.style.display = 'none';
    el.style.visibility = 'hidden';
    el.style.height = '0';
    el.style.overflow = 'hidden';
  });

  // Capture only the innermost chart area, not the full container with extra UI
  const chartRoot =
    element.querySelector<HTMLElement>('.recharts-wrapper') ||
    element.querySelector<HTMLElement>('.recharts-responsive-container') ||
    element;

  try {
    const canvas = await html2canvas(chartRoot, {
      backgroundColor: '#ffffff',
      scale: 2,
      useCORS: true,
      logging: false,
      allowTaint: true,
    });
    if (!canvas || canvas.width === 0 || canvas.height === 0) {
      throw new Error('Chart konnte nicht gerendert werden');
    }
    return canvas;
  } finally {
    originalStyles.forEach(({ el, display, visibility, height, overflow }) => {
      el.style.display = display;
      el.style.visibility = visibility;
      el.style.height = height;
      el.style.overflow = overflow;
    });
  }
}

function embedChart(
  doc: jsPDF,
  canvas: HTMLCanvasElement,
  y: number,
  maxH: number,
): number {
  const ratio = canvas.width / canvas.height;
  let w = CONTENT_W;
  let h = w / ratio;
  if (h > maxH) {
    h = maxH;
    w = h * ratio;
  }
  const cx = MARGIN + (CONTENT_W - w) / 2;
  const imgData = canvas.toDataURL('image/png');
  doc.addImage(imgData, 'PNG', cx, y, w, h);
  return y + h;
}

function addChartLegend(doc: jsPDF, y: number, items: { color: [number, number, number]; label: string }[]): number {
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  let lx = MARGIN;
  items.forEach(item => {
    doc.setFillColor(...item.color);
    doc.rect(lx, y - 2, 5, 3, 'F');
    doc.setTextColor(...GRAY_MID);
    const tw = doc.getTextWidth(item.label);
    doc.text(item.label, lx + 7, y + 0.5);
    lx += tw + 16;
    if (lx > PAGE_W - MARGIN - 30) {
      lx = MARGIN;
      y += 6;
    }
  });
  return y + 6;
}

// Fix 1: robust two-column input row that splits long values and prevents overlap
function addInputRow(
  doc: jsPDF,
  l1: string, v1: string,
  l2: string, v2: string,
  y: number,
): number {
  doc.setFontSize(10);

  // Left label
  doc.setTextColor(...GRAY_MID);
  doc.setFont('helvetica', 'normal');
  doc.text(l1, L_LABEL, y);

  // Left value – split if too wide
  const v1Lines = doc.splitTextToSize(v1, MAX_L_VAL_W);
  doc.setTextColor(...GRAY_DARK);
  doc.text(v1Lines, L_VALUE, y);

  const extraLines = Math.max(0, v1Lines.length - 1);

  if (l2) {
    // Right label
    doc.setTextColor(...GRAY_MID);
    doc.text(l2, R_LABEL, y);

    // Right value – split if too wide
    const v2Lines = doc.splitTextToSize(v2, MAX_R_VAL_W);
    doc.setTextColor(...GRAY_DARK);
    doc.text(v2Lines, R_VALUE, y);
  }

  return y + 6 + extraLines * 4.5;
}

export async function generatePDFReport(
  inputs: CalculatorInputs,
  calculationResult: CalculationResult,
  withdrawalResult?: WithdrawalResult,
  wealthChartRef?: HTMLElement | null,
  withdrawalChartRef?: HTMLElement | null,
): Promise<void> {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageH = doc.internal.pageSize.getHeight();
  const contentBottom = pageH - 20;

  // Wealth chart: use dedicated helper that hides all internal legend nodes and
  // captures only the innermost .recharts-wrapper element (no surrounding UI).
  // Withdrawal chart: plain capture, its legend is already rendered below via addChartLegend.
  const [wealthCanvas, withdrawalCanvas] = await Promise.all([
    wealthChartRef ? renderChartWithoutInternalLegend(wealthChartRef) : Promise.resolve(null),
    withdrawalChartRef ? renderChartToCanvas(withdrawalChartRef) : Promise.resolve(null),
  ]);

  const hasCharts = !!(wealthCanvas || withdrawalCanvas);
  // Page layout: 1 = data, 2 = charts (if any), 3 = disclaimer (if charts present)
  // If no charts, disclaimer is inline on page 1.
  const totalPages = hasCharts ? 3 : 1;

  // ─── PAGE 1: Inputs + Tiles + Summary + Withdrawal overview ───────────────
  let y = addPageHeader(doc);

  y = sectionTitle(doc, 'Ihre Eingaben', y);
  y = addInputRow(doc,
    'Aktuelles Alter', `${inputs.currentAge} Jahre`,
    'Zielalter', `${inputs.targetAge} Jahre`, y);
  y = addInputRow(doc,
    'Sparrate monatlich', formatCurrency(inputs.monthlyAmount),
    'Einmalbetrag', formatCurrency(inputs.oneTimeAmount), y);
  const strategyValue = inputs.strategy === 'dynamisch' ? 'Dynamisch (7% p.a.)' : 'Ausgewogen (5% p.a.)';
  y = addInputRow(doc,
    'Anlagestrategie', strategyValue,
    'Inflationsbereinigt', inputs.inflationAdjusted ? 'Ja' : 'Nein', y);
  if (inputs.annualIncrease > 0) {
    y = addInputRow(doc, 'Jährl. Sparratenerhöhung', `${inputs.annualIncrease}%`, '', '', y);
  }
  y += 3;

  if (inputs.goals && inputs.goals.length > 0) {
    y = sectionTitle(doc, 'Finanzielle Ziele', y);
    const goalLabels: Record<string, string> = {
      ausbildung: 'Ausbildung', auto: 'Auto', hochzeit: 'Hochzeit',
      immobilienkauf: 'Immobilienkauf', renovierung: 'Renovierung', sonstiges: 'Sonstiges',
    };
    inputs.goals.forEach(goal => {
      doc.setFontSize(10);
      doc.setTextColor(...GRAY_MID);
      doc.text(goalLabels[goal.type] || goal.type, MARGIN, y);
      doc.setTextColor(...GRAY_DARK);
      doc.text(`${formatCurrency(goal.amount)} – Jahr ${goal.year}`, MARGIN + 50, y);
      y += 6;
    });
    y += 3;
  }

  if (inputs.capitalInflows && inputs.capitalInflows.length > 0) {
    y = sectionTitle(doc, 'Zukünftige Vermögenszuflüsse', y);
    const inflowLabels: Record<string, string> = {
      immobilienverkauf: 'Immobilienverkauf', versicherung: 'Versicherung',
      erbschaft: 'Erbschaft', unternehmensverkauf: 'Unternehmensverkauf',
      staatliche_leistungen: 'Staatl. Leistungen', sonstige_einmalzahlung: 'Sonstige Einmalzahlung',
    };
    inputs.capitalInflows.forEach(inflow => {
      doc.setFontSize(10);
      doc.setTextColor(...GRAY_MID);
      doc.text(inflowLabels[inflow.type] || inflow.type, MARGIN, y);
      doc.setTextColor(...GRAY_DARK);
      doc.text(`${formatCurrency(inflow.amount)} – Jahr ${inflow.year}`, MARGIN + 60, y);
      y += 6;
    });
    y += 3;
  }

  // Result Tiles
  y = sectionTitle(doc, `Vermögen mit ${inputs.targetAge} Jahren`, y);
  const boxW = (CONTENT_W - 6) / 3;
  const boxH = 26;
  resultBox(doc, MARGIN, y, boxW, boxH, RED_BG, RED_TEXT, RED_TEXT,
    'Worst Case (5. Perzentil)', formatCurrency(calculationResult.worstCase));
  resultBox(doc, MARGIN + boxW + 3, y, boxW, boxH, ORANGE_BG, ORANGE_TEXT, ORANGE_TEXT,
    'Erwartetes Szenario', formatCurrency(calculationResult.median));
  resultBox(doc, MARGIN + 2 * (boxW + 3), y, boxW, boxH, GREEN_BG, GREEN_TEXT, GREEN_TEXT,
    'Optimistisches Szenario', formatCurrency(calculationResult.bestCase));
  y += boxH + 6;

  // Summary
  y = sectionTitle(doc, 'Zusammenfassung', y);
  const summaryRows: [string, string, string, string, boolean][] = [
    ['Einmalbetrag', formatCurrency(calculationResult.summary.oneTime),
     'Sparrate gesamt', formatCurrency(calculationResult.summary.totalMonthly), false],
    ['Gesamt eingezahlt', formatCurrency(calculationResult.summary.totalPaid),
     'Erwarteter Gewinn', `+${formatCurrency(calculationResult.summary.profit)}`, true],
  ];
  const summaryBlockH = summaryRows.length * 7 + 6;
  doc.setFillColor(...GRAY_BG);
  doc.rect(MARGIN, y - 2, CONTENT_W, summaryBlockH, 'F');
  y += 2;
  summaryRows.forEach(([l1, v1, l2, v2, isGreen]) => {
    doc.setFontSize(10);
    doc.setTextColor(...GRAY_MID);
    doc.text(l1, MARGIN + 3, y);
    doc.setTextColor(...GRAY_DARK);
    doc.setFont('helvetica', 'bold');
    doc.text(v1, L_VALUE, y);
    doc.setFont('helvetica', 'normal');
    if (l2) {
      doc.setTextColor(...GRAY_MID);
      doc.text(l2, R_LABEL, y);
      doc.setTextColor(...(isGreen ? GREEN_VALUE : GRAY_DARK));
      doc.setFont('helvetica', 'bold');
      doc.text(v2, R_VALUE, y);
      doc.setFont('helvetica', 'normal');
    }
    y += 7;
  });
  y += 8;

  // Withdrawal overview
  if (withdrawalResult) {
    const withdrawalEstH = 2 * 6 + 20;
    if (y + withdrawalEstH > contentBottom) {
      addFooter(doc, 1, totalPages);
      doc.addPage();
      y = addPageHeader(doc);
    }
    y = sectionTitle(doc, 'Entnahmeplanung – Überblick', y);
    const wRows: [string, string, string, string][] = [
      ['Monatliche Entnahme', formatCurrency(withdrawalResult.monthlyAmount),
       'Jährliche Entnahme', formatCurrency(withdrawalResult.annualAmount)],
      ['Entnahme-Zeitraum',
       `${withdrawalResult.endAge - withdrawalResult.startAge} Jahre (${withdrawalResult.startAge}–${withdrawalResult.endAge})`,
       'Strategie', withdrawalResult.strategy === '4percent' ? '4%-Regel' : 'Maximum'],
    ];
    wRows.forEach(([l1, v1, l2, v2]) => {
      y = addInputRow(doc, l1, v1, l2, v2, y);
    });
  }

  // Inline disclaimer when no charts exist (single-page export)
  if (!hasCharts) {
    if (y > contentBottom - 55) {
      doc.addPage();
      y = addPageHeader(doc);
    }
    y = sectionTitle(doc, 'Wichtige Hinweise', y);
    addDisclaimer(doc, y);
  }

  addFooter(doc, 1, totalPages);

  if (!hasCharts) {
    const filename = `feelfinance-sparrechner-${new Date().toISOString().split('T')[0]}.pdf`;
    doc.save(filename);
    return;
  }

  // ─── PAGE 2: Both charts side by side (stacked), each ~70 mm tall ──────────
  // Both wealth and withdrawal charts appear on this single page.
  // Internal legend of wealth chart was already hidden during renderChartToCanvas.
  const CHART_H = 70; // fixed height keeps both charts comfortably on one A4 page
  const LEGEND_H = 10; // approximate height of addChartLegend output
  const SECTION_GAP = 8;

  doc.addPage();
  let y2 = addPageHeader(doc);

  if (wealthCanvas) {
    y2 = sectionTitle(doc, 'Vermögensentwicklung', y2);
    y2 = embedChart(doc, wealthCanvas, y2, CHART_H);
    y2 += 4;
    y2 = addChartLegend(doc, y2, [
      { color: [238, 130, 70] as [number,number,number], label: 'Erwartetes Szenario' },
      { color: [16, 185, 129] as [number,number,number], label: 'Optimistisches Szenario (95. Pz.)' },
      { color: [239, 68, 68] as [number,number,number], label: 'Worst Case (5. Pz.)' },
      { color: [107, 114, 128] as [number,number,number], label: 'Eingezahlt' },
    ]);
    y2 += SECTION_GAP;
  }

  if (withdrawalCanvas) {
    y2 = sectionTitle(doc, 'Entnahmeplanung – Kapitalverlauf', y2);
    y2 = embedChart(doc, withdrawalCanvas, y2, CHART_H);
    y2 += 4;
    addChartLegend(doc, y2, [
      { color: [238, 130, 70] as [number,number,number], label: 'Median' },
      { color: [16, 185, 129] as [number,number,number], label: 'Best Case (95. Pz.)' },
      { color: [239, 68, 68] as [number,number,number], label: 'Worst Case (5. Pz.)' },
      { color: [107, 114, 128] as [number,number,number], label: 'Kumulativ entnommen' },
    ]);
  }

  // Suppress unused-variable warnings for layout constants used above
  void LEGEND_H;

  addFooter(doc, 2, totalPages);

  // ─── PAGE 3: Disclaimer ────────────────────────────────────────────────────
  doc.addPage();
  let y3 = addPageHeader(doc);
  y3 = sectionTitle(doc, 'Wichtige Hinweise', y3);
  addDisclaimer(doc, y3);
  addFooter(doc, 3, totalPages);

  const filename = `feelfinance-sparrechner-${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(filename);
}

function addDisclaimer(doc: jsPDF, y: number): void {
  doc.setFontSize(9);
  doc.setTextColor(...GRAY_MID);
  doc.setFont('helvetica', 'normal');
  // Fix 3: changed contact to office@feelfinance.at
  const text = `Die Renditenberechnung im Rechner beruht auf Annahmen basierend auf historischen Werten. Die Wertentwicklung in der Vergangenheit ist keine Garantie für die zukünftige Wertentwicklung. Die tatsächliche Rendite kann erheblich von den Schätzungen abweichen. Zwischenzeitliche Wertschwankungen sind aufgrund der Anlage an Kapitalmärkten zu erwarten.

Diese Übersicht basiert auf konservativen repräsentativen Indexdaten der letzten 50 Jahre, nach Abzug von 0,99% Produktkosten. Für „Dynamisch" rechnen wir mit 7% p.a. vor Produktkosten, für „Ausgewogen" rechnen wir mit 5% p.a. vor Produktkosten. Die KeSt wird nicht in den Berechnungen berücksichtigt. Es besteht eine geringe Wahrscheinlichkeit, dass die Performance außerhalb dieser Linien liegt.

Die Berechnungen dienen ausschließlich der Veranschaulichung und stellen keine Anlageberatung dar. Für eine individuelle Beratung wenden Sie sich gerne an uns: office@feelfinance.at`;
  const split = doc.splitTextToSize(text, CONTENT_W);
  doc.text(split, MARGIN, y);
}
