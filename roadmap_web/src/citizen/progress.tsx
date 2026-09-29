import { CheckCircle2, CircleDashed, XCircle } from "lucide-react";
import type { MyReport, ReportProgress } from "@/types/domain";

const STEPS: { key: ReportProgress; label: string }[] = [
  { key: "verification", label: "Vérification" },
  { key: "pris_en_charge", label: "Pris en charge" },
  { key: "travaux", label: "Travaux" },
  { key: "repare", label: "Réparé" },
];

/** Avancement d'un signalement vu par le citoyen. */
export function ProgressSteps({ item }: { item: MyReport }) {
  if (item.progress === "non_retenu") {
    return (
      <div className="row small" style={{ color: "var(--sev-critique)", gap: 6 }}>
        <XCircle size={15} /> {item.progressLabel}
      </div>
    );
  }
  const idx = STEPS.findIndex((s) => s.key === item.progress);
  return (
    <div>
      <div className="cz-steps">
        {STEPS.map((s, i) => (
          <div key={s.key} className={`cz-step ${i < idx ? "done" : ""} ${i === idx ? "current" : ""}`}>
            {i < idx ? <CheckCircle2 size={15} /> : i === idx ? <CircleDashed size={15} /> : <span className="pip" />}
            <span>{s.label}</span>
          </div>
        ))}
      </div>
      <div className="small" style={{ marginTop: 6, color: "var(--ink-2)" }}>{item.progressLabel}</div>
    </div>
  );
}
