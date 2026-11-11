import { useMemo, useState } from 'react'
import { QrCode, Search } from 'lucide-react'
import type { Cliente, Equipamento, ItemComercial, ModeloDrone, Produto, Servico } from '@/types'
import { Avatar, Button, CampoBusca, Selo, cx } from '@/components/ui'
import { brl, normalizar } from '@/lib/format'
import { buscarCatalogo, type OpcaoItem } from '@/lib/ai/orcamento'
import { nomeModelo } from '@/store/selectors'

/** yyyy-mm-dd de um ISO. */
export const paraInput = (iso: string | undefined) => (iso ? iso.slice(0, 10) : '')
export const deInput = (v: string) => (v ? new Date(`${v}T12:00:00`).toISOString() : new Date().toISOString())

export const FORMAS_PAGAMENTO = ['À vista (Pix ou transferência)', 'Boleto em 30 dias', 'Boleto em 30/60 dias', 'Cartão em até 10x', 'Financiamento (Plano Safra)']
export const PRAZOS_ENTREGA = ['Imediata (peças em estoque)', 'Até 5 dias úteis', 'Até 15 dias úteis', 'Sob consulta']

export function rotuloEquipamento(e: Equipamento, modelos: ModeloDrone[]) {
  return `${nomeModelo(e.modeloId, modelos)}${e.apelido ? ` · ${e.apelido}` : ''} · ${e.serial}`
}

/* ------------------------------------------------------------------ busca de itens */

