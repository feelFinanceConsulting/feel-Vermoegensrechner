import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Info } from "lucide-react";

const ORANGE = "#ee8246";

export default function AnlagestrategieInfoButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="ml-2 inline-flex items-center justify-center w-5 h-5 rounded-full bg-gray-200 hover:bg-gray-300 text-gray-600 hover:text-gray-800 transition-colors flex-shrink-0 perzentilen-info-btn design2-keep-round"
        aria-label="Erklärung zu Anlagestrategien anzeigen"
      >
        <Info className="w-3 h-3" />
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-bold text-base leading-snug">
              Was bedeuten die Anlagestrategien ausgewogen und dynamisch?
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3 text-sm text-gray-700 mt-2">
            <p>
              Die beiden Strategien spiegeln die angestrebten Rendite- und Risikoprofile der Fonds{" "}
              <a
                href="https://dervermoegensverwalter.at/all-weather/"
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: ORANGE, textDecoration: "underline" }}
              >
                der Vermögensverwalter
              </a>{" "}
              und{" "}
              <a
                href="https://dervermoegensverwalter.at/dynamisch/"
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: ORANGE, textDecoration: "underline" }}
              >
                der Vermögensverwalter dynamisch
              </a>{" "}
              wider.
            </p>
            <p>
              Sie richten sich an unterschiedliche Anlegertypen: Während die ausgewogene Strategie auf stabile Entwicklungen mit moderatem Risiko abzielt, verfolgt die dynamische Strategie höhere Renditechancen bei entsprechend stärkeren Schwankungen.
            </p>
            <p>
              Jeder Mensch hat eine unterschiedliche Risikotoleranz. Welche Strategie am besten zu dir passt, hängt von deinen persönlichen Zielen und deinem Sicherheitsbedürfnis ab.
            </p>
            <p>
              Buche gerne eine persönliche Beratung, um dein individuelles Profil zu ermitteln:{" "}
              <a
                href="https://beratung.feelfinance.at/meetings/anton-maresch"
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: ORANGE, textDecoration: "underline" }}
              >
                Jetzt Beratung buchen
              </a>
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
