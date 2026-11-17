import { useState } from 'react'
import { Headset, KeyRound, MessageCircle, Power, RefreshCw } from 'lucide-react'
import { Button, Campo, Confirmar, Input, Modal, Painel, Select, Selo, toast, type CorSelo } from '@/components/ui'
import { useStore } from '@/store'
import { brl, dataCurta } from '@/lib/format'
import { gerarPin, linkWhatsApp, planoDoCliente, situacaoSuporte, textoAcesso, textoSituacao, usoSuporte } from '@/lib/suporte'
import type { Cliente } from '@/types'
import { deInput, paraInput } from './calc'

const COR: Record<ReturnType<typeof situacaoSuporte>, CorSelo> = { ativo: 'verde', vencido: 'vermelho', desativado: 'neutro', sem_plano: 'neutro' }

function Uso({ rotulo, usado, limite }: { rotulo: string; usado: number; limite: number }) {
  return (
    <div className="rounded-campo border border-linha p-2.5">
      <p className="text-xs text-mata-suave">{rotulo}</p>
      <p className="num text-lg font-semibold">{usado} <span className="text-sm font-normal text-mata-suave">de {limite}</span></p>
    </div>
  )
}

export function PainelSuporte({ cliente }: { cliente: Cliente }) {
  const empresa = useStore((s) => s.empresa)
  const chamados = useStore((s) => s.chamados)
  const salvar = useStore((s) => s.salvar)
  const planos = empresa.planosSuporte ?? []
  const sup = cliente.suporte
  const plano = planoDoCliente(cliente, empresa)
  const sit = situacaoSuporte(cliente)
  const uso = usoSuporte(cliente.id, chamados)

  const [modal, setModal] = useState(false)
  const [planoId, setPlanoId] = useState('')
  const [validade, setValidade] = useState('')
  const [desativar, setDesativar] = useState(false)

  function abrir() {
    setPlanoId(sup?.planoId ?? planos[0]?.id ?? '')
    const d = new Date()
    if (sup && sit === 'ativo') setValidade(paraInput(sup.ativoAte))
    else { d.setMonth(d.getMonth() + (sup ? 1 : 12)); setValidade(paraInput(d.toISOString())) }
    setModal(true)
  }
  function gravar() {
    const ativoAte = deInput(validade)
    if (!planoId || !ativoAte) { toast.erro('Escolha o plano e a validade'); return }
    salvar('clientes', { ...cliente, suporte: { ...(sup ?? {}), planoId, ativoAte, pin: sup?.pin ?? gerarPin(), ativo: true } })
    toast.sucesso(sup ? 'Plano atualizado' : 'Plano ativado')
    setModal(false)
  }
  function novaSenha() {
    if (!sup) return
    salvar('clientes', { ...cliente, suporte: { ...sup, pin: gerarPin() } })
    toast.sucesso('Senha nova gerada. Envie o acesso de novo ao cliente')
  }
  function enviarAcesso() {
    if (!sup) return
    window.open(linkWhatsApp(cliente.fone, textoAcesso(cliente)), '_blank', 'noreferrer')
    salvar('clientes', { ...cliente, suporte: { ...sup, acessoEnviadoEm: new Date().toISOString() } })
  }
  function desativarPlano() {
    if (sup) salvar('clientes', { ...cliente, suporte: { ...sup, ativo: false } })
    setDesativar(false)
    toast.sucesso('Suporte desativado')
  }

  return (
    <Painel titulo="Plano de suporte" acoes={<Selo cor={COR[sit]}>{textoSituacao(cliente)}</Selo>}>
      {!sup || !plano ? (
        <div className="space-y-3">
          <p className="text-sm text-mata-suave">Este cliente ainda não tem acesso ao Suporte Aerobrasil (agente de IA no celular dele).</p>
          <Button icone={<Headset size={16} />} onClick={abrir}>Ativar plano</Button>
        </div>
      ) : (
        <div className="space-y-3">
          <div>
            <p className="font-medium">{plano.nome} <span className="text-sm font-normal text-mata-suave">· {plano.precoMensal === 0 ? 'grátis' : `${brl(plano.precoMensal)} por mês`} · {plano.atendimento}</span></p>
            {plano.incluso && <p className="text-xs text-mata-suave">{plano.incluso}</p>}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Uso rotulo="Perguntas à IA este mês" usado={uso.perguntas} limite={plano.perguntasIAMes} />
            <Uso rotulo="Atendimentos da equipe" usado={uso.chamados} limite={plano.chamadosEquipeMes} />
          </div>
          <p className="text-sm text-mata-suave">
            Celular de acesso: <span className="num text-mata">{cliente.fone}</span> · senha <span className="num text-mata">{sup.pin}</span>
            <br />{sup.acessoEnviadoEm ? `Acesso enviado em ${dataCurta(sup.acessoEnviadoEm)}` : 'Acesso ainda não enviado'}
          </p>
          <div className="flex flex-wrap gap-2">
            <Button icone={<MessageCircle size={16} />} onClick={enviarAcesso} disabled={!sup.ativo}>Enviar acesso pelo WhatsApp</Button>
            <Button variante="secundario" icone={<RefreshCw size={16} />} onClick={abrir}>{sit === 'ativo' ? 'Trocar plano' : 'Ativar plano'}</Button>
            <Button variante="secundario" icone={<KeyRound size={16} />} onClick={novaSenha}>Gerar nova senha</Button>
            {sup.ativo && <Button variante="fantasma" icone={<Power size={16} />} onClick={() => setDesativar(true)}>Desativar</Button>}
          </div>
        </div>
      )}

      <Modal aberto={modal} aoFechar={() => setModal(false)} titulo={sup ? 'Trocar plano de suporte' : 'Ativar plano de suporte'} largura="sm"
        rodape={<><Button variante="secundario" onClick={() => setModal(false)}>Cancelar</Button><Button onClick={gravar}>{sup ? 'Salvar' : 'Ativar plano'}</Button></>}>
        <div className="space-y-3">
          <Campo rotulo="Plano">
            <Select value={planoId} onChange={(e) => setPlanoId(e.target.value)}>
              {planos.map((p) => <option key={p.id} value={p.id}>{p.nome} · {p.precoMensal === 0 ? 'grátis' : `${brl(p.precoMensal)}/mês`} · {p.perguntasIAMes} perguntas</option>)}
            </Select>
          </Campo>
          <Campo rotulo="Vale até"><Input type="date" value={validade} onChange={(e) => setValidade(e.target.value)} /></Campo>
          {!sup && <p className="text-xs text-mata-suave">Uma senha de 4 números é criada na ativação. Depois, envie o acesso pelo WhatsApp.</p>}
        </div>
      </Modal>
      <Confirmar aberto={desativar} titulo="Desativar o suporte deste cliente?" texto="Ele deixa de conseguir usar o agente de IA até você ativar de novo." rotuloConfirmar="Desativar" perigo aoConfirmar={desativarPlano} aoCancelar={() => setDesativar(false)} />
    </Painel>
  )
}
