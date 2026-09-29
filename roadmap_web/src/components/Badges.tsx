import { SEVERITY_COLOR, SEVERITY_LABEL, SOURCE_LABEL, STATUS_LABEL } from "@/config/labels";
import type { DefectStatus, Severity, Source } from "@/types/domain";
import { Camera, Footprints, MessageSquareText, Truck } from "lucide-react";

export function SeverityBadge({ severity }: { severity: Severity }) {
  return (
    <span className={`badge sev-${severity}`}>
      <span className="dot" style={{ background: SEVERITY_COLOR[severity] }} />
      {SEVERITY_LABEL[severity]}
    </span>
  );
}

const STATUS_TONE: Record<DefectStatus, string> = {
  detecte: "warn",
  valide: "info",
  planifie: "info",
  en_cours: "info",
  repare: "sev-faible",
  verifie: "sev-faible",
};

export function StatusBadge({ status }: { status: DefectStatus }) {
  return <span className={`badge ${STATUS_TONE[status]}`}>{STATUS_LABEL[status]}</span>;
}

const SOURCE_ICON = { vehicule: Truck, pieton: Footprints, citoyen_photo: Camera, citoyen_sms: MessageSquareText };

export function SourceTag({ source }: { source: Source }) {
  const Icon = SOURCE_ICON[source];
  return (
    <span className="row small muted" style={{ gap: 5 }}>
      <Icon size={13} /> {SOURCE_LABEL[source]}
    </span>
  );
}
