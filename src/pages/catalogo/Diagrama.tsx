import type { KeyboardEvent, ReactNode } from 'react'
import type { GrupoDiagrama } from '@/types'

/** Numeração das chamadas, na ordem em que a peça aparece no manual de montagem. */
export const NUMERO_GRUPO: Record<GrupoDiagrama, number> = {
  tanque: 1, bomba: 2, bico: 3, braco: 4, motor: 5, helice: 6, esc: 7, placa: 8, radar: 9, camera: 10, bateria: 11, trem: 12, controle: 13, carregador: 14,
}

interface Props {
  rotores: 4 | 8
  nomeModelo: string
  ativo: GrupoDiagrama | null
  realce: GrupoDiagrama | null
  contagem: Partial<Record<GrupoDiagrama, number>>
  nomes: Record<GrupoDiagrama, string>
  aoSelecionar: (g: GrupoDiagrama) => void
  aoRealcar: (g: GrupoDiagrama | null) => void
}

interface Estilo { stroke: string; fill: string; w: number }

const TRACO = '#10231C'
const GUIA = '#8FA79B'
const CORNERS: [number, number][] = [[-1, -1], [1, -1], [-1, 1], [1, 1]]

/** Polígono de um braço (retângulo girado) entre dois pontos. */
function braco(x1: number, y1: number, x2: number, y2: number, w: number) {
  const dx = x2 - x1, dy = y2 - y1, d = Math.hypot(dx, dy)
  const nx = (-dy / d) * (w / 2), ny = (dx / d) * (w / 2)
  return `${x1 + nx},${y1 + ny} ${x2 + nx},${y2 + ny} ${x2 - nx},${y2 - ny} ${x1 - nx},${y1 - ny}`
}

