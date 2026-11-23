import { useEffect, useMemo, useRef, useState } from 'react'
import { Check, Loader2, Search } from 'lucide-react'
import { Button, Campo, CampoBusca, Gaveta, Selo, cx, toast } from '@/components/ui'
import { useStore, novoId } from '@/store'
import { porId } from '@/store/selectors'
import { brl, numero, normalizar } from '@/lib/format'
import { SeloEmpresa, useEmpresaGrupo, useFiltroEmpresa } from '@/lib/empresas'
import type { ItemComercial, ItemNota, NotaFiscal } from '@/types'
import { chaveAleatoria, somarDias } from './xml'

const ETAPAS = ['Validando os dados', 'Transmitindo para a Sefaz', 'Nota autorizada']

export default function EmitirNota({ aoFechar }: { aoFechar: () => void }) {
  const { filtrar } = useFiltroEmpresa()
  const orcamentos = useStore((s) => s.orcamentos)
  const ordens = useStore((s) => s.ordens)
  const clientes = useStore((s) => s.clientes)
  const produtos = useStore((s) => s.produtos)
  const salvar = useStore((s) => s.salvar)
  const proximoNumero = useStore((s) => s.proximoNumero)
  const notas = useStore((s) => s.notas)
  const [origem, setOrigem] = useState('')
  const [busca, setBusca] = useState('')
  const [etapa, setEtapa] = useState(-1) // -1 = não iniciou
  const [emitidas, setEmitidas] = useState<NotaFiscal[]>([])
  const feito = useRef(false)

  const opcoes = useMemo(() => {
    const total = (l: ItemComercial[]) => l.reduce((t, i) => t + i.quantidade * i.valorUnit, 0)
    const jaEmitida = (ref: string) => notas.some((n) => n.origem === ref && n.status !== 'cancelada')
    return [
      ...filtrar(orcamentos).filter((o) => o.status === 'aprovado').map((o) => ({ tipo: 'Orçamento', status: 'Aprovado', numero: o.numero, data: o.data, valor: total(o.itens) - (o.desconto ?? 0) + (o.frete ?? 0), desconto: o.desconto ?? 0, frete: o.frete ?? 0, empresaId: o.empresaId, id: `orc:${o.id}`, cliente: porId(clientes, o.clienteId)?.nome ?? '', clienteId: o.clienteId, itens: o.itens.filter((i) => !i.opcional), ref: `Orçamento ${o.numero}`, jaEmitida: jaEmitida(`Orçamento ${o.numero}`), estoque: 'Estoque baixado na aprovação do orçamento' })),
      ...filtrar(ordens).filter((o) => o.status === 'pronto' || o.status === 'entregue').map((o) => ({ tipo: 'OS', status: o.status === 'pronto' ? 'Pronta' : 'Entregue', numero: o.numero, data: o.abertura, valor: total(o.itens), desconto: 0, frete: 0, empresaId: o.empresaId, id: `os:${o.id}`, cliente: porId(clientes, o.clienteId)?.nome ?? '', clienteId: o.clienteId, itens: o.itens, ref: `OS ${o.numero}`, jaEmitida: jaEmitida(`OS ${o.numero}`), estoque: o.itens.some((i) => i.tipo === 'peca') ? (o.historico.some((h) => h.texto.startsWith('Baixa no estoque')) ? 'Estoque já baixado nesta OS' : 'Peças da OS ainda sem baixa no estoque') : '' })),
    ]
  }, [orcamentos, ordens, clientes, notas, filtrar])

  const resultados = useMemo(() => {
    const q = normalizar(busca).trim()
    const lista = !q ? [...opcoes].sort((a, b) => b.data.localeCompare(a.data)) : opcoes.filter((o) => {
      const m = /^(os|orc\w*)?\s*(\d+)$/.exec(q)
      if (m) return String(o.numero).includes(m[2]) && (!m[1] || normalizar(o.tipo).startsWith(m[1].slice(0, 2)))
      return normalizar(`${o.tipo} ${o.numero} ${o.cliente} ${o.status}`).includes(q)
    })
    return lista.slice(0, 8)
  }, [busca, opcoes])

  const sel = opcoes.find((o) => o.id === origem)
  const emitente = useEmpresaGrupo(sel?.empresaId)
  const paraNota = (i: ItemComercial): ItemNota => ({
    descricao: i.descricao, ncm: i.tipo === 'servico' ? '00.00.00.00' : porId(produtos, i.produtoId)?.ncm ?? '0000.00.00',
    quantidade: i.quantidade, valorUnit: i.valorUnit, produtoId: i.produtoId,
  })
  const itensNFe = sel?.itens.filter((i) => i.tipo !== 'servico').map(paraNota) ?? []
  const itensNFSe = sel?.itens.filter((i) => i.tipo === 'servico').map(paraNota) ?? []
  const soma = (l: ItemNota[]) => l.reduce((s, i) => s + i.quantidade * i.valorUnit, 0)
  /** Desconto e frete do orçamento: vão na NF-e (ou o desconto na NFS-e, se não houver NF-e). */
  const ajuste = (t: string) => { if (!sel) return { d: 0, f: 0 }; const naNFe = itensNFe.length > 0; return (t === 'NF-e') === naNFe ? { d: sel.desconto, f: t === 'NF-e' ? sel.frete : 0 } : { d: 0, f: 0 } }
  const valorNota = (t: string, l: ItemNota[]) => { const a = ajuste(t); return soma(l) - a.d + a.f }
  const emitindo = etapa >= 0 && etapa < ETAPAS.length - 1
  const concluido = etapa === ETAPAS.length - 1

  useEffect(() => {
    if (!emitindo) return
    const t = setTimeout(() => setEtapa((e) => e + 1), 900)
    return () => clearTimeout(t)
  }, [etapa, emitindo])

  useEffect(() => {
    if (etapa !== ETAPAS.length - 1 || feito.current || !sel) return
    feito.current = true
    const notas: NotaFiscal[] = []
    const criar = (modelo: NotaFiscal['modelo'], itens: ItemNota[], natureza: string) => {
      const n: NotaFiscal = {
        id: novoId('nf'), numero: proximoNumero('nota'), serie: modelo === 'NFS-e' ? 'A1' : '1', tipo: 'saida', modelo, natureza,
        clienteId: sel.clienteId, empresaId: sel.empresaId, data: new Date().toISOString(), valor: Math.round(valorNota(modelo, itens) * 100) / 100, status: 'autorizada',
        chave: chaveAleatoria(), itens, origem: sel.ref,
      }
      salvar('notas', n); notas.push(n)
    }
    if (itensNFe.length) criar('NF-e', itensNFe, sel.itens.every((i) => i.tipo === 'drone') ? 'Venda de drone' : 'Venda de mercadoria')
    if (itensNFSe.length) criar('NFS-e', itensNFSe, 'Prestação de serviço de manutenção')
    const total = notas.reduce((s, n) => s + n.valor, 0)
    salvar('lancamentos', {
      id: novoId('lan'), tipo: 'receber', descricao: `${sel.ref}, ${porId(clientes, sel.clienteId)?.nome ?? 'cliente'}`, categoria: itensNFe.length ? 'Vendas' : 'Oficina',
      valor: total, vencimento: somarDias(30), clienteId: sel.clienteId, empresaId: sel.empresaId, forma: 'Boleto', origem: sel.ref,
    })
    setEmitidas(notas)
    toast.sucesso(notas.length > 1 ? 'Notas autorizadas' : 'Nota autorizada')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [etapa])

  return (
    <Gaveta
      aberta aoFechar={aoFechar} titulo="Emitir nota" largura="lg"
      rodape={concluido
        ? <Button onClick={aoFechar}>Concluir</Button>
        : <><Button variante="fantasma" onClick={aoFechar} disabled={emitindo}>Cancelar</Button><Button disabled={!sel || emitindo || (!itensNFe.length && !itensNFSe.length)} loading={emitindo} onClick={() => setEtapa(0)}>Emitir</Button></>}
    >
      <div className="space-y-4">
        {!sel ? (
          <Campo rotulo="Emitir a partir de" ajuda="Digite o número da OS ou do orçamento (ex.: 2101, OS 1041) ou o nome do cliente.">
            <div className="space-y-2">
              <CampoBusca valor={busca} aoMudar={setBusca} placeholder="Buscar OS, orçamento ou cliente" />
              {!busca.trim() && <p className="text-xs font-medium text-mata-suave">Mais recentes</p>}
              <ul className="divide-y divide-linha rounded-painel border border-linha">
                {resultados.map((o) => (
                  <li key={o.id}>
                    <button type="button" onClick={() => setOrigem(o.id)} className="flex min-h-12 w-full items-center gap-3 px-3 py-2 text-left hover:bg-nevoa">
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium"><span className="num">{o.tipo} {o.numero}</span> · {o.cliente}</span>
                        <span className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-mata-suave"><Selo cor={o.tipo === 'OS' ? 'azul' : 'verde'}>{o.status}</Selo>{o.jaEmitida && <Selo cor="ambar">Já tem nota</Selo>}<SeloEmpresa empresaId={o.empresaId} /></span>
                      </span>
                      <span className="num shrink-0 text-sm font-semibold">{brl(o.valor)}</span>
                    </button>
                  </li>
                ))}
                {resultados.length === 0 && <li className="flex items-center gap-2 px-3 py-4 text-sm text-mata-suave"><Search size={16} aria-hidden /> Nenhuma OS pronta ou orçamento aprovado encontrado.</li>}
              </ul>
            </div>
          </Campo>
        ) : (
          <div className="flex items-center gap-3 rounded-painel border border-linha bg-nevoa p-3">
            <p className="min-w-0 flex-1 truncate text-sm"><strong className="num">{sel.ref}</strong> · {sel.cliente} <span className="num text-mata-suave">· {brl(sel.valor)}</span></p>
            {etapa < 0 && <Button variante="secundario" tamanho="sm" onClick={() => setOrigem('')}>Trocar</Button>}
          </div>
        )}

        {sel && (
          <>
            {emitente && <p className="rounded-painel bg-nevoa p-3 text-sm"><span className="text-mata-suave">Emitente: </span><strong>{emitente.nome}</strong> <SeloEmpresa empresaId={sel.empresaId} /><span className="num block text-xs text-mata-suave">CNPJ {emitente.cnpj}</span></p>}
            {[{ t: 'NF-e', rotulo: 'Peças e equipamentos', itens: itensNFe }, { t: 'NFS-e', rotulo: 'Serviços', itens: itensNFSe }].filter((g) => g.itens.length).map((g) => (
              <div key={g.t} className="rounded-painel border border-linha">
                <div className="flex items-center justify-between border-b border-linha px-3 py-2"><span className="text-sm font-medium">{g.rotulo}</span><Selo cor="azul">{g.t}</Selo></div>
                <ul className="divide-y divide-linha">
                  {g.itens.map((i, k) => (
                    <li key={k} className="flex justify-between gap-3 px-3 py-2 text-sm"><span className="min-w-0 truncate">{numero(i.quantidade)} x {i.descricao}</span><span className="num shrink-0">{brl(i.quantidade * i.valorUnit)}</span></li>
                  ))}
                </ul>
                {ajuste(g.t).d > 0 && <p className="num flex justify-between border-t border-linha px-3 py-2 text-sm"><span>Desconto</span><span>- {brl(ajuste(g.t).d)}</span></p>}{ajuste(g.t).f > 0 && <p className="num flex justify-between border-t border-linha px-3 py-2 text-sm"><span>Frete</span><span>{brl(ajuste(g.t).f)}</span></p>}<p className="num border-t border-linha px-3 py-2 text-right text-sm font-semibold">{brl(valorNota(g.t, g.itens))}</p>
              </div>
            ))}
            {sel.jaEmitida && <p className="rounded-painel border border-ambar bg-nevoa p-3 text-sm text-ambar-texto">Já existe nota emitida para {sel.ref}. Confira antes de emitir de novo.</p>}
            <ul className="space-y-1 text-xs text-mata-suave">
              <li>Ao emitir, o sistema cria a conta a receber de {brl(valorNota('NF-e', itensNFe) + valorNota('NFS-e', itensNFSe))}, com vencimento em 30 dias.</li>
              {sel.estoque && <li>{sel.estoque}.</li>}
            </ul>
          </>
        )}

        {etapa >= 0 && (
          <ol className="space-y-2 rounded-painel bg-nevoa p-3" aria-live="polite">
            {ETAPAS.map((e, i) => (
              <li key={e} className={cx('flex items-center gap-2 text-sm', i > etapa && 'text-mata-suave')}>
                {i < etapa || concluido ? <Check size={16} className="text-lavoura-texto" aria-hidden /> : i === etapa ? <Loader2 size={16} className="animate-spin" aria-hidden /> : <span className="size-4" />}
                {e}
              </li>
            ))}
          </ol>
        )}
        {concluido && emitidas.length > 0 && (
          <div className="rounded-painel border border-lavoura bg-lavoura-claro p-3 text-sm">
            {emitidas.map((n) => <p key={n.id}>{n.modelo} {n.numero} autorizada, {brl(n.valor)}.</p>)}
            <p className="mt-1 text-xs text-mata-suave">Conta a receber criada no Financeiro{sel?.estoque ? `. ${sel.estoque}.` : '.'}</p>
          </div>
        )}
      </div>
    </Gaveta>
  )
}
