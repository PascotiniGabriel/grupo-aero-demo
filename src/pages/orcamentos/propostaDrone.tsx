import { useEffect, useRef, useState, type ReactNode } from 'react'
import type { ModeloOrcamentoDrone } from '@/types'
import { brl } from '@/lib/format'
import { LogoDocumento } from '@/components/layout/Marca'
import type { DadosProposta } from './comum'

/** Textos padrão do documento de orçamento de drone (editáveis em Configurações > Empresa). */
export const MODELO_DRONE_PADRAO: ModeloOrcamentoDrone = {
  entrega: 'Presencial • até 15 dias úteis após confirmação',
  pagamento: 'À vista, cartão de crédito ou financiamento',
  treinamento: 'Até 4 pessoas • duração de até 3 dias',
  kit: ['01 Drone', '01 Controle', '03 Baterias DB1580', '01 Carregador', '01 Tanque de sólidos'],
  ncm: '8424.41.00',
  ex: '014',
  atoConformidade: 'Resolução GECEX nº 780, de 28 de agosto de 2025',
  cst: '000',
  observacao:
    'O drone não se enquadra no FINAME, somente na resolução GECEX. O equipamento possui número de série, podendo ser realizada a alienação ao cliente. Acompanham os documentos da ANATEL e da ANAC. O registro na ANAC só é feito após a ordem de faturamento emitida pela agência bancária, com a aeronave já em nome do cliente.',
  posVenda: 'Treinamento operacional incluso. Acessórios opcionais e serviços adicionais poderão ser cotados separadamente.',
}

const NAVY = '#12262F'
const TEAL = '#00A383'
const TEAL_CLARO = '#D5F0E9'
const PAG = 'pagina-drone relative flex flex-col overflow-hidden bg-white text-[#12262F]'

/* ------------------------------------------------------------------ ilustrações neutras */

type Tipo = 'drone' | 'controle' | 'bateria' | 'carregador' | 'tanque'
const tipoDe = (t: string): Tipo => {
  const n = t.toLowerCase()
  return n.includes('control') ? 'controle' : n.includes('bater') ? 'bateria' : n.includes('carreg') ? 'carregador' : n.includes('tanque') ? 'tanque' : 'drone'
}

function Ilustracao({ tipo }: { tipo: Tipo }) {
  const traco = { stroke: NAVY, strokeWidth: 3, strokeLinejoin: 'round' as const, strokeLinecap: 'round' as const }
  let g: ReactNode
  if (tipo === 'controle') {
    g = <g {...traco} fill="#E8EEF0"><rect x="35" y="30" width="130" height="80" rx="14" /><rect x="62" y="12" width="76" height="22" rx="6" fill={NAVY} /><circle cx="68" cy="82" r="14" fill="#fff" /><circle cx="132" cy="82" r="14" fill="#fff" /><rect x="86" y="46" width="28" height="16" rx="3" fill={TEAL} stroke="none" /></g>
  } else if (tipo === 'bateria') {
    g = <g {...traco} fill="#E8EEF0"><rect x="45" y="30" width="110" height="70" rx="8" /><rect x="60" y="18" width="30" height="12" rx="3" fill={NAVY} /><rect x="110" y="18" width="30" height="12" rx="3" fill={NAVY} /><path d="M108 48 L94 70 H106 L98 92 L116 66 H104 Z" fill={TEAL} stroke="none" /></g>
  } else if (tipo === 'carregador') {
    g = <g {...traco} fill="#E8EEF0"><rect x="40" y="40" width="120" height="58" rx="8" /><rect x="58" y="52" width="40" height="14" rx="3" fill={NAVY} /><rect x="106" y="52" width="40" height="14" rx="3" fill={NAVY} /><circle cx="140" cy="84" r="5" fill={TEAL} stroke="none" /><path d="M60 40 V28 M100 40 V28" /></g>
  } else if (tipo === 'tanque') {
    g = <g {...traco} fill="#E8EEF0"><path d="M55 30 H145 L155 50 V98 Q155 108 145 108 H55 Q45 108 45 98 V50 Z" /><rect x="76" y="16" width="48" height="16" rx="4" fill={NAVY} /><path d="M52 74 Q76 64 100 74 T148 74" fill="none" stroke={TEAL} /></g>
  } else {
    g = (
      <g {...traco}>
        <path d="M50 30 L90 62 M150 30 L110 62 M50 110 L90 78 M150 110 L110 78" fill="none" strokeWidth={5} />
        {[[50, 28], [150, 28], [50, 112], [150, 112]].map(([x, y]) => <g key={`${x}${y}`}><circle cx={x} cy={y} r="19" fill="#E8EEF0" /><path d={`M${x - 15} ${y} H${x + 15}`} stroke={TEAL} strokeWidth={4} /></g>)}
        <rect x="76" y="52" width="48" height="36" rx="10" fill={NAVY} />
        <rect x="88" y="60" width="24" height="20" rx="4" fill={TEAL} stroke="none" />
      </g>
    )
  }
  return <svg viewBox="0 0 200 136" className="h-full w-full" role="img" aria-hidden>{g}</svg>
}

