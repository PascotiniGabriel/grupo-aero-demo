import { useEffect, useMemo, useRef, useState } from 'react'
import { Check, Loader2 } from 'lucide-react'
import { Button, Campo, Gaveta, Select, Selo, cx, toast } from '@/components/ui'
import { useStore, novoId } from '@/store'
import { porId } from '@/store/selectors'
import { brl, numero } from '@/lib/format'
import type { ItemComercial, ItemNota, NotaFiscal } from '@/types'
import { chaveAleatoria, somarDias } from './xml'

const ETAPAS = ['Validando os dados', 'Transmitindo para a Sefaz', 'Nota autorizada']

export default function EmitirNota({ aoFechar }: { aoFechar: () => void }) {
  const orcamentos = useStore((s) => s.orcamentos)
  const ordens = useStore((s) => s.ordens)
  const clientes = useStore((s) => s.clientes)
  const produtos = useStore((s) => s.produtos)
  const salvar = useStore((s) => s.salvar)
  const proximoNumero = useStore((s) => s.proximoNumero)
  const [origem, setOrigem] = useState('')
  const [etapa, setEtapa] = useState(-1) // -1 = não iniciou
  const [emitidas, setEmitidas] = useState<NotaFiscal[]>([])
  const feito = useRef(false)

  const opcoes = useMemo(() => [
    ...orcamentos.filter((o) => o.status === 'aprovado').map((o) => ({ id: `orc:${o.id}`, rotulo: `Orçamento ${o.numero} · ${porId(clientes, o.clienteId)?.nome ?? ''}`, clienteId: o.clienteId, itens: o.itens, ref: `Orçamento ${o.numero}` })),
    ...ordens.filter((o) => o.status === 'pronto' || o.status === 'entregue').map((o) => ({ id: `os:${o.id}`, rotulo: `OS ${o.numero} · ${porId(clientes, o.clienteId)?.nome ?? ''}`, clienteId: o.clienteId, itens: o.itens, ref: `OS ${o.numero}` })),
  ], [orcamentos, ordens, clientes])

  const sel = opcoes.find((o) => o.id === origem)
  const paraNota = (i: ItemComercial): ItemNota => ({
    descricao: i.descricao, ncm: i.tipo === 'servico' ? '00.00.00.00' : porId(produtos, i.produtoId)?.ncm ?? '0000.00.00',
    quantidade: i.quantidade, valorUnit: i.valorUnit, produtoId: i.produtoId,
  })
  const itensNFe = sel?.itens.filter((i) => i.tipo !== 'servico').map(paraNota) ?? []
  const itensNFSe = sel?.itens.filter((i) => i.tipo === 'servico').map(paraNota) ?? []
  const soma = (l: ItemNota[]) => l.reduce((s, i) => s + i.quantidade * i.valorUnit, 0)
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
        clienteId: sel.clienteId, data: new Date().toISOString(), valor: Math.round(soma(itens) * 100) / 100, status: 'autorizada',
        chave: chaveAleatoria(), itens, origem: sel.ref,
      }
      salvar('notas', n); notas.push(n)
    }
    if (itensNFe.length) criar('NF-e', itensNFe, sel.itens.every((i) => i.tipo === 'drone') ? 'Venda de drone' : 'Venda de mercadoria')
    if (itensNFSe.length) criar('NFS-e', itensNFSe, 'Prestação de serviço de manutenção')
    const total = notas.reduce((s, n) => s + n.valor, 0)
    salvar('lancamentos', {
      id: novoId('lan'), tipo: 'receber', descricao: `${sel.ref}, ${porId(clientes, sel.clienteId)?.nome ?? 'cliente'}`, categoria: itensNFe.length ? 'Vendas' : 'Oficina',
      valor: total, vencimento: somarDias(30), clienteId: sel.clienteId, forma: 'Boleto', origem: sel.ref,
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
        <Campo rotulo="Emitir a partir de" ajuda="Orçamentos aprovados e ordens de serviço prontas ou entregues.">
          <Select value={origem} onChange={(e) => setOrigem(e.target.value)} disabled={etapa >= 0}>
            <option value="">Escolha um orçamento ou uma OS</option>
            {opcoes.map((o) => <option key={o.id} value={o.id}>{o.rotulo}</option>)}
          </Select>
        </Campo>

        {sel && (
          <>
            {[{ t: 'NF-e', rotulo: 'Peças e equipamentos', itens: itensNFe }, { t: 'NFS-e', rotulo: 'Serviços', itens: itensNFSe }].filter((g) => g.itens.length).map((g) => (
              <div key={g.t} className="rounded-painel border border-linha">
                <div className="flex items-center justify-between border-b border-linha px-3 py-2"><span className="text-sm font-medium">{g.rotulo}</span><Selo cor="azul">{g.t}</Selo></div>
                <ul className="divide-y divide-linha">
                  {g.itens.map((i, k) => (
                    <li key={k} className="flex justify-between gap-3 px-3 py-2 text-sm"><span className="min-w-0 truncate">{numero(i.quantidade)} x {i.descricao}</span><span className="num shrink-0">{brl(i.quantidade * i.valorUnit)}</span></li>
                  ))}
                </ul>
                <p className="num border-t border-linha px-3 py-2 text-right text-sm font-semibold">{brl(soma(g.itens))}</p>
              </div>
            ))}
            <p className="text-xs text-mata-suave">Ao emitir, o sistema também cria a conta a receber de {brl(soma(itensNFe) + soma(itensNFSe))}, com vencimento em 30 dias.</p>
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
          </div>
        )}
      </div>
    </Gaveta>
  )
}
