import type { VisualType } from "../lib/contentTypes";

type ProfessionVisualProps = {
  visualType?: VisualType;
  compact?: boolean;
};

const labels: Record<VisualType, string> = {
  frontend: "UI",
  backend: "API",
  fullstack: "FS",
  qa: "QA",
  ux: "UX",
  data: "DATA",
  ai: "AI",
  cybersecurity: "SEC",
  devops: "OPS",
  sysadmin: "SYS",
  database: "DB",
  network: "NET",
  embedded: "CHIP",
  gamedev: "GAME",
  manager: "PM",
  general: "IT",
};

export function ProfessionVisual({ visualType = "general", compact = false }: ProfessionVisualProps) {
  return (
    <div className={`profession-visual profession-visual-${visualType} ${compact ? "compact" : ""}`} aria-hidden="true">
      <div className="visual-glow" />
      <div className="visual-particles">
        <span />
        <span />
        <span />
      </div>
      <svg viewBox="0 0 320 190" role="img">
        <defs>
          <linearGradient id={`pv-line-${visualType}`} x1="0" x2="1" y1="0" y2="1">
            <stop offset="0%" stopColor="#67e8f9" />
            <stop offset="55%" stopColor="#60a5fa" />
            <stop offset="100%" stopColor="#a78bfa" />
          </linearGradient>
        </defs>
        <rect className="visual-panel" x="18" y="18" width="284" height="154" rx="26" />
        <VisualShape visualType={visualType} />
        <text className="visual-label" x="160" y="166" textAnchor="middle">
          {labels[visualType]}
        </text>
      </svg>
    </div>
  );
}

function VisualShape({ visualType }: { visualType: VisualType }) {
  switch (visualType) {
    case "frontend":
      return (
        <>
          <rect className="visual-card" x="52" y="48" width="92" height="62" rx="12" />
          <rect className="visual-card alt" x="164" y="44" width="92" height="72" rx="12" />
          <path className="visual-line" d="M68 68h48M68 84h34M180 66h54M180 86h38" />
        </>
      );
    case "backend":
      return (
        <>
          <rect className="visual-card" x="62" y="50" width="70" height="78" rx="12" />
          <rect className="visual-card alt" x="188" y="50" width="70" height="78" rx="12" />
          <path className="visual-line" d="M132 72h56M132 106h56M96 72h1M224 106h1" />
          <circle className="visual-node" cx="160" cy="72" r="8" />
          <circle className="visual-node" cx="160" cy="106" r="8" />
        </>
      );
    case "fullstack":
      return (
        <>
          <rect className="visual-card" x="48" y="54" width="82" height="64" rx="12" />
          <rect className="visual-card alt" x="190" y="54" width="82" height="64" rx="12" />
          <path className="visual-line" d="M130 86h60M86 74h26M208 76h42M208 96h30" />
          <circle className="visual-node" cx="160" cy="86" r="10" />
        </>
      );
    case "qa":
      return (
        <>
          <rect className="visual-card" x="58" y="44" width="120" height="88" rx="14" />
          <path className="visual-line" d="M82 70l10 10 22-28M82 102l10 10 22-28M196 74h48M196 102h34" />
          <circle className="visual-node" cx="226" cy="58" r="16" />
        </>
      );
    case "ux":
      return (
        <>
          <rect className="visual-card" x="50" y="48" width="88" height="78" rx="12" />
          <rect className="visual-card alt" x="156" y="48" width="112" height="78" rx="12" />
          <path className="visual-line" d="M68 70h48M68 92h28M178 70h66M178 94h44M220 108l28 22" />
        </>
      );
    case "data":
      return (
        <>
          <rect className="visual-card" x="54" y="50" width="210" height="82" rx="14" />
          <path className="visual-line" d="M80 112V82M120 112V68M160 112V92M200 112V60M240 112V78" />
          <path className="visual-line alt" d="M78 104c32-22 58-6 82-28s54-20 84-4" />
        </>
      );
    case "ai":
      return (
        <>
          <rect className="visual-card" x="130" y="58" width="60" height="52" rx="14" />
          <path className="visual-line" d="M116 70h-30M116 98h-30M204 70h30M204 98h30M132 84h56" />
          {[86, 116, 204, 234].map((x, i) => <circle key={i} className="visual-node" cx={x} cy={i % 2 ? 98 : 70} r="8" />)}
        </>
      );
    case "cybersecurity":
      return (
        <>
          <path className="visual-card" d="M160 42l70 26c-6 58-28 86-70 102-42-16-64-44-70-102l70-26Z" />
          <rect className="visual-card alt" x="132" y="88" width="56" height="44" rx="10" />
          <path className="visual-line" d="M144 88v-14c0-20 32-20 32 0v14" />
        </>
      );
    case "devops":
      return (
        <>
          <path className="visual-line" d="M70 88h54l18-24h56l20 24h34" />
          <rect className="visual-card" x="54" y="66" width="54" height="44" rx="12" />
          <rect className="visual-card alt" x="136" y="44" width="54" height="44" rx="12" />
          <rect className="visual-card" x="218" y="66" width="54" height="44" rx="12" />
        </>
      );
    case "sysadmin":
      return (
        <>
          <rect className="visual-card" x="62" y="48" width="196" height="90" rx="14" />
          <path className="visual-line" d="M84 76l18 16-18 16M116 108h42M188 76h40M188 96h28" />
        </>
      );
    case "database":
      return (
        <>
          <ellipse className="visual-card" cx="160" cy="58" rx="72" ry="22" />
          <path className="visual-card" d="M88 58v58c0 12 32 22 72 22s72-10 72-22V58" />
          <path className="visual-line" d="M88 88c0 12 32 22 72 22s72-10 72-22" />
        </>
      );
    case "network":
      return (
        <>
          <path className="visual-line" d="M88 92h60l44-34M148 92l44 34M192 58h44M192 126h44" />
          {[88, 148, 192, 236, 236].map((x, i) => <circle key={i} className="visual-node" cx={x} cy={[92, 92, 58, 58, 126][i]} r="12" />)}
        </>
      );
    case "embedded":
      return (
        <>
          <rect className="visual-card" x="104" y="48" width="112" height="88" rx="16" />
          <rect className="visual-card alt" x="134" y="72" width="52" height="40" rx="10" />
          <path className="visual-line" d="M104 70H70M104 94H70M216 70h34M216 94h34M138 48V28M182 48V28M138 136v24M182 136v24" />
        </>
      );
    case "gamedev":
      return (
        <>
          <path className="visual-card" d="M82 82c8-28 148-28 156 0l18 44c6 16-10 28-24 18l-28-20h-88l-28 20c-14 10-30-2-24-18l18-44Z" />
          <path className="visual-line" d="M112 100h34M129 84v34M202 92h1M224 108h1" />
        </>
      );
    case "manager":
      return (
        <>
          <rect className="visual-card" x="58" y="48" width="58" height="90" rx="12" />
          <rect className="visual-card alt" x="132" y="48" width="58" height="90" rx="12" />
          <rect className="visual-card" x="206" y="48" width="58" height="90" rx="12" />
          <path className="visual-line" d="M72 74h30M146 84h30M220 68h30M72 108h22M146 116h26M220 102h22" />
        </>
      );
    default:
      return (
        <>
          <path className="visual-line" d="M72 72h176M72 106h176M108 42v96M160 42v96M212 42v96" />
          <circle className="visual-node" cx="108" cy="72" r="10" />
          <circle className="visual-node" cx="160" cy="106" r="10" />
          <circle className="visual-node" cx="212" cy="72" r="10" />
        </>
      );
  }
}
