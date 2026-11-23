import { useEffect, useState } from 'react'
import { ArrowRight } from 'lucide-react'
import { Button, Campo, Input, Modal, Select, toast } from '@/components/ui'
import { useStore } from '@/store'
import type { Produto } from '@/types'
import { empresaPadraoParaNovo } from '@/lib/empresas'

/** Pedir transferência de peça entre empresas do grupo: gera uma saída na origem e uma entrada no destino. */
export function TransferenciaModal({ produto, aberto, aoFechar }: { produto: Produto; aberto: boolean; aoFechar: () => void }) {
  const empresas = useStore((s) => s.empresas)
  const movimentar = useStore((s) => s.movimentarEstoque)
  const [de, setDe] = useState('')
  const [para, setPara] = useState('')
  const [qtd, setQtd] = useState('1')

  useEffect(() => {
    if (!aberto) return
    const padrao = empresaPadraoParaNovo()
    // Origem: a empresa com mais estoque (que não seja o destino); destino: a empresa em vista.
    const origem = [...empresas].filter((e) => e.id !== padrao).sort((a, b) => (produto.estoquePorEmpresa?.[b.id] ?? 0) - (produto.estoquePorEmpresa?.[a.id] ?? 0))[0]
    setPara(padrao); setDe(origem?.id ?? ''); setQtd('1')
  }, [aberto, empresas, produto])

  const disponivel = produto.estoquePorEmpresa?.[de] ?? 0
  const n = Math.round(Number(qtd.replace(',', '.')))
  const erro = !(n > 0) ? 'Informe a quantidade' : n > disponivel ? `A origem só tem ${disponivel}` : de === para ? 'Origem e destino precisam ser diferentes' : undefined
  const nome = (id: string) => empresas.find((e) => e.id === id)?.nome ?? id

  function confirmar() {
    if (erro) return
    movimentar({ produtoId: produto.id, tipo: 'saida', quantidade: n, empresaId: de, valorUnit: produto.custo, origem: `Transferência para ${nome(para)} · nota fiscal de transferência` })
    movimentar({ produtoId: produto.id, tipo: 'entrada', quantidade: n, empresaId: para, valorUnit: produto.custo, origem: `Transferência de ${nome(de)} · nota fiscal de transferência` })
    toast.sucesso(`Transferência de ${n} un. pedida: ${nome(de)} para ${nome(para)}`)
    aoFechar()
  }

  return (
    <Modal
      aberto={aberto} aoFechar={aoFechar} largura="sm" titulo="Pedir transferência"
      rodape={<><Button variante="secundario" onClick={aoFechar}>Cancelar</Button><Button onClick={confirmar} disabled={!!erro}>Pedir transferência</Button></>}
    >
      <div className="grid gap-4">
        <p className="font-medium">{produto.nome}</p>
        <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-2">
          <Campo rotulo="De">
            <Select value={de} onChange={(e) => setDe(e.target.value)}>
              {empresas.map((e) => <option key={e.id} value={e.id}>{e.nomeCurto} · {e.cidade} ({produto.estoquePorEmpresa?.[e.id] ?? 0})</option>)}
            </Select>
          </Campo>
          <ArrowRight size={18} className="mb-3 text-mata-suave" aria-hidden />
          <Campo rotulo="Para">
            <Select value={para} onChange={(e) => setPara(e.target.value)}>
              {empresas.map((e) => <option key={e.id} value={e.id}>{e.nomeCurto} · {e.cidade}</option>)}
            </Select>
          </Campo>
        </div>
        <Campo rotulo="Quantidade" erro={erro && n > 0 ? erro : undefined}>
          <Input inputMode="numeric" value={qtd} onChange={(e) => setQtd(e.target.value)} />
        </Campo>
        <p className="rounded-campo bg-ambar-claro px-3 py-2 text-sm text-ambar-texto">Entre CNPJs diferentes a transferência sai com nota fiscal de transferência.</p>
      </div>
    </Modal>
  )
}
