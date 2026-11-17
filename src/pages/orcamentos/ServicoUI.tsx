import { Check, Sparkles } from 'lucide-react'
import type { FotoOS, ItemComercial, Local, ModeloDrone, Orcamento } from '@/types'
import { Button, Campo, Input, Painel, Select, SeloIA, Textarea, cx } from '@/components/ui'
import { brl, numero } from '@/lib/format'
import { EditorLocal } from '@/pages/os/LocalUI'

export type TipoOrcamento = NonNullable<Orcamento['tipo']>

export const TIPOS: { id: TipoOrcamento; rotulo: string }[] = [
  { id: 'pecas', rotulo: 'Peças' }, { id: 'drone', rotulo: 'Drone' }, { id: 'manutencao', rotulo: 'Manutenção' }, { id: 'pulverizacao', rotulo: 'Pulverização' },
]
export const rotuloTipo = (t?: TipoOrcamento) => TIPOS.find((x) => x.id === (t ?? 'pecas'))!.rotulo

/** Estado de edição do serviço de pulverização (data em yyyy-mm-dd). */
export interface PulvEdicao { areaHa: number; cultura: string; produto: string; vazaoLHa: number; valorHa: number; data: string; local?: Local; observacoes: string }
export interface LaudoEdicao { diagnostico: string; causa: string; recomendacao: string; fotoIds: string[] }

export const ID_ITEM_PULV = 'it-pulverizacao'

export function itemPulverizacao(p: PulvEdicao): ItemComercial {
  return {
    id: ID_ITEM_PULV, tipo: 'servico', descricao: `Pulverização — ${numero(p.areaHa)} ha × ${brl(p.valorHa)}`, quantidade: p.areaHa, valorUnit: p.valorHa,
  }
}

/** Volume de calda total e número de voos estimados (volume ÷ tanque). */
export function estimativas(p: { areaHa: number; vazaoLHa: number }, tanqueL?: number) {
  const volume = p.areaHa * p.vazaoLHa
  const voos = tanqueL && tanqueL > 0 ? Math.ceil(volume / tanqueL) : undefined
  return { volume, voos }
}

export function SeletorTipo({ valor, aoMudar }: { valor: TipoOrcamento; aoMudar: (t: TipoOrcamento) => void }) {
  return (
    <div role="radiogroup" aria-label="Tipo de orçamento" className="flex flex-wrap gap-2">
      {TIPOS.map((t) => (
        <button
          key={t.id} type="button" role="radio" aria-checked={valor === t.id} onClick={() => aoMudar(t.id)}
          className={cx('inline-flex h-10 items-center rounded-campo border px-4 text-sm font-medium', valor === t.id ? 'border-forte bg-forte text-white' : 'border-linha bg-papel hover:bg-nevoa')}
        >{t.rotulo}</button>
      ))}
    </div>
  )
}

