import { useState } from 'react'
import { useStore } from '@/store'
import { Button, Modal, toast } from '@/components/ui'
import type { OrdemServico, StatusOS } from '@/types'
import { comStatus } from './status'

/** Move a OS de status; ao ir para "pronto" com peças, pergunta se dá baixa no estoque. */
export function useMoverOS() {
  const salvar = useStore((s) => s.salvar)
  const movimentar = useStore((s) => s.movimentarEstoque)
  const [pendente, setPendente] = useState<OrdemServico | null>(null)

  const pecas = (os: OrdemServico) => os.itens.filter((i) => i.tipo === 'peca' && i.produtoId)

  function mover(os: OrdemServico, novo: StatusOS) {
    if (os.status === novo) return
    if (novo === 'pronto' && pecas(os).length > 0 && !os.historico.some((h) => h.texto.startsWith('Baixa no estoque'))) {
      setPendente(comStatus(os, novo))
      return
    }
    salvar('ordens', comStatus(os, novo))
    toast.sucesso(`OS ${os.numero} movida para ${novo === 'pronto' ? 'pronto' : 'a próxima etapa'}`)
  }

  function concluir(darBaixa: boolean) {
    if (!pendente) return
    let os = pendente
    if (darBaixa) {
      for (const i of pecas(os)) movimentar({ produtoId: i.produtoId!, tipo: 'saida', quantidade: i.quantidade, origem: `OS ${os.numero}`, valorUnit: i.valorUnit })
      os = { ...os, historico: [...os.historico, { data: new Date().toISOString(), texto: 'Baixa no estoque das peças da OS' }] }
    }
    salvar('ordens', os)
    toast.sucesso(darBaixa ? `OS ${os.numero} pronta. Estoque atualizado.` : `OS ${os.numero} pronta`)
    setPendente(null)
  }

  const dialogo = (
    <Modal
      aberto={!!pendente} aoFechar={() => setPendente(null)} titulo="Dar baixa no estoque das peças?" largura="sm"
      rodape={<>
        <Button variante="secundario" onClick={() => concluir(false)}>Só marcar como pronta</Button>
        <Button onClick={() => concluir(true)}>Dar baixa e marcar como pronta</Button>
      </>}
    >
      <p className="text-sm text-mata-suave">
        {pendente ? `A OS ${pendente.numero} usa ${pecas(pendente).length} ${pecas(pendente).length === 1 ? 'peça' : 'peças'}. Quer registrar a saída delas do estoque agora?` : ''}
      </p>
    </Modal>
  )
  return { mover, dialogo }
}
