import type { Priority } from "@/types/domain";

/** F7 : score de priorité restituable — chaque facteur, son poids et sa contribution. */
export function PriorityBreakdown({ priority }: { priority: Priority }) {
  return (
    <div className="stack" style={{ gap: 9 }}>
      {priority.factors.map((f) => {
        const pts = Math.round(f.weight * f.value * 100);
        return (
          <div key={f.key}>
            <div className="row small" style={{ justifyContent: "space-between" }}>
              <span>
                {f.label} <span className="muted">· poids {Math.round(f.weight * 100)} %</span>
              </span>
              <span className="num" style={{ fontWeight: 600 }}>+{pts}</span>
            </div>
            <div className="bar" style={{ marginTop: 4 }}>
              <span style={{ width: `${f.value * 100}%`, background: "var(--navy-600)" }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function ScorePill({ score }: { score: number }) {
  const bg = score >= 70 ? "var(--sev-critique)" : score >= 50 ? "var(--sev-elevee)" : score >= 35 ? "var(--sev-moyenne)" : "var(--sev-faible)";
  return (
    <span className="num" style={{ display: "inline-grid", placeItems: "center", minWidth: 38, height: 26, borderRadius: 7, background: bg, color: "#fff", fontWeight: 700, fontSize: 13 }}>
      {score}
    </span>
  );
}
