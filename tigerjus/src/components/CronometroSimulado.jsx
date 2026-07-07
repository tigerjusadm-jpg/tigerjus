'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * CronometroSimulado — contador premium do Simulado OAB (TigerJus)
 * ---------------------------------------------------------------------------
 * Substitui APENAS o visual do cronômetro. Não altera nenhuma regra do simulado.
 *
 * ┌─ MODO CONTROLADO (recomendado) ─ mantém 100% da SUA lógica atual ─────────┐
 * │  Você continua controlando a contagem; o componente só desenha.            │
 * │                                                                            │
 * │  <CronometroSimulado                                                       │
 * │    segundosRestantes={segundosRestantes}       // vem da sua lógica        │
 * │    duracaoTotalSegundos={duracaoTotalSegundos} // duração total do simulado│
 * │  />                                                                         │
 * └────────────────────────────────────────────────────────────────────────────┘
 *
 * ┌─ MODO AUTÔNOMO ─ o componente conta o tempo sozinho ──────────────────────┐
 * │  <CronometroSimulado                                                       │
 * │    duracaoTotalSegundos={10800}   // ex.: 3 h                              │
 * │    autoIniciar                                                             │
 * │    onTempoEsgotado={() => finalizarSimulado()}                            │
 * │  />                                                                        │
 * └────────────────────────────────────────────────────────────────────────────┘
 *
 * Props:
 *  - segundosRestantes    (number)  Se informado → modo controlado (sua lógica manda).
 *  - duracaoTotalSegundos (number)  Duração total, em segundos (default 10800 = 3 h).
 *  - autoIniciar          (boolean) Só no modo autônomo. Default true.
 *  - onTempoEsgotado      (fn)      Disparado uma única vez quando o tempo chega a 0.
 *  - className / style     Encaminhados ao cartão externo, se precisar ajustar.
 */

const STOPS = [
  { p: 0.0, cor: [0xe5, 0x34, 0x2a] }, // vermelho  — tempo crítico
  { p: 0.27, cor: [0xef, 0x7e, 0x1e] }, // laranja
  { p: 0.52, cor: [0xf5, 0xc2, 0x18] }, // amarelo
  { p: 0.76, cor: [0xa6, 0xcb, 0x3a] }, // verde-limão
  { p: 1.0, cor: [0x46, 0xae, 0x45] }, // verde     — início
];

function corNaFracao(f) {
  const x = Math.max(0, Math.min(1, f));
  for (let i = 1; i < STOPS.length; i++) {
    if (x <= STOPS[i].p) {
      const a = STOPS[i - 1];
      const b = STOPS[i];
      const t = (x - a.p) / (b.p - a.p || 1);
      const c = a.cor.map((v, k) => Math.round(v + (b.cor[k] - v) * t));
      return `rgb(${c[0]}, ${c[1]}, ${c[2]})`;
    }
  }
  const c = STOPS[STOPS.length - 1].cor;
  return `rgb(${c[0]}, ${c[1]}, ${c[2]})`;
}

function formatarTempo(totalSeg, mostrarHoras) {
  const s = Math.max(0, Math.floor(totalSeg));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const seg = s % 60;
  const pad = (n) => String(n).padStart(2, '0');
  return mostrarHoras
    ? `${pad(h)}:${pad(m)}:${pad(seg)}`
    : `${pad(m)}:${pad(seg)}`;
}

const CSS = `
.tjc{box-sizing:border-box;width:100%;max-width:820px;margin:0 auto;
  background:#fff;border:1px solid #eef0f4;border-radius:24px;
  padding:28px 32px 24px;
  box-shadow:0 20px 44px -28px rgba(20,30,60,.4);
  font-family:'Inter',system-ui,-apple-system,'Segoe UI',Roboto,Arial,sans-serif;}
.tjc *{box-sizing:border-box;}
.tjc__top{display:flex;align-items:center;justify-content:space-between;gap:16px;margin-bottom:26px;}
.tjc__label{display:flex;align-items:center;gap:10px;color:#64748b;font-weight:700;
  letter-spacing:.14em;font-size:15px;text-transform:uppercase;}
.tjc__label svg{width:26px;height:26px;flex:none;}
.tjc__time{font-variant-numeric:tabular-nums;font-weight:800;
  font-size:clamp(38px,7vw,60px);line-height:1;letter-spacing:.01em;
  color:#1e2a44;transition:color .4s ease;white-space:nowrap;}
.tjc__time--crit{color:#e23b2e;animation:tjc-pulse 1.15s ease-in-out infinite;}
.tjc__ends{display:flex;justify-content:space-between;padding:0 2px;margin-bottom:8px;
  font-size:14px;font-weight:600;}
.tjc__ends .c{color:#e23b2e;}
.tjc__ends .i{color:#3fa535;}
.tjc__track{position:relative;height:34px;border-radius:999px;padding:6px;background:#fff;
  box-shadow:0 8px 20px -10px rgba(20,30,60,.35),inset 0 0 0 1px rgba(20,30,60,.05);}
.tjc__grad{height:100%;width:100%;border-radius:999px;
  background:linear-gradient(90deg,#e5342a 0%,#ef7e1e 27%,#f5c218 52%,#a6cb3a 76%,#46ae45 100%);}
.tjc__rail{position:absolute;left:6px;right:6px;top:6px;bottom:6px;}
.tjc__knob{position:absolute;top:50%;width:52px;height:52px;
  transform:translate(-50%,-50%);transition:left .9s cubic-bezier(.4,.9,.3,1);}
.tjc__knob-outer{width:100%;height:100%;border-radius:50%;background:#fff;
  box-shadow:0 6px 16px -4px rgba(20,30,60,.4);
  display:flex;align-items:center;justify-content:center;}
.tjc__knob-ring{width:36px;height:36px;border-radius:50%;background:#fff;
  border:7px solid #46ae45;transition:border-color .6s ease;}
.tjc__knob--crit .tjc__knob-outer{animation:tjc-glow 1.15s ease-in-out infinite;}
.tjc__ticks{position:relative;margin:4px 6px 0;height:76px;}
.tjc__tick{position:absolute;top:0;transform:translateX(-50%);
  display:flex;flex-direction:column;align-items:center;}
.tjc__tick-line{width:1px;height:26px;border-left:1px dashed #cbd5e1;}
.tjc__tick-dot{width:9px;height:9px;border-radius:50%;background:#475569;margin-top:2px;}
.tjc__tick-pct{font-weight:800;font-size:17px;margin-top:8px;}
.tjc__tick-time{font-variant-numeric:tabular-nums;color:#64748b;font-size:13.5px;
  margin-top:2px;white-space:nowrap;}
@keyframes tjc-pulse{50%{opacity:.55;}}
@keyframes tjc-glow{0%,100%{box-shadow:0 6px 16px -4px rgba(226,59,46,.5);}
  50%{box-shadow:0 0 0 8px rgba(226,59,46,.14),0 6px 16px -4px rgba(226,59,46,.55);}}
@media (max-width:560px){
  .tjc{padding:20px;}
  .tjc__label{font-size:12px;letter-spacing:.1em;}
  .tjc__label svg{width:20px;height:20px;}
  .tjc__knob{width:42px;height:42px;}
  .tjc__knob-ring{width:28px;height:28px;border-width:6px;}
  .tjc__tick-pct{font-size:14px;}
  .tjc__tick-time{font-size:11.5px;}
}
@media (prefers-reduced-motion:reduce){
  .tjc__knob{transition:none;}
  .tjc__time--crit,.tjc__knob--crit .tjc__knob-outer{animation:none;}
}
`;