export function BuscaItem({ modeloId, produtos, servicos, aoEscolher, aoLerQR, placeholder = 'Buscar peça, serviço ou drone', autoFoco }: {
  modeloId?: string
  produtos: Produto[]
  servicos: Servico[]
  aoEscolher: (o: OpcaoItem) => void
  aoLerQR?: () => void
  placeholder?: string
  autoFoco?: boolean
}) {
  const [q, setQ] = useState('')
  const [foco, setFoco] = useState(!!autoFoco)
  const opcoes = useMemo(() => buscarCatalogo(q, { produtos, servicos }, modeloId, 8), [q, produtos, servicos, modeloId])
  const mostrar = (foco || q.length > 0) && opcoes.length > 0 && (q.length > 0 || !!modeloId)
  const modeloNome = modeloId ? nomeModelo(modeloId) : ''

  return (
    <div className="flex flex-col gap-2" onFocus={() => setFoco(true)} onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setFoco(false) }}>
      <div className="flex gap-2">
        <CampoBusca valor={q} aoMudar={setQ} placeholder={placeholder} className="flex-1" />
        {aoLerQR && <Button variante="secundario" icone={<QrCode size={16} />} onClick={aoLerQR} aria-label="Ler QR code da peça" className="shrink-0"><span className="hidden sm:inline">Ler QR</span></Button>}
      </div>
      {modeloId && foco && q.length === 0 && <p className="text-xs text-mata-suave">Mostrando peças que servem no {modeloNome}. Digite para buscar em todo o catálogo.</p>}
      {mostrar && (
        <ul className="max-h-72 overflow-y-auto rounded-campo border border-linha bg-papel">
          {opcoes.map((o) => (
            <li key={o.chave} className="border-b border-linha last:border-b-0">
              <button
                type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => { aoEscolher(o); setQ('') }}
                className="flex min-h-11 w-full items-center gap-3 px-3 py-2 text-left hover:bg-nevoa"
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{o.nome}</span>
                  <span className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-mata-suave">
                    {o.tipo === 'servico' ? <Selo>Serviço</Selo> : o.tipo === 'drone' ? <Selo cor="azul">Drone</Selo> : null}
                    {o.estoque !== undefined && <span className={cx(o.estoque === 0 && 'text-barro')}>{o.estoque === 0 ? 'Sem estoque' : `${o.estoque} em estoque`}</span>}
                    {o.compat === true && <span className="font-medium text-lavoura-escuro">Serve no {modeloNome}</span>}
                    {o.compat === false && <span className="font-medium text-[#7A5600]">Não serve no {modeloNome}</span>}
                  </span>
                </span>
                <span className="num shrink-0 text-sm">{brl(o.preco)}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {q.length > 1 && opcoes.length === 0 && (
        <p className="flex items-center gap-2 text-sm text-mata-suave"><Search size={14} aria-hidden />Nada encontrado para "{q}".</p>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ seletor de cliente */

export function SeletorCliente({ clientes, valor, aoMudar }: { clientes: Cliente[]; valor: string; aoMudar: (id: string) => void }) {
  const [q, setQ] = useState('')
  const atual = clientes.find((c) => c.id === valor)
  const lista = useMemo(() => {
    const t = normalizar(q).trim()
    if (!t) return []
    return clientes.filter((c) => normalizar(`${c.nome} ${c.cidade} ${c.uf} ${c.documento}`).includes(t)).slice(0, 6)
  }, [q, clientes])

  if (atual) {
    return (
      <div className="flex items-center gap-3 rounded-campo border border-linha bg-nevoa p-3">
        <Avatar nome={atual.nome} tamanho={40} />
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium">{atual.nome}</p>
          <p className="truncate text-xs text-mata-suave">{atual.cidade}/{atual.uf} · {atual.fone}</p>
        </div>
        <Button variante="secundario" tamanho="sm" onClick={() => aoMudar('')}>Trocar</Button>
      </div>
    )
  }
  return (
    <div className="flex flex-col gap-2">
      <CampoBusca valor={q} aoMudar={setQ} placeholder="Buscar cliente por nome ou cidade" />
      {lista.length > 0 && (
        <ul className="rounded-campo border border-linha bg-papel">
          {lista.map((c) => (
            <li key={c.id} className="border-b border-linha last:border-b-0">
              <button type="button" onClick={() => { aoMudar(c.id); setQ('') }} className="flex min-h-11 w-full items-center gap-3 px-3 py-2 text-left hover:bg-nevoa">
                <Avatar nome={c.nome} tamanho={32} />
                <span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium">{c.nome}</span><span className="text-xs text-mata-suave">{c.cidade}/{c.uf}</span></span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {q.length > 1 && lista.length === 0 && <p className="text-sm text-mata-suave">Nenhum cliente encontrado.</p>}
    </div>
  )
}

/* ------------------------------------------------------------------ proposta impressa */

export interface DadosProposta {
  numero: number | string
  data: string
  validade: string
  cliente?: Cliente
  itens: ItemComercial[]
  subtotal: number
  desconto: number
  frete: number
  total: number
  formaPagamento: string
  prazoEntrega: string
  observacoes: string
  vendedor: string
}

export function Proposta({ d, empresa }: { d: DadosProposta; empresa: { nome: string; cnpj: string; endereco: string; cidade: string; fone: string; email: string } }) {
  const dt = (iso: string) => new Date(iso).toLocaleDateString('pt-BR')
  return (
    <article className="mx-auto max-w-[800px] bg-white p-6 text-[13px] leading-snug text-black print:p-0">
      <header className="flex items-start justify-between gap-4 border-b-2 border-black pb-3">
        <div>
          <h1 className="titulo text-xl">{empresa.nome}</h1>
          <p>CNPJ {empresa.cnpj}</p>
          <p>{empresa.endereco} · {empresa.cidade}</p>
          <p>{empresa.fone} · {empresa.email}</p>
        </div>
        <div className="text-right">
          <p className="titulo text-lg">Proposta comercial</p>
          <p className="num">Nº {d.numero}</p>
          <p>Emitida em {dt(d.data)}</p>
          <p>Válida até {dt(d.validade)}</p>
        </div>
      </header>

      <section className="mt-4">
        <h2 className="titulo mb-1 text-sm">Cliente</h2>
        <p className="font-semibold">{d.cliente?.nome ?? 'Cliente não informado'}</p>
        {d.cliente && <p>{d.cliente.tipo === 'PJ' ? 'CNPJ' : 'CPF'} {d.cliente.documento} · {d.cliente.endereco}, {d.cliente.cidade}/{d.cliente.uf} · CEP {d.cliente.cep}</p>}
        {d.cliente && <p>{d.cliente.fone} · {d.cliente.email}</p>}
      </section>

      <table className="mt-4 w-full border-collapse">
        <thead>
          <tr className="border-y border-black text-left">
            <th className="py-1.5 pr-2">Modelo</th><th className="w-16 py-1.5 text-right">Quant.</th>
            <th className="w-28 py-1.5 text-right">R$ Unit.</th><th className="w-28 py-1.5 text-right">R$ Total</th>
          </tr>
        </thead>
        <tbody>
          {d.itens.map((i) => (
            <tr key={i.id} className="border-b border-neutral-300 align-top">
              <td className="py-1.5 pr-2">{i.descricao}</td>
              <td className="num py-1.5 text-right">{i.quantidade}</td>
              <td className="num py-1.5 text-right">{brl(i.valorUnit)}</td>
              <td className="num py-1.5 text-right">{brl(i.valorUnit * i.quantidade)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="mt-3 ml-auto w-64">
        <p className="flex justify-between"><span>Subtotal</span><span className="num">{brl(d.subtotal)}</span></p>
        {d.desconto > 0 && <p className="flex justify-between"><span>Desconto</span><span className="num">- {brl(d.desconto)}</span></p>}
        <p className="flex justify-between"><span>Frete</span><span className="num">{d.frete > 0 ? brl(d.frete) : 'a combinar'}</span></p>
        <p className="titulo mt-1 flex justify-between border-t-2 border-black pt-1 text-lg"><span>Valor total</span><span className="num">{brl(d.total)}</span></p>
      </div>

      <section className="mt-4 grid gap-x-6 gap-y-1 sm:grid-cols-2">
        <h2 className="titulo text-sm sm:col-span-2">Condições</h2>
        <p><b>Entrega:</b> {d.prazoEntrega || 'a combinar'}</p>
        <p><b>Pagamento:</b> {d.formaPagamento || 'a combinar'}</p>
        <p><b>Validade:</b> {dt(d.validade)}</p>
        <p><b>Vendedor:</b> {d.vendedor}</p>
        {d.observacoes && <p className="sm:col-span-2"><b>Observações:</b> {d.observacoes}</p>}
      </section>

      <section className="mt-4 border border-neutral-400 p-3">
        <h2 className="titulo mb-1 text-sm">Dados para pagamento</h2>
        <p>Banco Demonstração (000) · Agência 0000 · Conta corrente 00000-0</p>
        <p>Titular: {empresa.nome} · CNPJ {empresa.cnpj}</p>
        <p>Chave Pix (CNPJ): {empresa.cnpj}</p>
        <p className="mt-1 text-[11px] text-neutral-600">Dados fictícios, apenas para demonstração do sistema.</p>
      </section>

      <footer className="mt-12 grid grid-cols-2 gap-10 text-center">
        <div className="border-t border-black pt-1">{empresa.nome}</div>
        <div className="border-t border-black pt-1">{d.cliente?.nome ?? 'Cliente'}</div>
      </footer>
    </article>
  )
}