/* ------------------------------------------------------------------ faixas decorativas */

function Topo() {
  return (
    <div className="relative h-[34mm] shrink-0">
      <svg viewBox="0 0 744 130" preserveAspectRatio="none" className="absolute inset-0 h-full w-full" aria-hidden>
        <path d="M0 0 H744 V70 C640 130 560 40 440 78 C320 116 190 44 0 100 Z" fill={TEAL} />
        <path d="M0 0 H744 V38 C650 92 540 18 420 50 C280 88 150 14 0 66 Z" fill={NAVY} />
      </svg>
      <div className="absolute right-[8mm] top-[5mm] rounded-md bg-white px-3 py-1.5"><LogoDocumento altura={30} /></div>
    </div>
  )
}

function Rodape({ pag, children }: { pag: string; children?: ReactNode }) {
  return (
    <div className="relative mt-auto h-[30mm] shrink-0">
      <svg viewBox="0 0 744 110" preserveAspectRatio="none" className="absolute inset-0 h-full w-full" aria-hidden>
        <path d="M0 110 V50 C140 0 260 70 400 38 C540 6 640 20 744 50 V110 Z" fill={TEAL_CLARO} />
        <path d="M0 110 V84 C160 44 300 96 440 70 C580 44 660 56 744 76 V110 Z" fill={TEAL} opacity=".9" />
      </svg>
      {children}
      <p className="num absolute bottom-[4mm] right-[8mm] text-sm font-semibold text-white">{pag}</p>
    </div>
  )
}

const Campo = ({ r, v }: { r: string; v?: string }) => (
  <p className="min-w-0 break-words text-[11px] leading-snug"><b>{r}:</b> {v || ''}</p>
)

/* ------------------------------------------------------------------ documento */

