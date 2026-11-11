import { useEffect, useMemo, useState } from 'react'
import { QrCode } from 'lucide-react'
import { useStore } from '@/store'
import { Button, Campo, Gaveta, Input, Select, toast } from '@/components/ui'
import { useLeitorQR, localizarCodigo } from '@/components/qr/LeitorQR'
import { nomeModelo } from '@/store/selectors'
import { diasAFrente } from '@/data/seed'
import { CampoDitado } from './CampoDitado'
import type { OrdemServico } from '@/types'

const diaISO = (iso: string) => iso.slice(0, 10)

export function NovaOSGaveta({ aberta, aoFechar, equipamentoInicial, aoCriar }: {
  aberta: boolean; aoFechar: () => void; equipamentoInicial?: string; aoCriar: (os: OrdemServico) => void
}) {
  const clientes = useStore((s) => s.clientes)
  const equipamentos = useStore((s) => s.equipamentos)
  const modelos = useStore((s) => s.modelos)
  const produtos = useStore((s) => s.produtos)
  const usuarios = useStore((s) => s.usuarios)
  const salvar = useStore((s) => s.salvar)
  const proximoNumero = useStore((s) => s.proximoNumero)
  const { abrir } = useLeitorQR()

  const tecnicos = useMemo(() => usuarios.filter((u) => u.papel === 'Técnico'), [usuarios])
  const [clienteId, setClienteId] = useState('')
  const [equipId, setEquipId] = useState('')
  const [relato, setRelato] = useState('')
  const [tecnico, setTecnico] = useState('')
  const [previsao, setPrevisao] = useState(() => diaISO(diasAFrente(7)))
  const [erro, setErro] = useState('')

  useEffect(() => {
    if (!aberta) return
    const eq = equipamentos.find((e) => e.id === equipamentoInicial)
    setClienteId(eq?.clienteId ?? ''); setEquipId(eq?.id ?? ''); setRelato(''); setErro('')
    setTecnico(tecnicos[0]?.nome ?? ''); setPrevisao(diaISO(diasAFrente(7)))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aberta, equipamentoInicial])

  const dronesDoCliente = equipamentos.filter((e) => e.clienteId === clienteId)

  function lerQR() {
    abrir({
      titulo: 'Ler QR do drone',
      aoLer: (codigo) => {
        const r = localizarCodigo(codigo, produtos, equipamentos)
        if (r.tipo === 'equipamento') { setClienteId(r.equipamento.clienteId); setEquipId(r.equipamento.id); setErro(''); toast.sucesso('Drone identificado') }
        else toast.erro('Esse código não é de um drone cadastrado.')
      },
    })
  }

  function criar() {
    if (!clienteId) return setErro('Escolha o cliente.')
    if (!equipId) return setErro('Escolha o drone do cliente.')
    const numero = proximoNumero('os')
    const agora = new Date().toISOString()
    const os: OrdemServico = {
      id: `os-${numero}`, numero, clienteId, equipamentoId: equipId, status: 'recebido',
      abertura: agora, previsao: new Date(`${previsao}T12:00:00`).toISOString(),
      tecnico, relatoCliente: relato.trim(), diagnostico: '', itens: [], fotos: [],
      historico: [{ data: agora, texto: 'OS aberta' }],
    }
    salvar('ordens', os)
    toast.sucesso(`OS ${numero} aberta`)
    aoCriar(os)
  }

  return (
    <Gaveta
      aberta={aberta} aoFechar={aoFechar} titulo="Nova ordem de serviço" largura="md"
      rodape={<><Button variante="secundario" onClick={aoFechar}>Cancelar</Button><Button onClick={criar}>Abrir OS</Button></>}
    >
      <div className="space-y-4">
        <Button variante="secundario" bloco icone={<QrCode size={18} />} onClick={lerQR}>Ler QR do drone</Button>
        <Campo rotulo="Cliente" obrigatorio>
          <Select value={clienteId} onChange={(e) => { setClienteId(e.target.value); setEquipId(''); setErro('') }}>
            <option value="">Escolha o cliente</option>
            {clientes.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
          </Select>
        </Campo>
        <Campo rotulo="Drone" obrigatorio ajuda={clienteId && dronesDoCliente.length === 0 ? 'Este cliente ainda não tem drone cadastrado.' : undefined}>
          <Select value={equipId} onChange={(e) => { setEquipId(e.target.value); setErro('') }} disabled={!clienteId}>
            <option value="">{clienteId ? 'Escolha o drone' : 'Escolha o cliente primeiro'}</option>
            {dronesDoCliente.map((e) => (
              <option key={e.id} value={e.id}>{nomeModelo(e.modeloId, modelos)} · {e.serial}{e.apelido ? ` · ${e.apelido}` : ''}</option>
            ))}
          </Select>
        </Campo>
        <Campo rotulo="O que o cliente relatou">
          <CampoDitado rotulo="Relato do cliente" valor={relato} aoMudar={setRelato} placeholder="Ex.: caiu na lavoura e o braço 3 trincou" />
        </Campo>
        <div className="grid gap-4 sm:grid-cols-2">
          <Campo rotulo="Técnico responsável">
            <Select value={tecnico} onChange={(e) => setTecnico(e.target.value)}>
              {tecnicos.map((u) => <option key={u.id} value={u.nome}>{u.nome}</option>)}
            </Select>
          </Campo>
          <Campo rotulo="Previsão de entrega">
            <Input type="date" value={previsao} onChange={(e) => setPrevisao(e.target.value)} />
          </Campo>
        </div>
        {erro && <p role="alert" className="text-sm text-barro">{erro}</p>}
      </div>
    </Gaveta>
  )
}
