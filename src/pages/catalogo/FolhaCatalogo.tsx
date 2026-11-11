import { useStore } from '@/store'
import { brl, dataCurta } from '@/lib/format'
import type { GrupoDiagrama, ModeloDrone, Produto } from '@/types'
import { GRUPOS, ORDEM_GRUPOS } from '../estoque/comum'

/** Documento do catálogo de peças para enviar ao cliente (fica dentro de `.folha-impressao`). */
export function FolhaCatalogo({ modelo, pecas, ocultarPrecos }: { modelo: ModeloDrone; pecas: Produto[]; ocultarPrecos: boolean }) {
  const empresa = useStore((s) => s.empresa)
  const modelos = useStore((s) => s.modelos)
  const nomes = (ids: string[]) => (ids.length ? ids.map((m) => modelos.find((x) => x.id === m)?.nome ?? m).join(', ') : 'Todos os modelos')

  const secoes: { chave: string; titulo: string; itens: Produto[] }[] = [
    ...ORDEM_GRUPOS.map((g: GrupoDiagrama) => ({ chave: g, titulo: GRUPOS[g], itens: pecas.filter((p) => p.grupo === g) })),
    { chave: 'outros', titulo: 'Outras peças e acessórios', itens: pecas.filter((p) => !p.grupo) },
  ].filter((s) => s.itens.length > 0)

  return (
    <div className="mx-auto max-w-[210mm] bg-white p-8 text-[13px] text-black print:p-0">
      <section className="flex min-h-[220mm] flex-col justify-between border-b-2 border-black pb-10" style={{ breakAfter: 'page' }}>
        <div>
          <p className="text-sm uppercase tracking-wide">{empresa.nome}</p>
          <p className="mt-1 text-xs">CNPJ {empresa.cnpj} · {empresa.cidade} · {empresa.fone}</p>
        </div>
        <div>
          <h1 className="titulo text-5xl leading-tight">Catálogo de peças</h1>
          <p className="titulo mt-2 text-3xl">Agras {modelo.nome}</p>
          <p className="mt-4 max-w-md text-base">
            Peças compatíveis com o Agras {modelo.nome}, {modelo.rotores === 8 ? 'com 8 rotores coaxiais' : 'com 4 rotores'} e tanque de {modelo.tanqueL} litros.
            {ocultarPrecos ? ' Consulte nossa equipe para valores e prazos.' : ''}
          </p>
        </div>
        <div className="text-xs">
          <p>{empresa.email}</p>
          <p>Emitido em {dataCurta(new Date().toISOString())}{ocultarPrecos ? '' : '. Valores sujeitos a alteração sem aviso.'}</p>
        </div>
      </section>

      {secoes.map((s) => (
        <section key={s.chave} className="mt-6" style={{ breakInside: 'avoid-page' }}>
          <h2 className="titulo border-b border-black pb-1 text-lg">{s.titulo}</h2>
          <table className="mt-2 w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-black/40 text-[11px]">
                <th className="py-1 pr-2 font-semibold">Código</th>
                <th className="py-1 pr-2 font-semibold">Descrição</th>
                <th className="py-1 pr-2 font-semibold">Serve no</th>
                {!ocultarPrecos && <th className="py-1 text-right font-semibold">Preço</th>}
              </tr>
            </thead>
            <tbody>
              {s.itens.map((p) => (
                <tr key={p.id} className="border-b border-black/15 align-top" style={{ breakInside: 'avoid' }}>
                  <td className="serial py-1.5 pr-2 text-[11px]">{p.sku}</td>
                  <td className="py-1.5 pr-2">{p.nome}</td>
                  <td className="py-1.5 pr-2">{nomes(p.modelosCompativeis)}</td>
                  {!ocultarPrecos && <td className="num py-1.5 text-right">{brl(p.preco)}</td>}
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ))}
    </div>
  )
}
