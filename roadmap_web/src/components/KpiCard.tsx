import type { ReactNode } from "react";

interface Props {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  icon?: ReactNode;
  accent?: string;
}

export function KpiCard({ label, value, hint, icon, accent }: Props) {
  return (
    <div className="card kpi" style={accent ? { borderTop: `3px solid ${accent}` } : undefined}>
      <div className="label">
        {icon}
        {label}
      </div>
      <div className="value num">{value}</div>
      {hint && <div className="hint">{hint}</div>}
    </div>
  );
}
