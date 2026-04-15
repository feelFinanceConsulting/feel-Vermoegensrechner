import { useState } from "react";
import { Button } from "@/components/ui/button";
import logoSrc from "@assets/feelFinance-Logo_1774449150084.png";
import headlineSrc from "@assets/Kopie_von_feel_Zinsen_1774449877387.png";
import SavingsCalculator from "@/components/savings-calculator";
import CalculationResults from "@/components/calculation-results";
import WithdrawalPlanning from "@/components/withdrawal-planning";
import ConsultationModal from "@/components/consultation-modal";
import { useCalculator } from "@/hooks/use-calculator";
import { calculateWithdrawal } from "@/lib/financial-calculations";
import { generatePDFReport } from "@/lib/pdf-export";
import { trackPDFExport } from "@/lib/analytics";
import { useToast } from "@/hooks/use-toast";
import { MessageCircle, Download, Loader2 } from "lucide-react";

const ORANGE = "#ee8246";
const BG = "#FCFAEE";

const FAQ_ITEMS = [
  {
    question: 'Was bedeuten die Anlagestrategien \u201Eausgewogen\u201C und \u201Edynamisch\u201C?',
    answer: (
      <div style={{ fontSize: 13, color: "#374151", lineHeight: 1.7 }}>
        <p style={{ margin: "0 0 8px" }}>
          Die beiden Strategien spiegeln die angestrebten Rendite- und Risikoprofile der Fonds{" "}
          <a href="https://dervermoegensverwalter.at/all-weather/" target="_blank" rel="noopener noreferrer" style={{ color: ORANGE, textDecoration: "underline" }}>der Vermögensverwalter</a>{" "}
          und{" "}
          <a href="https://dervermoegensverwalter.at/dynamisch/" target="_blank" rel="noopener noreferrer" style={{ color: ORANGE, textDecoration: "underline" }}>der Vermögensverwalter dynamisch</a>{" "}
          wider.
        </p>
        <p style={{ margin: "0 0 8px" }}>
          Sie richten sich an unterschiedliche Anlegertypen: Während die ausgewogene Strategie auf stabile Entwicklungen mit moderatem Risiko abzielt, verfolgt die dynamische Strategie höhere Renditechancen bei entsprechend stärkeren Schwankungen.
        </p>
        <p style={{ margin: "0 0 8px" }}>
          Jeder Mensch hat eine unterschiedliche Risikotoleranz. Welche Strategie am besten zu dir passt, hängt von deinen persönlichen Zielen und deinem Sicherheitsbedürfnis ab.
        </p>
        <p style={{ margin: 0 }}>
          Buche gerne eine persönliche Beratung, um dein individuelles Profil zu ermitteln:{" "}
          <a href="https://beratung.feelfinance.at/meetings/anton-maresch" target="_blank" rel="noopener noreferrer" style={{ color: ORANGE, textDecoration: "underline" }}>Jetzt Beratung buchen</a>
        </p>
      </div>
    ),
  },
  {
    question: "Wird die Inflation im Rechner berücksichtigt?",
    answer: (
      <div style={{ fontSize: 13, color: "#374151", lineHeight: 1.7 }}>
        <p style={{ margin: "0 0 8px" }}>
          Ja, du kannst die Option „inflationsbereinigt" aktivieren. In diesem Fall wird die Inflation in den Ergebnissen berücksichtigt.
        </p>
        <p style={{ margin: 0 }}>
          Weitere Details findest du in den Hinweisfeldern unterhalb der Berechnungen.
        </p>
      </div>
    ),
  },
  {
    question: "Werden Steuern im Rechner berücksichtigt?",
    answer: (
      <div style={{ fontSize: 13, color: "#374151", lineHeight: 1.7 }}>
        <p style={{ margin: 0 }}>
          Nein, die Kapitalertragsteuer (KESt) ist im Rechner nicht berücksichtigt. Diese fällt auf Erträge aus Kapitalvermögen an, wie z. B. Zinsen oder Gewinne aus Wertpapierverkäufen.
        </p>
      </div>
    ),
  },
  {
    question: "Sind Gebühren im Rechner bereits berücksichtigt?",
    answer: (
      <div style={{ fontSize: 13, color: "#374151", lineHeight: 1.7 }}>
        <p style={{ margin: "0 0 8px" }}>
          Ja, es werden Produktkosten in Höhe von 0,99 % p.a. berücksichtigt. Diese reduzieren die dargestellten Renditen entsprechend.
        </p>
        <p style={{ margin: "0 0 8px" }}>
          Die Kosten entsprechen der angestrebten Total Expense Ratio (TER) der beiden Fonds:{" "}
          <a href="https://dervermoegensverwalter.at/all-weather/" target="_blank" rel="noopener noreferrer" style={{ color: ORANGE, textDecoration: "underline" }}>der Vermögensverwalter</a>{" "}
          und{" "}
          <a href="https://dervermoegensverwalter.at/dynamisch/" target="_blank" rel="noopener noreferrer" style={{ color: ORANGE, textDecoration: "underline" }}>der Vermögensverwalter dynamisch</a>.
        </p>
        <p style={{ margin: 0 }}>
          Weitere Details zu den Berechnungsmethoden findest du im Info-Fenster (ℹ️) neben den Grafiken.
        </p>
      </div>
    ),
  },
  {
    question: "Wie verlässlich sind die Ergebnisse des Rechners?",
    answer: (
      <div style={{ fontSize: 13, color: "#374151", lineHeight: 1.7 }}>
        <p style={{ margin: "0 0 8px" }}>
          Die dargestellten Linien zeigen verschiedene mögliche Szenarien und dienen als Orientierung. Die tatsächliche Entwicklung kann davon deutlich abweichen.
        </p>
        <p style={{ margin: "0 0 8px" }}>
          Die Berechnungen basieren auf konservativen, repräsentativen Indexdaten der letzten 50 Jahre – nach Abzug von 0,99 % Kosten, jedoch ohne Berücksichtigung von Steuern.
        </p>
        <p style={{ margin: "0 0 8px" }}>
          Bitte beachte außerdem, dass kurzfristige Kursschwankungen im Rechner nicht im Detail dargestellt werden.
        </p>
        <p style={{ margin: 0 }}>
          Wichtig: Die Wertentwicklung der Vergangenheit ist keine Garantie für zukünftige Ergebnisse. Die tatsächliche Rendite kann erheblich von den dargestellten Szenarien abweichen.
        </p>
      </div>
    ),
  },
];

