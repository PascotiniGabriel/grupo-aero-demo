import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { LogOut } from 'lucide-react'
import { Button } from '@/components/ui'
import { useStore } from '@/store'
import { planoDoCliente, sessaoSuporte, situacaoSuporte } from '@/lib/suporte'
import type { Cliente } from '@/types'
import { TelaCliente } from './comum'
import Login from './Login'
import Inicio from './Inicio'
import Chat from './Chat'

/** Tela pública do cliente: entra com celular e senha, vê o plano e abre o chat de um drone. */
export default function SuporteCliente() {
  const { equipamentoId } = useParams()
  const clientes = useStore((s) => s.clientes)
  const equipamentos = useStore((s) => s.equipamentos)
  const modelos = useStore((s) => s.modelos)
  const empresa = useStore((s) => s.empresa)
  const [sessao, setSessao] = useState(() => sessaoSuporte.ler())

  // a sessão só vale enquanto a senha continua a mesma (a equipe pode gerar uma nova)
  const cliente: Cliente | undefined = sessao ? clientes.find((c) => c.id === sessao.clienteId && c.suporte?.pin === sessao.pin) : undefined
  const sair = () => { sessaoSuporte.limpar(); setSessao(null) }

  if (!cliente) {
    return <Login aoEntrar={(c) => { sessaoSuporte.gravar(c.id, c.suporte!.pin); setSessao({ clienteId: c.id, pin: c.suporte!.pin }) }} />
  }

  const plano = planoDoCliente(cliente, empresa)
  if (situacaoSuporte(cliente) !== 'ativo' || !plano) {
    return (
      <TelaCliente>
        <h1 className="titulo text-2xl">Seu suporte não está ativo</h1>
        <p className="mt-2 text-mata-suave">Para voltar a tirar dúvidas pelo aplicativo, fale com a Aerobrasil pelo telefone:</p>
        <p className="mt-3 text-xl font-semibold tabular-nums">{empresa.fone}</p>
        <Button variante="secundario" className="mt-6 self-start" icone={<LogOut size={16} />} onClick={sair}>Sair</Button>
      </TelaCliente>
    )
  }

  if (equipamentoId) {
    const equipamento = equipamentos.find((e) => e.id === equipamentoId && e.clienteId === cliente.id)
    const modelo = modelos.find((m) => m.id === equipamento?.modeloId)
    if (equipamento && modelo) return <Chat key={equipamento.id} cliente={cliente} equipamento={equipamento} modelo={modelo} plano={plano} />
    return (
      <TelaCliente>
        <h1 className="titulo text-xl">Drone não encontrado</h1>
        <p className="mt-2 text-sm text-mata-suave">Esse drone não está no seu cadastro. Volte e escolha um da lista.</p>
        <a href="#/suporte" className="mt-4 inline-flex min-h-10 items-center text-ceu-texto underline">Meus drones</a>
      </TelaCliente>
    )
  }
  return <Inicio cliente={cliente} plano={plano} aoSair={sair} />
}
