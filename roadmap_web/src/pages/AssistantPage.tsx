import { useEffect, useRef, useState, type ReactNode } from "react";
import { Bot, Lock, SendHorizontal } from "lucide-react";
import { api } from "@/api";
import { SeverityBadge } from "@/components/Badges";
import { useDefectDrawer } from "@/components/DefectDrawer";
import { ScorePill } from "@/components/PriorityBreakdown";
import { DEFECT_LABEL, fmtTnd } from "@/config/labels";
import { useSession } from "@/state/session";
import type { AssistantAnswer } from "@/types/domain";

type Msg = { role: "user"; text: string } | { role: "bot"; answer: AssistantAnswer } | { role: "pending" };

const SUGGESTIONS = [
  "Quels sont les 5 nids-de-poule les plus urgents ?",
  "Combien de défauts critiques au Centre-ville ?",
  "Quel budget pour les défauts de Bizerte Nord ?",
  "Défauts près d'une école ou d'un hôpital",
  "Quelles zones ne sont pas couvertes ?",
];

/** Rendu minimal du gras **…** renvoyé par l'assistant. */
function rich(text: string): ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*)/g).map((p, i) => (p.startsWith("**") ? <b key={i}>{p.slice(2, -2)}</b> : p));
}

export default function AssistantPage() {
  const { open } = useDefectDrawer();
  const { user } = useSession();
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight, behavior: "smooth" });
  }, [msgs]);

  async function send(q: string) {
    if (!q.trim()) return;
    setInput("");
    setMsgs((m) => [...m, { role: "user", text: q }, { role: "pending" }]);
    const answer = await api.ask(q);
    setMsgs((m) => [...m.filter((x) => x.role !== "pending"), { role: "bot", answer }]);
  }

  return (
    <div className="chat">
      <div className="chat-log" ref={logRef}>
        {msgs.length === 0 && (
          <div style={{ margin: "auto", textAlign: "center", maxWidth: 620 }}>
            <div style={{ width: 52, height: 52, borderRadius: 14, background: "var(--navy-700)", color: "#fff", display: "grid", placeItems: "center", margin: "0 auto 14px" }}>
              <Bot size={26} />
            </div>
            <h2 style={{ fontSize: 20 }}>Interrogez l'état du réseau en langage naturel</h2>
            <p className="muted">
              L'assistant répond uniquement à partir des données de la plateforme, via des fonctions de recherche déterministes. Chaque réponse
              affiche les appels effectués.
            </p>
            <div className="row small muted" style={{ justifyContent: "center", marginBottom: 16 }}>
              <Lock size={13} /> Réponses limitées à votre périmètre : {user?.scope?.label}
            </div>
            <div className="suggestions" style={{ justifyContent: "center" }}>
              {SUGGESTIONS.map((s) => <span key={s} className="chip" onClick={() => send(s)}>{s}</span>)}
            </div>
          </div>
        )}
        {msgs.map((m, i) =>
          m.role === "user" ? (
            <div key={i} className="msg user">{m.text}</div>
          ) : m.role === "pending" ? (
            <div key={i} className="msg bot"><div className="bubble muted">Recherche dans les données…</div></div>
          ) : (
            <div key={i} className="msg bot">
              <div className="bubble">
                <div>{rich(m.answer.text)}</div>
                <div className="calls">
                  {m.answer.calls.map((c, k) => (
                    <span key={k} className="call">{c.name}({Object.entries(c.args).map(([a, v]) => `${a}=${JSON.stringify(v)}`).join(", ")})</span>
                  ))}
                </div>
                {m.answer.defects && m.answer.defects.length > 0 && (
                  <table className="table" style={{ marginTop: 12, border: "1px solid var(--line)", borderRadius: 8 }}>
                    <tbody>
                      {m.answer.defects.map((d) => (
                        <tr key={d.id} className="clickable" onClick={() => open(d.id)}>
                          <td style={{ width: 46 }}><ScorePill score={d.priority.score} /></td>
                          <td><b>{DEFECT_LABEL[d.type]}</b><div className="small muted">{d.id} · {d.roadName} · {d.district}</div></td>
                          <td><SeverityBadge severity={d.severity} /></td>
                          <td className="num" style={{ textAlign: "right" }}>{fmtTnd(d.cost.amountTnd)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          ),
        )}
      </div>
      <form className="chat-input" onSubmit={(e) => (e.preventDefault(), send(input))}>
        <input className="input" placeholder="Ex. : quels nids-de-poule critiques à Zarzouna ?" value={input} onChange={(e) => setInput(e.target.value)} />
        <button className="btn primary" type="submit"><SendHorizontal size={16} /> Envoyer</button>
      </form>
    </div>
  );
}
