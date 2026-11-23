import { Check, Trophy } from 'lucide-react'
import type { Cotacao, Fornecedor } from '@/types'
import { Button, Painel, Selo, cx } from '@/components/ui'
import { brl } from '@/lib/format'
import { faltantes, melhorPorItem, melhorResposta, menorPrecoItem, pesoTotalDe, produtosDe, totalDe } from './calculo'

export function Comparativo({ c, fornecedores, aoEscolher }: { c: Cotacao; fornecedores: Fornecedor[]; aoEscolher: (fornecedorId: string) => void }) {
  const resps = c.respostas
  const nome = (id: string) => fornecedores.find((f) => f.id === id)?.nome ?? 'Fornecedor'
  const melhor = melhorResposta(c)
  const combo = melhorPorItem(c)
  const fechada = c.status === 'fechada'

  if (resps.length === 0) return <p className="text-sm text-mata-suave">Lance a resposta de ao menos um fornecedor para comparar.</p>

  const celula = 'px-3 py-2 text-right num whitespace-nowrap'
  const destaque = (b: boolean) => (b ? 'bg-lavoura-claro text-lavoura-texto font-semibold' : '')

  return (
    <div className="flex flex-col gap-4">
      <div className="overflow-x-auto rounded-campo border border-linha">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-linha bg-nevoa">
              <th className="min-w-40 px-3 py-2 text-left font-medium">Item</th>
              {resps.map((r) => (
                <th key={r.fornecedorId} className={cx('min-w-32 px-3 py-2 text-right font-medium', melhor?.fornecedorId === r.fornecedorId && 'text-lavoura-texto')}>
                  {nome(r.fornecedorId)}
                  {c.escolhidaId === r.fornecedorId && <span className="block text-xs font-normal">Escolhido</span>}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {c.itens.map((it, i) => {
              const menor = menorPrecoItem(c, i)
              return (
                <tr key={i} className="border-b border-linha">
                  <td className="px-3 py-2">{it.descricao} <span className="num text-xs text-mata-suave">× {it.quantidade}</span></td>
                  {resps.map((r) => {
                    const p = r.precos[i]
                    return (
                      <td key={r.fornecedorId} className={cx(celula, p > 0 && p === menor && destaque(true))}>
                        {p > 0 ? <>{brl(p)}<span className="block text-xs font-normal opacity-80">{brl(p * it.quantidade)}</span></> : <span className="text-mata-suave">sem preço</span>}
                      </td>
                    )
                  })}
                </tr>
              )
            })}
            <tr className="border-b border-linha"><td className="px-3 py-2 font-medium">Produtos</td>{resps.map((r) => <td key={r.fornecedorId} className={celula}>{brl(produtosDe(c, r))}</td>)}</tr>
            <tr className="border-b border-linha"><td className="px-3 py-2 font-medium">Frete</td>{resps.map((r) => <td key={r.fornecedorId} className={celula}>{brl(r.frete)}</td>)}</tr>
            <tr className="border-b border-linha"><td className="px-3 py-2 font-medium">Outras despesas</td>{resps.map((r) => <td key={r.fornecedorId} className={celula}>{brl(r.outrasDespesas)}</td>)}</tr>
            <tr className="border-b border-linha bg-nevoa">
              <td className="px-3 py-2 font-semibold">Total</td>
              {resps.map((r) => <td key={r.fornecedorId} className={cx(celula, 'font-semibold', destaque(melhor?.fornecedorId === r.fornecedorId))}>{brl(totalDe(c, r))}</td>)}
            </tr>
            {resps.some((r) => pesoTotalDe(c, r) > 0) && (
              <tr className="border-b border-linha"><td className="px-3 py-2 font-medium">Peso total</td>{resps.map((r) => <td key={r.fornecedorId} className={celula}>{pesoTotalDe(c, r) > 0 ? `${pesoTotalDe(c, r).toLocaleString('pt-BR', { maximumFractionDigits: 2 })} kg` : <span className="text-mata-suave">não informado</span>}</td>)}</tr>
            )}
            <tr className="border-b border-linha"><td className="px-3 py-2 font-medium">Prazo</td>{resps.map((r) => <td key={r.fornecedorId} className={celula}>{r.prazoDias} dias</td>)}</tr>
            <tr>
              <td className="px-3 py-2 text-xs text-mata-suave">{resps.some((r) => faltantes(c, r) > 0) ? 'Totais de quem não cotou tudo estão incompletos.' : ''}</td>
              {resps.map((r) => (
                <td key={r.fornecedorId} className="px-3 py-2 text-right">
                  {fechada ? (c.escolhidaId === r.fornecedorId && <Selo cor="verde" icone={<Check size={12} />}>Escolhido</Selo>)
                    : <Button tamanho="sm" variante={melhor?.fornecedorId === r.fornecedorId ? 'primario' : 'secundario'} onClick={() => aoEscolher(r.fornecedorId)}>Escolher fornecedor</Button>}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>

      {melhor && (
        <p className="flex items-center gap-2 text-sm"><Trophy size={16} className="text-lavoura-texto" aria-hidden />Melhor total: <strong>{nome(melhor.fornecedorId)}</strong> por <strong className="num">{brl(totalDe(c, melhor))}</strong>.</p>
      )}

      <Painel titulo="Melhor por item">
        <p className="text-sm text-mata-suave">Comprando cada item do fornecedor mais barato{combo.fornecedores > 1 ? `, em ${combo.fornecedores} fornecedores` : ''}:</p>
        <dl className="num mt-2 grid max-w-sm grid-cols-[1fr_auto] gap-x-6 gap-y-1 text-sm">
          <dt>Produtos</dt><dd className="text-right">{brl(combo.produtos)}</dd>
          <dt>Fretes somados</dt><dd className="text-right">{brl(combo.frete)}</dd>
          <dt>Outras despesas</dt><dd className="text-right">{brl(combo.outras)}</dd>
          <dt className="font-semibold">Total</dt><dd className={cx('text-right font-semibold', melhor && combo.total < totalDe(c, melhor) && 'text-lavoura-texto')}>{brl(combo.total)}</dd>
        </dl>
        {combo.semPreco > 0 && <p className="mt-2 text-xs text-ambar-texto">{combo.semPreco} {combo.semPreco === 1 ? 'item não tem' : 'itens não têm'} preço em nenhuma resposta.</p>}
        {melhor && combo.semPreco === 0 && (
          <p className="mt-2 text-xs text-mata-suave">
            {combo.total < totalDe(c, melhor) ? `Economia de ${brl(totalDe(c, melhor) - combo.total)} sobre o melhor fornecedor único, com mais de uma entrega.` : 'Nesta cotação, um único fornecedor já sai igual ou mais barato.'}
          </p>
        )}
      </Painel>
    </div>
  )
}