export function PropostaDrone({ d, empresa, modelo }: {
  d: DadosProposta
  empresa: { nome: string }
  modelo?: ModeloOrcamentoDrone
}) {
  const m = { ...MODELO_DRONE_PADRAO, ...(modelo ?? {}) }
  const c = d.cliente
  const dt = (iso: string) => new Date(iso).toLocaleDateString('pt-BR')
  const drone = d.itens.find((i) => i.tipo === 'drone' && !i.opcional)
  const sigla = drone?.descricao.match(/agras\s+([a-z0-9]+)/i)?.[1]?.toUpperCase()
  const titulo = sigla ? `Drone DJI AGRAS ${sigla}` : drone?.descricao ?? 'Drone'
  const kit = m.kit.length ? m.kit : MODELO_DRONE_PADRAO.kit
  const outros = d.itens.filter((i) => i !== drone)
  const grande = kit.find((k) => tipoDe(k) === 'drone') ?? kit[0]
  const pequenos = kit.filter((k) => k !== grande)

  const dadosLegais: [string, string][] = [['NCM', m.ncm], ['EX tarifário', m.ex], ['Ato de conformidade legal', m.atoConformidade], ['CST inicial', m.cst]]
  const h2 = 'text-[13px] font-bold uppercase tracking-wide'
  const docLabel = c?.tipo === 'PF' ? 'CPF' : 'CPF/CNPJ'

  return (
    <article className="folha-claro doc-drone mx-auto flex flex-col gap-4 print:gap-0">
      <style>{`
        .pagina-drone{width:186mm;height:272mm;box-sizing:border-box;border:1px solid #DDE5E0}
        @media print{.pagina-drone{border:0;break-after:page;page-break-after:always}.pagina-drone:last-child{break-after:auto;page-break-after:auto}.doc-drone{zoom:1!important}}
      `}</style>

      {/* ---------- página 1 */}
      <section className={PAG}>
        <Topo />
        <div className="grid grid-cols-[1fr_auto] items-start gap-4 px-[10mm] pt-1">
          <div>
            <h2 className={`${h2} text-[#00A383]`}>Condições da proposta</h2>
            <div className="mt-1.5 flex flex-col gap-1 text-[11px] leading-snug">
              <p><b>Entrega:</b> {d.prazoEntrega || m.entrega}</p>
              <p><b>Pagamento:</b> {d.formaPagamento || m.pagamento}</p>
              <p><b>Treinamento:</b> {m.treinamento}</p>
              <p><b>Representante:</b> {d.vendedor}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="rounded-full px-4 py-1.5 text-[12px] font-semibold text-white" style={{ background: TEAL }}>Número do orçamento: <span className="num">{d.numero}</span></p>
            <p className="num mt-1 text-[11px]">{dt(d.data)}</p>
            <p className="num text-[10px] text-neutral-600">Válido até {dt(d.validade)}</p>
          </div>
        </div>

        <div className="px-[10mm] pt-4">
          <h2 className={`${h2} border-b pb-1`} style={{ borderColor: TEAL }}>Informações do cliente</h2>
          <div className="mt-2 grid grid-cols-2 gap-x-6 gap-y-1">
            <Campo r="Nome" v={c?.nome} />
            <Campo r={docLabel} v={c?.documento} />
            <Campo r="Endereço" v={c?.endereco} />
            <Campo r="Cidade/UF" v={c ? `${c.cidade}/${c.uf}` : ''} />
            <Campo r="CEP" v={c?.cep} />
            <Campo r="Fone" v={c?.fone} />
            <Campo r="E-mail" v={c?.email} />
            <Campo r="Inscrição Estadual" v={c?.ie} />
          </div>
        </div>

        <div className="px-[10mm] pt-6">
          <h1 className="text-[26px] font-bold leading-tight">{titulo}:</h1>
          <p className="mt-1 text-[13px] leading-relaxed">{kit.join(', ')}</p>
        </div>

        <div className="px-[10mm] pt-5">
          <h2 className={`${h2} text-[#00A383]`}>Dados legais do equipamento</h2>
          <div className="mt-2 grid grid-cols-2 gap-x-6 gap-y-1">
            {dadosLegais.map(([r, v]) => <Campo key={r} r={r} v={v} />)}
          </div>
          <h2 className={`${h2} mt-4 text-[#00A383]`}>Observação</h2>
          <p className="mt-1 text-[11px] leading-relaxed">{m.observacao}</p>
        </div>

        <Rodape pag="01 / 02">
          <div className="absolute bottom-[4mm] left-[10mm]">
            <p className="text-[11px] font-semibold">Valor total</p>
            <p className="num text-[24px] font-bold leading-none">{brl(d.total)}</p>
          </div>
        </Rodape>
      </section>

      {/* ---------- página 2 */}
      <section className={PAG}>
        <Topo />
        <div className="px-[10mm] pt-1">
          <h2 className={`${h2} text-[#00A383]`}>Detalhamento / equipamentos</h2>
          <p className="text-[18px] font-bold">Ilustração:</p>
          <figure className="mt-2 rounded-[10px] border p-2" style={{ borderColor: '#CFE3DD', background: '#F4FAF8' }}>
            <div className="mx-auto h-[52mm] w-[80mm]"><Ilustracao tipo="drone" /></div>
            <figcaption className="pt-1 text-center text-[12px] font-semibold">{grande}{sigla ? ` DJI AGRAS ${sigla}` : ''}</figcaption>
          </figure>
          <div className="mt-3 grid grid-cols-4 gap-2">
            {pequenos.map((k) => (
              <figure key={k} className="rounded-[10px] border p-1.5" style={{ borderColor: '#CFE3DD', background: '#F4FAF8' }}>
                <div className="mx-auto h-[20mm] w-full"><Ilustracao tipo={tipoDe(k)} /></div>
                <figcaption className="pt-1 text-center text-[10px] font-semibold leading-tight">{k}</figcaption>
              </figure>
            ))}
          </div>
        </div>

        <div className="px-[10mm] pt-5">
          <h2 className={`${h2} text-[#00A383]`}>Suporte e pós-venda</h2>
          <p className="mt-1 text-[11px] leading-relaxed">{m.posVenda}</p>
          {outros.length > 0 && (
            <ul className="mt-2 flex flex-col gap-0.5 text-[11px]">
              {outros.map((i) => (
                <li key={i.id} className="flex justify-between gap-3 border-b border-neutral-200 py-0.5">
                  <span>{i.quantidade > 1 ? `${i.quantidade}x ` : ''}{i.descricao}{i.opcional ? ' (opcional)' : ''}</span>
                  <span className="num shrink-0">{brl(i.valorUnit * i.quantidade)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="px-[10mm] pt-5">
          <h2 className={`${h2} text-[#00A383]`}>Aceite da proposta</h2>
          <div className="mt-8 grid grid-cols-2 gap-10 text-center text-[11px]">
            <div className="border-t border-[#12262F] pt-1"><b>{d.vendedor}</b><br />Representante, {empresa.nome}</div>
            <div className="border-t border-[#12262F] pt-1"><b>{c?.nome ?? 'Cliente'}</b><br />{docLabel} {c?.documento ?? ''}</div>
          </div>
        </div>

        <Rodape pag="02 / 02" />
      </section>
    </article>
  )
}

/** Reduz a folha para caber na largura disponível (pré-visualização no celular). */
export function EscalaFolha({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  const [z, setZ] = useState(1)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const medir = () => {
      const w = el.clientWidth
      setZ(w > 0 ? Math.min(1, w / (186 * 3.7795 + 2)) : 1)
    }
    medir()
    const ro = new ResizeObserver(medir)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  return <div ref={ref} className="w-full overflow-hidden"><div style={{ zoom: z }} className="doc-drone flex justify-center">{children}</div></div>
}