export function PainelLaudo({ laudo, aoMudar, fotosOS, osNumero, gerando, aoGerar }: {
  laudo: LaudoEdicao; aoMudar: (p: Partial<LaudoEdicao>) => void; fotosOS: FotoOS[]; osNumero?: number; gerando: boolean; aoGerar: () => void
}) {
  const alternar = (id: string) => aoMudar({ fotoIds: laudo.fotoIds.includes(id) ? laudo.fotoIds.filter((x) => x !== id) : [...laudo.fotoIds, id] })
  return (
    <Painel titulo="Laudo técnico" acoes={<SeloIA />}>
      <div className="flex flex-col gap-3">
        <div>
          <Button variante="ia" icone={<Sparkles size={16} />} loading={gerando} onClick={aoGerar}>Escrever laudo com IA</Button>
          <p className="mt-1.5 text-xs text-mata-suave">Usa o relato, o diagnóstico e os itens {osNumero ? `da OS ${osNumero}` : 'do orçamento'}. Revise o texto antes de enviar.</p>
        </div>
        <Campo rotulo="Diagnóstico"><Textarea rows={3} value={laudo.diagnostico} onChange={(e) => aoMudar({ diagnostico: e.target.value })} /></Campo>
        <Campo rotulo="Causa provável"><Textarea rows={2} value={laudo.causa} onChange={(e) => aoMudar({ causa: e.target.value })} /></Campo>
        <Campo rotulo="Recomendação"><Textarea rows={3} value={laudo.recomendacao} onChange={(e) => aoMudar({ recomendacao: e.target.value })} /></Campo>
        <div>
          <p className="mb-1.5 text-sm font-medium">Fotos no relatório técnico</p>
          {fotosOS.length === 0 ? (
            <p className="text-sm text-mata-suave">{osNumero ? 'A OS ainda não tem fotos.' : 'Gere o orçamento a partir de uma OS para escolher as fotos dela.'}</p>
          ) : (
            <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {fotosOS.map((f) => {
                const on = laudo.fotoIds.includes(f.id)
                return (
                  <li key={f.id}>
                    <button type="button" aria-pressed={on} onClick={() => alternar(f.id)} className={cx('relative block min-h-10 w-full overflow-hidden rounded-campo border-2', on ? 'border-lavoura' : 'border-linha')}>
                      <img src={f.url} alt={f.legenda || 'Foto da OS'} className="aspect-[4/3] w-full object-cover" />
                      {on && <span className="absolute right-1 top-1 inline-flex h-6 w-6 items-center justify-center rounded-full bg-lavoura text-white"><Check size={14} aria-hidden /></span>}
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </div>
    </Painel>
  )
}

export function PainelPulverizacao({ p, aoMudar, modelos, modeloId, aoModelo, locaisCliente }: {
  p: PulvEdicao; aoMudar: (x: Partial<PulvEdicao>) => void; modelos: ModeloDrone[]; modeloId: string; aoModelo: (id: string) => void; locaisCliente: Local[]
}) {
  const modelo = modelos.find((m) => m.id === modeloId)
  const est = estimativas(p, modelo?.tanqueL)
  const num = (v: string) => Math.max(0, parseFloat(v) || 0)
  return (
    <Painel titulo="Serviço de pulverização">
      <div className="grid gap-3 sm:grid-cols-2">
        <Campo rotulo="Área (ha)"><Input type="number" inputMode="decimal" min={0} step="0.1" className="num" value={p.areaHa || ''} onChange={(e) => aoMudar({ areaHa: num(e.target.value) })} /></Campo>
        <Campo rotulo="Valor por hectare (R$)"><Input type="number" inputMode="decimal" min={0} step="0.01" className="num" value={p.valorHa || ''} onChange={(e) => aoMudar({ valorHa: num(e.target.value) })} /></Campo>
        <Campo rotulo="Cultura"><Input value={p.cultura} onChange={(e) => aoMudar({ cultura: e.target.value })} placeholder="Ex.: soja" /></Campo>
        <Campo rotulo="Produto ou defensivo"><Input value={p.produto} onChange={(e) => aoMudar({ produto: e.target.value })} placeholder="Ex.: fungicida em calda" /></Campo>
        <Campo rotulo="Vazão (L/ha)"><Input type="number" inputMode="decimal" min={0} step="0.5" className="num" value={p.vazaoLHa || ''} onChange={(e) => aoMudar({ vazaoLHa: num(e.target.value) })} /></Campo>
        <Campo rotulo="Data prevista"><Input type="date" value={p.data} onChange={(e) => aoMudar({ data: e.target.value })} /></Campo>
        <Campo rotulo="Drone da aplicação" className="sm:col-span-2">
          <Select value={modeloId} onChange={(e) => aoModelo(e.target.value)}>
            <option value="">Escolha o modelo</option>
            {modelos.map((m) => <option key={m.id} value={m.id}>{m.nome} · tanque de {m.tanqueL} L</option>)}
          </Select>
        </Campo>
      </div>
      <dl className="mt-3 grid gap-2 rounded-campo bg-nevoa p-3 text-sm sm:grid-cols-2">
        <div><dt className="text-xs text-mata-suave">Volume de calda total</dt><dd className="num font-medium">{p.areaHa > 0 && p.vazaoLHa > 0 ? `${numero(est.volume)} L` : '-'}</dd></div>
        <div><dt className="text-xs text-mata-suave">Voos estimados</dt><dd className="num font-medium">{est.voos && est.volume > 0 ? `${est.voos} ${est.voos === 1 ? 'voo' : 'voos'} (tanque de ${modelo?.tanqueL} L)` : 'Escolha o drone'}</dd></div>
      </dl>
      <div className="mt-3">
        <p className="mb-1.5 text-sm font-medium">Local da aplicação</p>
        <EditorLocal valor={p.local} aoMudar={(l) => aoMudar({ local: l })} locaisCliente={locaisCliente} />
      </div>
      <Campo rotulo="Observações do serviço" className="mt-3"><Textarea rows={2} value={p.observacoes} onChange={(e) => aoMudar({ observacoes: e.target.value })} /></Campo>
    </Painel>
  )
}