function IconeRelogio() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}

export default function CronometroSimulado({
  segundosRestantes = undefined,
  duracaoTotalSegundos = 10800,
  autoIniciar = true,
  onTempoEsgotado = undefined,
  className = '',
  style = undefined,
}) {
  const controlado = typeof segundosRestantes === 'number';
  const [internoSeg, setInternoSeg] = useState(duracaoTotalSegundos);
  const esgotadoRef = useRef(false);
  const onEsgotadoRef = useRef(onTempoEsgotado);
  onEsgotadoRef.current = onTempoEsgotado;

  // Modo autônomo: o próprio componente conta o tempo.
  useEffect(() => {
    if (controlado || !autoIniciar) return;
    setInternoSeg(duracaoTotalSegundos);
    esgotadoRef.current = false;
    const id = setInterval(() => {
      setInternoSeg((prev) => {
        if (prev <= 1) {
          clearInterval(id);
          if (!esgotadoRef.current) {
            esgotadoRef.current = true;
            if (onEsgotadoRef.current) onEsgotadoRef.current();
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [controlado, autoIniciar, duracaoTotalSegundos]);

  // Modo controlado: dispara o callback uma única vez ao zerar.
  useEffect(() => {
    if (!controlado) return;
    if (segundosRestantes <= 0 && !esgotadoRef.current) {
      esgotadoRef.current = true;
      if (onEsgotadoRef.current) onEsgotadoRef.current();
    }
    if (segundosRestantes > 0) esgotadoRef.current = false;
  }, [controlado, segundosRestantes]);

  const total = Math.max(1, duracaoTotalSegundos);
  const restante = controlado ? Math.max(0, segundosRestantes) : internoSeg;
  const frac = Math.max(0, Math.min(1, restante / total));
  const mostrarHoras = total >= 3600;
  const corAtual = corNaFracao(frac);
  const critico = frac <= 0.1;

  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => ({
    f,
    pct: Math.round(f * 100),
    tempo: formatarTempo(total * f, mostrarHoras),
    cor: corNaFracao(f),
  }));

  return (
    <div className={`tjc ${className}`} style={style} role="timer"
      aria-label={`Tempo restante do simulado: ${formatarTempo(restante, mostrarHoras)}`}>
      <style>{CSS}</style>

      <div className="tjc__top">
        <span className="tjc__label"><IconeRelogio /> Tempo restante</span>
        <span className={`tjc__time${critico ? ' tjc__time--crit' : ''}`}>
          {formatarTempo(restante, mostrarHoras)}
        </span>
      </div>

      <div className="tjc__ends">
        <span className="c">tempo crítico</span>
        <span className="i">início</span>
      </div>

      <div className="tjc__track">
        <div className="tjc__grad" />
        <div className="tjc__rail">
          <div className={`tjc__knob${critico ? ' tjc__knob--crit' : ''}`}
            style={{ left: `${frac * 100}%` }}>
            <div className="tjc__knob-outer">
              <div className="tjc__knob-ring" style={{ borderColor: corAtual }} />
            </div>
          </div>
        </div>
      </div>

      <div className="tjc__ticks">
        {ticks.map((t) => (
          <div key={t.pct} className="tjc__tick" style={{ left: `${t.pct}%` }}>
            <div className="tjc__tick-line" />
            <div className="tjc__tick-dot" />
            <div className="tjc__tick-pct" style={{ color: t.cor }}>{t.pct}%</div>
            <div className="tjc__tick-time">{t.tempo}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
