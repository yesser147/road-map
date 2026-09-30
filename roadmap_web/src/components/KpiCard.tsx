import type { CSSProperties, ReactNode } from "react";

interface Props {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  icon?: ReactNode;
  /** Couleur de la catégorie (variable CSS) : teinte la pastille d'icône. */
  accent?: string;
}

export function KpiCard({ label, value, hint, icon, accent }: Props) {
  return (
    <div className="card kpi" style={accent ? ({ "--kpi": accent } as CSSProperties) : undefined}>
      <div className="label">
        {icon && <span className="kpi-icon">{icon}</span>}
        {label}
      </div>
      <div className="value num">{value}</div>
      {hint && <div className="hint">{hint}</div>}
    </div>
  );
}
