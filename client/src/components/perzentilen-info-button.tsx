import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Info } from "lucide-react";

interface PercentilenInfoButtonProps {
  variant?: "vermoegen" | "kapital";
}

export default function PercentilenInfoButton({ variant = "kapital" }: PercentilenInfoButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="ml-2 inline-flex items-center justify-center w-5 h-5 rounded-full bg-gray-200 hover:bg-gray-300 text-gray-600 hover:text-gray-800 transition-colors flex-shrink-0 perzentilen-info-btn design2-keep-round"
        aria-label="Erklärung zu Perzentilen anzeigen"
      >
        <Info className="w-3 h-3" />
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          {variant === "vermoegen" ? (
            <>
              <DialogHeader>
                <DialogTitle className="font-bold text-base leading-snug">
                  Was bedeuten die verschiedenen Szenarien und die erwartete Entwicklung?
                </DialogTitle>
              </DialogHeader>

              <p className="text-sm text-gray-700 mt-2">
                Die dargestellten Szenarien zeigen dir, wie sich dein Vermögen unter unterschiedlichen Marktbedingungen entwickeln kann – von einem schwachen Verlauf bis hin zu einem sehr positiven Szenario. So erhältst du ein realistisches Bild möglicher Entwicklungen.
              </p>

              <div className="mt-4 space-y-4 text-sm text-gray-700">
                <div>
                  <p className="font-semibold underline">Worst Case (5% Wahrscheinlichkeit)</p>
                  <p className="mt-1">
                    Diese Linie basiert auf dem VaR 5. Perzentil und zeigt ein negatives, aber realistisches Szenario: In nur 5 von 100 Fällen fällt die Entwicklung schlechter aus. Sie gibt dir eine Orientierung, mit welchem Vermögen du auch dann rechnen kannst, wenn die Märkte über längere Zeit unterdurchschnittlich verlaufen.
                  </p>
                </div>

                <div>
                  <p className="font-semibold underline">Optimistisches Szenario:</p>
                  <p className="mt-1">
                    Dieses Szenario zeigt eine überdurchschnittlich positive Entwicklung auf Basis einer konstanten jährlichen Rendite:
                  </p>
                  <ul className="list-disc list-inside mt-1 space-y-1">
                    <li>Ausgewogene Strategie: 6 % p.a. Rendite abzüglich 0,99 % Produktkosten</li>
                    <li>Dynamische Strategie: 9 % p.a. Rendite abzüglich 0,99 % Produktkosten</li>
                  </ul>
                </div>

                <div>
                  <p className="font-semibold underline">Erwartungswert</p>
                  <p className="mt-1">
                    Die erwartete Entwicklung entspricht dem durchschnittlich zu erwartenden Verlauf und dient als zentrale Orientierung:
                  </p>
                  <ul className="list-disc list-inside mt-1 space-y-1">
                    <li>Ausgewogene Strategie: 5 % p.a. Rendite abzüglich 0,99 % Produktkosten</li>
                    <li>Dynamische Strategie: 7 % p.a. Rendite abzüglich 0,99 % Produktkosten</li>
                  </ul>
                  <p className="mt-1">
                    Sie zeigt, wo dein Vermögen im Mittel liegen könnte, ohne eine Garantie darzustellen.
                  </p>
                </div>

                <div>
                  <p className="font-semibold underline">Zusammengefasst</p>
                  <p className="mt-1">
                    Die Bandbreite zwischen dem schwachen und dem optimistischen Szenario zeigt dir, wie unterschiedlich sich Kapitalmärkte entwickeln können. Genau deshalb ist es wichtig, nicht nur mit einem einzelnen Wert zu planen, sondern verschiedene Szenarien zu berücksichtigen.
                  </p>
                </div>
              </div>
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle className="font-bold text-base leading-snug">
                  Was bedeuten das 5. und 95. Perzentil sowie der Erwartungswert?
                </DialogTitle>
              </DialogHeader>

              <p className="text-sm text-gray-700 mt-2">
                Das 5. und 95. Perzentil zeigen dir, in welchem Bereich sich deine
                möglichen Renditen mit hoher Wahrscheinlichkeit bewegen. Der
                Erwartungswert ergänzt diese Bandbreite um einen durchschnittlichen
                Orientierungswert.
              </p>

              <div className="mt-4 space-y-4 text-sm text-gray-700">
                <div>
                  <p className="font-semibold underline">5. Perzentil</p>
                  <p className="mt-1">
                    Das 5. Perzentil beschreibt ein pessimistisches Szenario: In nur
                    5 von 100 simulierten Fällen fällt das Ergebnis schlechter aus.
                    Es zeigt dir, mit welchem Vermögen du auch dann rechnen kannst,
                    wenn die Märkte über einen langen Zeitraum unterdurchschnittlich
                    abschneiden.
                  </p>
                </div>

                <div>
                  <p className="font-semibold underline">95. Perzentil</p>
                  <p className="mt-1">
                    Das 95. Perzentil beschreibt ein optimistisches Szenario: Nur in
                    5 von 100 Fällen fällt das Ergebnis besser aus. Es zeigt das
                    obere Ende der realistisch erreichbaren Bandbreite – bei
                    überdurchschnittlich guten Marktphasen.
                  </p>
                </div>

                <div>
                  <p className="font-semibold underline">Erwartungswert</p>
                  <p className="mt-1">
                    Der Erwartungswert entspricht dem mittleren Ergebnis über alle
                    simulierten Szenarien. Er spiegelt wider, was du im Schnitt
                    erwarten kannst – weder im besten noch im schlechtesten Fall,
                    sondern als realistischer Mittelwert.
                  </p>
                </div>

                <div>
                  <p className="font-semibold underline">Zusammengefasst</p>
                  <p className="mt-1">
                    Die Bandbreite zwischen dem 5. und 95. Perzentil zeigt dir, wie
                    stark die Unsicherheit bei langfristigen Kapitalmarktanlagen
                    sein kann – und wie wichtig es ist, mit verschiedenen Szenarien
                    zu planen.
                  </p>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