export function Diagrama({ rotores, nomeModelo, ativo, realce, contagem, nomes, aoSelecionar, aoRealcar }: Props) {
  const oito = rotores === 8
  const linhaInferior = oito ? 590 : 535
  const altura = oito ? 710 : 655

  function estiloDe(g: GrupoDiagrama): Estilo {
    if (ativo === g) return { stroke: '#1F8A4C', fill: '#DDF1E5', w: 2.6 }
    if (realce === g) return { stroke: '#1E78C8', fill: '#E1EEF9', w: 2.4 }
    return { stroke: TRACO, fill: '#FFFFFF', w: 1.8 }
  }

  function teclado(g: GrupoDiagrama) {
    return (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); aoSelecionar(g) }
    }
  }

  /** Uma parte clicável: desenho + linha de chamada + número. */
  function parte(g: GrupoDiagrama, ancora: [number, number] | null, rotulo: [number, number], desenho: (e: Estilo) => ReactNode) {
    const e = estiloDe(g)
    const n = contagem[g] ?? 0
    const marcado = ativo === g
    const hover = realce === g
    return (
      <g
        key={g} className="parte-svg" role="button" tabIndex={0} aria-pressed={marcado}
        aria-label={`${NUMERO_GRUPO[g]}. ${nomes[g]}, ${n} ${n === 1 ? 'peça' : 'peças'} para o ${nomeModelo}`}
        opacity={n === 0 && !marcado ? 0.45 : 1}
        style={{ cursor: 'pointer', outline: 'none' }}
        onClick={() => aoSelecionar(g)} onKeyDown={teclado(g)}
        onMouseEnter={() => aoRealcar(g)} onMouseLeave={() => aoRealcar(null)}
        onFocus={() => aoRealcar(g)} onBlur={() => aoRealcar(null)}
      >
        <title>{`${NUMERO_GRUPO[g]}. ${nomes[g]}`}</title>
        {desenho(e)}
        {ancora && <line x1={ancora[0]} y1={ancora[1]} x2={rotulo[0]} y2={rotulo[1]} stroke={marcado ? '#1F8A4C' : hover ? '#1E78C8' : TRACO} strokeWidth={1.2} />}
        <circle cx={rotulo[0]} cy={rotulo[1]} r={17} fill={marcado ? '#1F8A4C' : hover ? '#1E78C8' : '#FFFFFF'} stroke={marcado ? '#1F8A4C' : hover ? '#1E78C8' : TRACO} strokeWidth={1.6} />
        <text x={rotulo[0]} y={rotulo[1] + 6.5} textAnchor="middle" fontSize={18} fontWeight={600} fill={marcado || hover ? '#FFFFFF' : TRACO} style={{ fontVariantNumeric: 'tabular-nums', pointerEvents: 'none' }}>
          {NUMERO_GRUPO[g]}
        </text>
      </g>
    )
  }

  const pa = { pointerEvents: 'all' as const, strokeLinejoin: 'round' as const, strokeLinecap: 'round' as const }

  // Geometria dos rotores (coordenadas antes do deslocamento global de 40 px)
  const cantos = CORNERS.map(([sx, sy]) => {
    const B: [number, number] = [450 + sx * 65, 245 + sy * 55]
    const R: [number, number] = [450 + sx * 200, 255 + sy * 140]
    const dx = R[0] - B[0], dy = R[1] - B[1], d = Math.hypot(dx, dy)
    const u: [number, number] = [dx / d, dy / d]
    const ini: [number, number] = [B[0] + u[0] * 16, B[1] + u[1] * 16]
    const fim: [number, number] = [R[0] - u[0] * 28, R[1] - u[1] * 28]
    let n: [number, number] = [-u[1], u[0]]
    if (n[1] * sy < 0) n = [-n[0], -n[1]]
    const meio: [number, number] = [(ini[0] + fim[0]) / 2, (ini[1] + fim[1]) / 2]
    const esc: [number, number] = [meio[0] + n[0] * 26, meio[1] + n[1] * 26]
    const motores: [number, number][] = oito ? [R, [R[0], R[1] + sy * 34]] : [R]
    const helices: [number, number][] = oito ? [[R[0], R[1] + sy * 74], [R[0], R[1] + sy * 104]] : [[R[0], R[1] + sy * 40]]
    return { sx, sy, B, R, u, ini, fim, esc, motores, helices, ang: Math.atan2(u[1], u[0]) * 180 / Math.PI }
  })
  const TR = cantos[1]

  return (
    <svg viewBox={`160 0 590 ${altura}`} className="block h-auto w-full" role="group" aria-label={`Vista explodida do Agras ${nomeModelo}`}>
      <style>{`.parte-svg:focus-visible{outline:2px solid #1E78C8;outline-offset:3px;border-radius:4px}@media (prefers-reduced-motion:no-preference){.parte-svg *{transition:stroke .15s,fill .15s}}`}</style>

      <g transform="translate(0,40)">
        {/* linhas-guia e carcaça (não clicáveis) */}
        <g fill="none" stroke={GUIA} strokeWidth={1.2} strokeDasharray="5 5" aria-hidden>
          <line x1={450} y1={135} x2={450} y2={178} />
          <line x1={450} y1={54} x2={450} y2={95} />
          <line x1={329} y1={74} x2={392} y2={186} />
          <line x1={515} y1={245} x2={553} y2={245} />
          <line x1={385} y1={245} x2={343} y2={245} />
          <line x1={450} y1={300} x2={450} y2={345} />
          <line x1={388} y1={300} x2={366} y2={393} />
          <line x1={512} y1={300} x2={534} y2={393} />
          {cantos.map((c, i) => (
            <g key={i}>
              <line x1={c.B[0]} y1={c.B[1]} x2={c.ini[0]} y2={c.ini[1]} />
              <line x1={c.fim[0]} y1={c.fim[1]} x2={c.R[0] - c.u[0] * 20} y2={c.R[1] - c.u[1] * 20} />
              <line x1={c.R[0]} y1={c.R[1]} x2={c.helices[c.helices.length - 1][0]} y2={c.helices[c.helices.length - 1][1]} />
            </g>
          ))}
        </g>
        <rect x={375} y={180} width={150} height={130} rx={20} fill="none" stroke="#DDE5E0" strokeWidth={2} aria-hidden />

        {/* braços */}
        {parte('braco', [TR.ini[0] + (TR.fim[0] - TR.ini[0]) * 0.55, TR.ini[1] + (TR.fim[1] - TR.ini[1]) * 0.55 + 5], [600, 192], (e) => (
          <>
            {cantos.map((c, i) => (
              <g key={i}>
                <polygon points={braco(c.ini[0], c.ini[1], c.fim[0], c.fim[1], 12)} fill={e.fill} stroke={e.stroke} strokeWidth={e.w} {...pa} />
                <circle cx={c.ini[0] + c.u[0] * 22} cy={c.ini[1] + c.u[1] * 22} r={5} fill="none" stroke={e.stroke} strokeWidth={1.2} />
              </g>
            ))}
          </>
        ))}

        {/* ESC: módulos presos nos braços */}
        {parte('esc', [cantos[0].esc[0] - 8, cantos[0].esc[1] + 5], [288, 172], (e) => (
          <>
            {cantos.map((c, i) => (
              <g key={i} transform={`rotate(${c.ang} ${c.esc[0]} ${c.esc[1]})`}>
                <rect x={c.esc[0] - 15} y={c.esc[1] - 8} width={30} height={16} rx={3} fill={e.fill} stroke={e.stroke} strokeWidth={e.w} {...pa} />
                <line x1={c.esc[0] - 8} y1={c.esc[1] - 3} x2={c.esc[0] + 8} y2={c.esc[1] - 3} stroke={e.stroke} strokeWidth={1.1} />
                <line x1={c.esc[0] - 8} y1={c.esc[1] + 3} x2={c.esc[0] + 8} y2={c.esc[1] + 3} stroke={e.stroke} strokeWidth={1.1} />
              </g>
            ))}
          </>
        ))}

        {/* motores */}
        {parte('motor', [TR.R[0] + 17, TR.R[1] + 8], [TR.R[0] + 56, TR.R[1] + 18], (e) => (
          <>
            {cantos.flatMap((c, i) => c.motores.map((m, j) => (
              <g key={`${i}-${j}`}>
                <circle cx={m[0]} cy={m[1]} r={20} fill={e.fill} stroke={e.stroke} strokeWidth={e.w} {...pa} />
                <circle cx={m[0]} cy={m[1]} r={11} fill="none" stroke={e.stroke} strokeWidth={1.2} />
                <circle cx={m[0]} cy={m[1]} r={3.5} fill={e.stroke} />
                {[0, 90, 180, 270].map((a) => (
                  <line key={a} x1={m[0] + 11 * Math.cos(a * Math.PI / 180)} y1={m[1] + 11 * Math.sin(a * Math.PI / 180)} x2={m[0] + 20 * Math.cos(a * Math.PI / 180)} y2={m[1] + 20 * Math.sin(a * Math.PI / 180)} stroke={e.stroke} strokeWidth={1} />
                ))}
              </g>
            )))}
          </>
        ))}

        {/* hélices */}
        {parte('helice', [TR.helices[0][0] + 40, TR.helices[0][1] - 1], [TR.R[0] + 76, TR.helices[0][1] - 4], (e) => (
          <>
            {cantos.flatMap((c, i) => c.helices.map((h, j) => {
              const ang = (c.sx * c.sy > 0 ? 9 : -9) + (j ? 4 : 0)
              return (
                <g key={`${i}-${j}`} transform={`rotate(${ang} ${h[0]} ${h[1]})`}>
                  <ellipse cx={h[0]} cy={h[1]} rx={46} ry={6.5} fill={e.fill} stroke={e.stroke} strokeWidth={e.w} {...pa} />
                  <ellipse cx={h[0]} cy={h[1]} rx={46} ry={6.5} fill="none" stroke="none" />
                  <circle cx={h[0]} cy={h[1]} r={6} fill="#FFFFFF" stroke={e.stroke} strokeWidth={1.4} />
                  <circle cx={h[0]} cy={h[1]} r={2} fill={e.stroke} />
                </g>
              )
            }))}
          </>
        ))}

        {/* tanque */}
        {parte('tanque', null, [450, 262], (e) => (
          <>
            <rect x={432} y={176} width={36} height={16} rx={3} fill={e.fill} stroke={e.stroke} strokeWidth={e.w} {...pa} />
            <rect x={385} y={190} width={130} height={110} rx={16} fill={e.fill} stroke={e.stroke} strokeWidth={e.w} {...pa} />
            {[212, 232, 252, 272].map((y) => <line key={y} x1={494} y1={y} x2={y % 40 === 12 ? 506 : 502} y2={y} stroke={e.stroke} strokeWidth={1.2} />)}
            <path d="M399 284 q13 -6 26 0 t26 0" fill="none" stroke={e.stroke} strokeWidth={1.2} />
          </>
        ))}

        {/* placa controladora */}
        {parte('placa', [490, 112], [528, 112], (e) => (
          <>
            <rect x={410} y={95} width={80} height={40} rx={4} fill={e.fill} stroke={e.stroke} strokeWidth={e.w} {...pa} />
            <rect x={420} y={103} width={24} height={16} rx={2} fill="none" stroke={e.stroke} strokeWidth={1.2} />
            <rect x={454} y={103} width={14} height={14} rx={2} fill="none" stroke={e.stroke} strokeWidth={1.2} />
            {[418, 428, 438, 448, 458, 468, 478].map((x) => <line key={x} x1={x} y1={135} x2={x} y2={141} stroke={e.stroke} strokeWidth={1.2} />)}
          </>
        ))}

        {/* radar */}
        {parte('radar', [480, 41], [528, 41], (e) => (
          <>
            <rect x={420} y={28} width={60} height={26} rx={7} fill={e.fill} stroke={e.stroke} strokeWidth={e.w} {...pa} />
            <path d="M436 20 q14 -9 28 0" fill="none" stroke={e.stroke} strokeWidth={1.4} />
            <path d="M428 12 q22 -15 44 0" fill="none" stroke={e.stroke} strokeWidth={1.4} />
            <circle cx={450} cy={41} r={5} fill="none" stroke={e.stroke} strokeWidth={1.2} />
          </>
        ))}

        {/* câmera FPV */}
        {parte('camera', [353, 56], [388, 46], (e) => (
          <>
            <rect x={305} y={40} width={48} height={34} rx={6} fill={e.fill} stroke={e.stroke} strokeWidth={e.w} {...pa} />
            <circle cx={329} cy={57} r={11} fill="none" stroke={e.stroke} strokeWidth={1.4} />
            <circle cx={329} cy={57} r={4.5} fill={e.stroke} />
          </>
        ))}

        {/* bomba */}
        {parte('bomba', [612, 262], [655, 278], (e) => (
          <>
            <rect x={553} y={226} width={60} height={40} rx={11} fill={e.fill} stroke={e.stroke} strokeWidth={e.w} {...pa} />
            <circle cx={583} cy={246} r={11} fill="none" stroke={e.stroke} strokeWidth={1.3} />
            <rect x={613} y={238} width={18} height={15} rx={3} fill={e.fill} stroke={e.stroke} strokeWidth={e.w} {...pa} />
            <line x1={583} y1={246} x2={590} y2={240} stroke={e.stroke} strokeWidth={1.3} />
          </>
        ))}

        {/* bicos */}
        {parte('bico', [300, 240], [258, 226], (e) => (
          <>
            <rect x={300} y={232} width={43} height={26} rx={7} fill={e.fill} stroke={e.stroke} strokeWidth={e.w} {...pa} />
            <ellipse cx={321} cy={270} rx={23} ry={5.5} fill={e.fill} stroke={e.stroke} strokeWidth={e.w} {...pa} />
            <line x1={321} y1={258} x2={321} y2={264} stroke={e.stroke} strokeWidth={1.4} />
            {[[300, 296], [321, 302], [342, 296]].map(([x, y]) => <line key={x} x1={321} y1={277} x2={x} y2={y} stroke={e.stroke} strokeWidth={1.1} strokeDasharray="3 3" />)}
          </>
        ))}

        {/* bateria */}
        {parte('bateria', null, [450, 373], (e) => (
          <>
            <rect x={400} y={345} width={100} height={56} rx={9} fill={e.fill} stroke={e.stroke} strokeWidth={e.w} {...pa} />
            <rect x={436} y={338} width={28} height={8} rx={2} fill={e.fill} stroke={e.stroke} strokeWidth={e.w} {...pa} />
            {[412, 420, 428].map((x) => <line key={x} x1={x} y1={356} x2={x} y2={390} stroke={e.stroke} strokeWidth={1.1} />)}
            {[472, 480, 488].map((x) => <line key={x} x1={x} y1={356} x2={x} y2={390} stroke={e.stroke} strokeWidth={1.1} />)}
          </>
        ))}

        {/* trem de pouso */}
        {parte('trem', [562, 440], [592, 466], (e) => (
          <>
            <line x1={366} y1={395} x2={354} y2={440} stroke={e.stroke} strokeWidth={5} {...pa} />
            <line x1={534} y1={395} x2={546} y2={440} stroke={e.stroke} strokeWidth={5} {...pa} />
            <line x1={366} y1={395} x2={354} y2={440} stroke={e.fill === '#FFFFFF' ? '#FFFFFF' : e.fill} strokeWidth={2.4} />
            <line x1={534} y1={395} x2={546} y2={440} stroke={e.fill === '#FFFFFF' ? '#FFFFFF' : e.fill} strokeWidth={2.4} />
            <rect x={330} y={440} width={240} height={10} rx={5} fill={e.fill} stroke={e.stroke} strokeWidth={e.w} {...pa} />
          </>
        ))}
      </g>

      {/* controle remoto e carregador, fora da aeronave */}
      <g transform={`translate(0,${linhaInferior})`}>
        <line x1={170} y1={-14} x2={740} y2={-14} stroke="#DDE5E0" strokeWidth={1.4} aria-hidden />
        {parte('controle', [350, 62], [392, 62], (e) => (
          <>
            <rect x={222} y={0} width={8} height={26} rx={3} fill={e.fill} stroke={e.stroke} strokeWidth={e.w} {...pa} />
            <rect x={320} y={0} width={8} height={26} rx={3} fill={e.fill} stroke={e.stroke} strokeWidth={e.w} {...pa} />
            <rect x={200} y={22} width={150} height={86} rx={16} fill={e.fill} stroke={e.stroke} strokeWidth={e.w} {...pa} />
            <rect x={238} y={32} width={74} height={46} rx={4} fill="none" stroke={e.stroke} strokeWidth={1.3} />
            <circle cx={224} cy={92} r={9} fill="none" stroke={e.stroke} strokeWidth={1.3} />
            <circle cx={326} cy={92} r={9} fill="none" stroke={e.stroke} strokeWidth={1.3} />
            <circle cx={275} cy={94} r={3.5} fill={e.stroke} />
          </>
        ))}
        {parte('carregador', [640, 66], [694, 66], (e) => (
          <>
            <rect x={470} y={36} width={170} height={70} rx={11} fill={e.fill} stroke={e.stroke} strokeWidth={e.w} {...pa} />
            <rect x={486} y={50} width={60} height={38} rx={5} fill="none" stroke={e.stroke} strokeWidth={1.3} />
            <rect x={564} y={50} width={60} height={38} rx={5} fill="none" stroke={e.stroke} strokeWidth={1.3} />
            <circle cx={555} cy={96} r={3} fill={e.stroke} />
            <path d="M640 92 C664 92 666 112 690 106" fill="none" stroke={e.stroke} strokeWidth={2} {...pa} />
          </>
        ))}
        <text x={296} y={128} textAnchor="middle" fontSize={13} fill="#4B5F57" aria-hidden>Controle remoto</text>
        <text x={555} y={128} textAnchor="middle" fontSize={13} fill="#4B5F57" aria-hidden>Carregador</text>
      </g>
    </svg>
  )
}

