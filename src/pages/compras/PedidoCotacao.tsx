import type { Cotacao, Empresa } from '@/types'
import { LogoDocumento } from '@/components/layout/Marca'

const dt = (iso: string) => new Date(iso).toLocaleDateString('pt-BR')

export function textoPedido(c: Cotacao, empresa: Empresa, fornecedorNome?: string, osNumero?: number): string {
  const linhas = c.itens.map((it, i) => `${i + 1}. ${it.descricao} — ${it.quantidade} un`)
  return [
    `Olá${fornecedorNome ? `, ${fornecedorNome}` : ''}! Aqui é da ${empresa.nome}.`,
    `Pedido de cotação nº ${c.numero}${osNumero ? ` (para a OS ${osNumero})` : ''} — ${dt(c.criadaEm)}`,
    '',
    'Itens:',
    ...linhas,
    '',
    'Por favor, informe:',
    '- preço unitário de cada item',
    '- valor do frete',
    '- prazo de entrega',
    '',
    `Contato: ${empresa.fone} · ${empresa.email}`,
    'Obrigado!',
  ].join('\n')
}

export function PedidoDoc({ c, empresa, osNumero, fornecedorNome }: { c: Cotacao; empresa: Empresa; osNumero?: number; fornecedorNome?: string }) {
  return (
    <article className="folha-claro mx-auto max-w-[800px] bg-white p-6 text-[13px] leading-snug text-black print:p-0">
      <header className="flex items-start justify-between gap-4 border-b-2 border-black pb-3">
        <div>
          <LogoDocumento altura={64} className="mb-1" />
          <h1 className="sr-only">{empresa.nome}</h1>
          <p>CNPJ {empresa.cnpj}</p>
          <p>{empresa.endereco} · {empresa.cidade}</p>
          <p>{empresa.fone} · {empresa.email}</p>
        </div>
        <div className="text-right">
          <p className="titulo text-lg">Pedido de cotação</p>
          <p className="num">Nº {c.numero}</p>
          <p>Emitido em {dt(c.criadaEm)}</p>
          {osNumero && <p>Referente à OS {osNumero}</p>}
        </div>
      </header>
      {fornecedorNome && <p className="mt-4">À <strong>{fornecedorNome}</strong></p>}
      <p className="mt-4 font-semibold">{c.titulo}</p>
      <table className="mt-3 w-full border-collapse">
        <thead>
          <tr className="border-b border-black text-left">
            <th className="w-8 py-1">#</th><th className="py-1">Descrição</th><th className="w-20 py-1 text-right">Qtd.</th>
            <th className="w-28 py-1 text-right">Preço unit.</th>
          </tr>
        </thead>
        <tbody>
          {c.itens.map((it, i) => (
            <tr key={i} className="border-b border-black/30">
              <td className="num py-1.5">{i + 1}</td><td className="py-1.5">{it.descricao}</td>
              <td className="num py-1.5 text-right">{it.quantidade}</td><td className="py-1.5" />
            </tr>
          ))}
        </tbody>
      </table>
      <section className="mt-5 rounded border border-black p-3">
        <p className="font-semibold">Por favor, informe na resposta:</p>
        <ul className="mt-1 list-disc pl-5">
          <li>preço unitário de cada item;</li>
          <li>valor do frete e outras despesas, se houver;</li>
          <li>prazo de entrega e condição de pagamento.</li>
        </ul>
      </section>
      <p className="mt-4">Contato para resposta: {empresa.fone} · {empresa.email}</p>
    </article>
  )
}
