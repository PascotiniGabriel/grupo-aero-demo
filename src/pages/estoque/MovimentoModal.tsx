import { useEffect, useState } from 'react'
import { Button, Campo, Input, Modal, toast } from '@/components/ui'
import { useStore } from '@/store'
import type { Produto } from '@/types'
import { SelectEmpresa, empresaPadraoParaNovo, estoqueDe, useFiltroEmpresa } from '@/lib/empresas'

export function MovimentoModal({ produto, tipo, aoFechar }: { produto: Produto | null; tipo: 'entrada' | 'saida'; aoFechar: () => void }) {
  const movimentar = useStore((s) => s.movimentarEstoque)
  const [qtd, setQtd] = useState('1')
  const [origem, setOrigem] = useState('')
  const { multiplas } = useFiltroEmpresa()
  const [emp, setEmp] = useState(() => empresaPadraoParaNovo())
  const disponivel = produto ? estoqueDe(produto, [emp]) : 0
  useEffect(() => { if (produto) { setQtd('1'); setEmp(empresaPadraoParaNovo()); setOrigem(tipo === 'entrada' ? 'Compra de fornecedor' : 'Venda no balcão') } }, [produto, tipo])
  const n = Math.round(Number(qtd.replace(',', '.')))
  const invalido = !(n > 0) || (tipo === 'saida' && !!produto && n > disponivel)

  function confirmar() {
    if (!produto || invalido) return
    movimentar({ produtoId: produto.id, tipo, quantidade: n, empresaId: emp, origem: origem.trim() || (tipo === 'entrada' ? 'Entrada manual' : 'Saída manual') })
    toast.sucesso(tipo === 'entrada' ? `Entrada de ${n} un. registrada` : `Saída de ${n} un. registrada`)
    aoFechar()
  }

  return (
    <Modal
      aberto={!!produto} aoFechar={aoFechar} largura="sm" titulo={tipo === 'entrada' ? 'Dar entrada' : 'Dar saída'}
      rodape={<><Button variante="secundario" onClick={aoFechar}>Cancelar</Button><Button onClick={confirmar} disabled={invalido}>{tipo === 'entrada' ? 'Confirmar entrada' : 'Confirmar saída'}</Button></>}
    >
      {produto && (
        <div className="grid gap-4">
          <div>
            <p className="font-medium">{produto.nome}</p>
            <p className="text-sm text-mata-suave">Em estoque agora: <span className="num">{disponivel}</span> un.{multiplas ? ' nesta empresa' : ''}</p>
          </div>
          {multiplas && <Campo rotulo="Empresa"><SelectEmpresa valor={emp} aoMudar={setEmp} /></Campo>}
          <Campo rotulo="Quantidade" erro={tipo === 'saida' && n > disponivel ? 'Maior que o estoque disponível' : undefined}>
            <Input inputMode="numeric" value={qtd} onChange={(e) => setQtd(e.target.value)} autoFocus />
          </Campo>
          <Campo rotulo="Motivo ou origem"><Input value={origem} onChange={(e) => setOrigem(e.target.value)} /></Campo>
        </div>
      )}
    </Modal>
  )
}