function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <div style={{ marginTop: 32, backgroundColor: "#fff", boxShadow: "0 4px 16px rgba(0,0,0,0.06)", padding: 24 }}>
      <h3 style={{ fontSize: 16, fontWeight: 700, color: "#374151", marginBottom: 16, margin: "0 0 16px" }}>
        Die häufigsten Fragen
      </h3>
      <div>
        {FAQ_ITEMS.map((item, index) => (
          <div key={index} style={{ borderBottom: index < FAQ_ITEMS.length - 1 ? "1px solid #f3f4f6" : "none" }}>
            <button
              onClick={() => setOpenIndex(openIndex === index ? null : index)}
              style={{
                width: "100%",
                textAlign: "left",
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: "14px 0",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
              }}
            >
              <span style={{ fontSize: 14, fontWeight: 600, color: openIndex === index ? ORANGE : "#374151" }}>
                {item.question}
              </span>
              <span style={{ color: ORANGE, fontSize: 18, fontWeight: 700, flexShrink: 0, lineHeight: 1 }}>
                {openIndex === index ? "−" : "+"}
              </span>
            </button>
            {openIndex === index && (
              <div style={{ paddingBottom: 14 }}>
                {item.answer}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Calculator() {
  const {
    inputs,
    calculationResult,
    withdrawalResult,
    expectedValue,
    isCalculating,
    savingsDirty,
    handleInputsChange,
    handleWithdrawalStartAgeChange,
    handleCalculate,
    setWithdrawalStrategy,
    setWithdrawalStartAge,
    setWithdrawalEndAge,
    setWithdrawalResult,
    setWithdrawalCustomMonthlyAmount,
  } = useCalculator();

  const { toast } = useToast();
  const [showConsultationModal, setShowConsultationModal] = useState(false);
  const [withdrawalChartEl, setWithdrawalChartEl] = useState<HTMLElement | null>(null);
  const [wealthChartEl, setWealthChartEl] = useState<HTMLDivElement | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  const handlePDFExport = async () => {
    if (isCalculating) {
      toast({
        title: "Berechnung läuft noch",
        description: "Bitte warte, bis die Berechnung abgeschlossen ist.",
        variant: "destructive",
      });
      return;
    }
    setIsExporting(true);
    try {
      await generatePDFReport(
        inputs,
        calculationResult!,
        withdrawalResult ?? undefined,
        wealthChartEl ?? undefined,
        withdrawalChartEl ?? undefined,
      );
      trackPDFExport();
    } catch {
      toast({
        title: "Export fehlgeschlagen",
        description: "Das PDF konnte nicht erstellt werden. Bitte versuche es erneut.",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="ff-main-page overflow-x-hidden" style={{ minHeight: "100vh", backgroundColor: BG, fontFamily: "Inter, sans-serif" }}>
      <style>{`
        .ff-main-page input,
        .ff-main-page select,
        .ff-main-page button:not(.ff-keep-round):not(.perzentilen-info-btn),
        .ff-main-page [class*="rounded"]:not(.ff-keep-round):not(.ff-keep-round *):not(.perzentilen-info-btn),
        .ff-main-page .recharts-wrapper,
        .ff-main-page .recharts-surface,
        .ff-main-page [class*="Card"],
        .ff-main-page [role="radiogroup"] label,
        .ff-main-page [data-state],
        .ff-main-page .backdrop-blur-\\[1px\\] {
          border-radius: 0 !important;
        }

        .ff-main-page .perzentilen-info-btn {
          border-radius: 9999px !important;
        }

        .ff-main-page .recharts-default-tooltip,
        .ff-main-page .recharts-tooltip-wrapper > div {
          border-radius: 0 !important;
        }

        .ff-results-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 24px;
        }
        @media (max-width: 768px) {
          .ff-results-grid {
            grid-template-columns: 1fr;
          }
        }

        .ff-result-wrap {
          container-type: inline-size;
        }

        .ff-result-wrap div[class*="text-center"] {
          min-width: 0;
        }

        .ff-result-wrap div[class*="grid"] div[class*="text-center"] p[class*="text-2xl"] {
          font-size: clamp(0.7rem, 4cqi, 1.5rem) !important;
          line-height: 1.3 !important;
          white-space: nowrap !important;
          overflow: visible !important;
        }

        @container (max-width: 400px) {
          .ff-result-wrap div[class*="grid"] div[class*="text-center"] p[class*="text-2xl"] {
            font-size: 0.8rem !important;
          }
        }

        @container (max-width: 280px) {
          .ff-result-wrap div[class*="grid"] div[class*="text-center"] p[class*="text-2xl"] {
            font-size: 0.7rem !important;
          }
        }

        .ff-main-page .recharts-tooltip-wrapper {
          max-width: 90vw !important;
        }

        .ff-main-page .recharts-default-tooltip {
          padding: 8px 10px !important;
          max-width: 90vw !important;
          box-sizing: border-box !important;
        }

        .ff-main-page .recharts-default-tooltip .recharts-tooltip-label {
          font-size: clamp(0.65rem, 1.8vw, 0.875rem) !important;
          margin-bottom: 4px !important;
        }

        .ff-main-page .recharts-default-tooltip .recharts-tooltip-item-list li,
        .ff-main-page .recharts-default-tooltip .recharts-tooltip-item {
          font-size: clamp(0.6rem, 1.6vw, 0.8rem) !important;
          padding: 1px 0 !important;
        }

        .ff-main-page .recharts-default-tooltip .recharts-tooltip-item-name,
        .ff-main-page .recharts-default-tooltip .recharts-tooltip-item-separator,
        .ff-main-page .recharts-default-tooltip .recharts-tooltip-item-value {
          font-size: clamp(0.6rem, 1.6vw, 0.8rem) !important;
        }

        @media (max-width: 500px) {
          .ff-main-page .recharts-default-tooltip {
            padding: 4px 6px !important;
          }
          .ff-main-page .recharts-default-tooltip .recharts-tooltip-item-name {
            max-width: 120px;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
            display: inline-block;
          }
        }

        @media (max-width: 768px) {
          .ff-result-wrap div[class*="grid"][class*="sm:grid-cols"] {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
      {/* Header – white bar */}
      <div style={{ backgroundColor: "#fff", borderBottom: "1px solid #e5e7eb", position: "sticky", top: 0, zIndex: 50 }}>
        <div className="px-4 sm:px-6" style={{ maxWidth: 1200, margin: "0 auto", paddingTop: 12, paddingBottom: 12, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <a href="https://feelfinance.at/" target="_blank" rel="noopener noreferrer" style={{ flexShrink: 0 }}>
            <img src={logoSrc} alt="feel FINANCE" style={{ height: 36, width: "auto" }} />
          </a>
          <a href="https://beratung.feelfinance.at/meetings/anton-maresch" target="_blank" rel="noopener noreferrer" style={{ flexShrink: 0 }}>
            <Button style={{ backgroundColor: ORANGE, color: "#fff", borderRadius: 0, fontWeight: 600, border: "none", whiteSpace: "nowrap" }}>
              BERATUNG BUCHEN
            </Button>
          </a>
        </div>
      </div>
      <div style={{ maxWidth: 1200, margin: "0 auto" }} className="px-4 py-6 sm:px-6 sm:py-10">

        {/* Page title */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <img src={headlineSrc} alt="feel Vermögensrechner" style={{ maxWidth: 860, width: "100%", height: "auto", margin: "0 auto 10px" }} />
          <p style={{ color: "#6b7280", marginTop: 0, fontSize: 16 }}>
            Plane deine finanzielle Zukunft mit unserem professionellen Spar- & Entnahme-Rechner.
          </p>
        </div>

        {/* Input card – white with shadow */}
        <div className="p-5 sm:p-8 mb-7" style={{ backgroundColor: "#fff", borderRadius: 0, boxShadow: "0 8px 32px rgba(0,0,0,0.10)" }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: "#1a1a1a", marginBottom: 20, marginTop: 0 }}>Deine Angaben</h2>
          <SavingsCalculator
            inputs={inputs}
            onChange={handleInputsChange}
            onCalculate={handleCalculate}
            isCalculating={isCalculating}
            layout="two-row"
            instanceId="main"
          />
        </div>

        {/* Results – two equal columns */}
        <div className="ff-results-grid">
          {calculationResult ? (
            <div className="min-w-0" style={{ backgroundColor: "#fff", borderRadius: 0, boxShadow: "0 8px 32px rgba(0,0,0,0.10)", overflow: "hidden", display: "flex", flexDirection: "column" }}>
              <div className="ff-result-wrap p-4 sm:p-6" style={{ flex: 1, minWidth: 0 }}>
                <CalculationResults
                  inputs={inputs}
                  result={calculationResult}
                  onConsultationClick={() => setShowConsultationModal(true)}
                  isDirty={savingsDirty}
                  isCalculating={isCalculating}
                  onRecalculate={() => handleCalculate()}
                  withdrawalResult={withdrawalResult ?? undefined}
                  withdrawalChartEl={withdrawalChartEl}
                  onWealthChartRef={(el) => setWealthChartEl(el)}
                />
              </div>
              <div style={{ height: 5, backgroundColor: ORANGE }} />
            </div>
          ) : (
            <div style={{ backgroundColor: "#fff", borderRadius: 0, boxShadow: "0 4px 16px rgba(0,0,0,0.06)", display: "flex", alignItems: "center", justifyContent: "center", minHeight: 200 }}>
              <p style={{ color: "#9ca3af", fontSize: 14 }}>Starte die Berechnung, um Ergebnisse zu sehen.</p>
            </div>
          )}

          {withdrawalResult && calculationResult && expectedValue > 0 ? (
            <div className="min-w-0" style={{ backgroundColor: "#fff", borderRadius: 0, boxShadow: "0 8px 32px rgba(0,0,0,0.10)", overflow: "hidden", display: "flex", flexDirection: "column" }}>
              <div className="ff-result-wrap p-4 sm:p-6" style={{ flex: 1, minWidth: 0 }}>
                <WithdrawalPlanning
                  result={withdrawalResult}
                  startingCapital={expectedValue}
                  inputs={inputs}
                  onStartAgeChange={handleWithdrawalStartAgeChange}
                  onChartRef={(el) => { setWithdrawalChartEl(el); }}
                  onStrategyChange={(strategy, startAge, endAge, customMonthlyAmount) => {
                    setWithdrawalStrategy(strategy);
                    setWithdrawalStartAge(startAge);
                    setWithdrawalEndAge(endAge);
                    if (strategy === 'custom') {
                      setWithdrawalCustomMonthlyAmount(customMonthlyAmount ?? 0);
                    }
                    const newResult = calculateWithdrawal(
                      expectedValue, strategy, startAge, endAge,
                      inputs.inflationAdjusted, inputs.strategy as "ausgewogen" | "dynamisch",
                      undefined, inputs.targetAge - inputs.currentAge,
                      customMonthlyAmount
                    );
                    setWithdrawalResult(newResult);
                  }}
                />
              </div>
              <div style={{ height: 5, backgroundColor: ORANGE }} />
            </div>
          ) : (
            <div style={{ backgroundColor: "#fff", borderRadius: 0, boxShadow: "0 4px 16px rgba(0,0,0,0.06)", display: "flex", alignItems: "center", justifyContent: "center", minHeight: 200 }}>
              <p style={{ color: "#9ca3af", fontSize: 14 }}>Entnahmeplanung erscheint nach der Berechnung.</p>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        {calculationResult && (
          <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Button
              className="w-full h-12 sm:h-11"
              style={{ backgroundColor: "#fbbf24", color: "#111827", fontWeight: 600, borderRadius: 0, border: "none", boxShadow: "0 4px 12px rgba(0,0,0,0.10)", textTransform: "uppercase", letterSpacing: 0.5 }}
              onClick={handlePDFExport}
              disabled={isExporting || isCalculating}
            >
              {isExporting ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  PDF wird erstellt...
                </>
              ) : (
                <>
                  <Download className="w-5 h-5 mr-2" />
                  PDF Export
                </>
              )}
            </Button>
            <a href="https://beratung.feelfinance.at/meetings/anton-maresch" target="_blank" rel="noopener noreferrer" className="flex">
              <Button className="w-full h-12 sm:h-11" style={{ backgroundColor: ORANGE, color: "#fff", fontWeight: 600, borderRadius: 0, border: "none", boxShadow: "0 4px 12px rgba(0,0,0,0.10)", textTransform: "uppercase", letterSpacing: 0.5 }}>
                <MessageCircle className="w-5 h-5 mr-2" />
                Jetzt Beratung buchen
              </Button>
            </a>
          </div>
        )}

        {/* Disclaimer */}
        <div style={{ marginTop: 32, backgroundColor: "#fff", borderRadius: 0, boxShadow: "0 4px 16px rgba(0,0,0,0.06)", padding: 24 }}>
          <h3 style={{ fontSize: 12, fontWeight: 600, color: "#374151", display: "flex", alignItems: "center", gap: 6, marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 }}>
            <MessageCircle size={14} style={{ color: ORANGE }} /> Wichtige Hinweise
          </h3>
          <p style={{ fontSize: 12, color: "#6b7280", lineHeight: 1.7, margin: "0 0 8px" }}>
            Die Renditenberechnung im Rechner beruht auf Annahmen basierend auf historischen Werten. Die Wertentwicklung in der Vergangenheit ist keine Garantie für die zukünftige Wertentwicklung. Die tatsächliche Rendite kann erheblich von den Schätzungen abweichen. Zwischenzeitliche Wertschwankungen sind aufgrund der Anlage an Kapitalmärkten zu erwarten.
          </p>
          <p style={{ fontSize: 12, color: "#6b7280", lineHeight: 1.7, margin: "0 0 8px" }}>
            Diese Übersicht basiert auf konservativen repräsentativen Indexdaten der letzten 50 Jahre, nach Abzug von 0,99% Produktkosten. Für „Dynamisch" rechnen wir mit 7% p.a. vor Produktkosten, für „Ausgewogen" rechnen wir mit 5% p.a. vor Produktkosten. Die KeSt wird nicht in den Berechnungen berücksichtigt. Es besteht eine geringe Wahrscheinlichkeit, dass die Performance außerhalb dieser Linien liegt.
          </p>
          <p style={{ fontSize: 12, color: "#6b7280", lineHeight: 1.7, margin: 0 }}>
            Die Berechnungen dienen ausschließlich der Veranschaulichung und stellen keine Anlageberatung dar. Für eine individuelle Beratung kontaktieren Sie uns gerne.
          </p>
        </div>

        {/* FAQ Section */}
        <FAQSection />
      </div>
      <ConsultationModal isOpen={showConsultationModal} onClose={() => setShowConsultationModal(false)} />
    </div>
  );
}
