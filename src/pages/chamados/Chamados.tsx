import { useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ExternalLink, QrCode, Printer } from 'lucide-react'
import { Button, CabecalhoPagina, Modal, Select, Painel, EstadoVazio, Selo, cx } from '@/components/ui'
import { EtiquetaQR } from '@/components/qr/EtiquetaQR'
import { Marca } from '@/components/layout/Marca'
import { useStore } from '@/store'
import { SeloEmpresa, useFiltroEmpresa } from '@/lib/empresas'
import { relativo } from '@/lib/format'
import type { Chamado } from '@/types'
import { ORDEM, SeloChamado, SeloPlano } from './comum'

type Filtro = 'todos' | Chamado['status']
const FILTROS: { id: Filtro; rotulo: string }[] = [
  { id: 'todos', rotulo: 'Todos' }, { id: 'aguardando_equipe', rotulo: 'Precisa da equipe' },
  { id: 'equipe', rotulo: 'Com a equipe' }, { id: 'ia', rotulo: 'Resolvido pela IA' }, { id: 'resolvido', rotulo: 'Resolvido' },
]

export default function Chamados() {
  const todosChamados = useStore((s) => s.chamados)
  const { filtrar } = useFiltroEmpresa()
  const chamados = useMemo(() => filtrar(todosChamados), [todosChamados, filtrar])
  const clientes = useStore((s) => s.clientes)
  const equipamentos = useStore((s) => s.equipamentos)
  const modelos = useStore((s) => s.modelos)
  const [filtro, setFiltro] = useState<Filtro>('todos')
  const [qr, setQr] = useState(false)
  const [eqpQr, setEqpQr] = useState('')
  const adesivo = useRef<HTMLDivElement>(null)
  function imprimir() {
    const w = window.open('', '_blank', 'width=420,height=620')
    if (!w || !adesivo.current) return
    w.document.write(`<title>Adesivo QR</title><body style="font-family:sans-serif;text-align:center;margin:24px">${adesivo.current.innerHTML}</body>`)
    w.document.close()
    setTimeout(() => w.print(), 400)
  }

  const nomeEqp = (id?: string) => {
    const e = equipamentos.find((x) => x.id === id)
    return e ? `${modelos.find((m) => m.id === e.modeloId)?.nome ?? 'Drone'} · ${e.serial}` : 'Sem drone'
  }
  const lista = useMemo(
    () => chamados.filter((c) => filtro === 'todos' || c.status === filtro).sort((a, b) => ORDEM[a.status] - ORDEM[b.status] || b.atualizadoEm.localeCompare(a.atualizadoEm)),
    [chamados, filtro],
  )
  const contar = (s: Filtro) => (s === 'todos' ? chamados.length : chamados.filter((c) => c.status === s).length)
  const abertos = chamados.filter((c) => c.status === 'aguardando_equipe' || c.status === 'equipe').length
  const porIA = chamados.filter((c) => c.status === 'ia').length
  const demoEqp = chamados.find((c) => c.equipamentoId)?.equipamentoId ?? equipamentos[0]?.id
  const alvo = eqpQr || demoEqp || ''
  const eAlvo = equipamentos.find((e) => e.id === alvo)
  const base = typeof window !== 'undefined' ? window.location.href.split('#')[0] : ''
  const url = `${base}#/suporte/${alvo}`

  return (
    <div>
      <CabecalhoPagina
        titulo="Chamados de suporte"
        descricao={`${abertos} em aberto · ${porIA} resolvidos pela IA`}
        acoes={<>
          <Button variante="secundario" icone={<QrCode size={16} />} onClick={() => setQr(true)}>Opcional: adesivo no drone</Button>
          {demoEqp && <a href="#/suporte" target="_blank" rel="noreferrer"><Button icone={<ExternalLink size={16} />}>Abrir como cliente</Button></a>}
        </>}
      />

      <div className="mb-4 flex flex-wrap gap-2">
        {FILTROS.map((f) => (
          <button key={f.id} onClick={() => setFiltro(f.id)} aria-pressed={filtro === f.id}
            className={cx('min-h-10 rounded-full border px-3.5 text-sm', filtro === f.id ? 'border-forte bg-forte text-white' : 'border-linha bg-papel hover:bg-nevoa')}>
            {f.rotulo} <span className="tabular-nums opacity-70">{contar(f.id)}</span>
          </button>
        ))}
      </div>

      {lista.length === 0 ? <Painel><EstadoVazio titulo="Nenhum chamado" texto="Nada por aqui neste filtro." /></Painel> : (
        <ul className="space-y-2">
          {lista.map((c) => {
            const ult = c.mensagens[c.mensagens.length - 1]
            const destaque = c.status === 'aguardando_equipe'
            return (
              <li key={c.id}>
                <Link to={`/chamados/${c.id}`} className={cx('block rounded-painel border bg-papel p-3.5 hover:bg-nevoa', destaque ? 'border-barro' : 'border-linha')}>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="min-w-0 truncate font-medium">#{c.numero} · {c.assunto}</p>
                    <span className="flex flex-wrap gap-1.5"><SeloEmpresa empresaId={c.empresaId} /><SeloPlano clienteId={c.clienteId} /><SeloChamado status={c.status} /></span>
                  </div>
                  <p className="mt-0.5 text-sm text-mata-suave">{clientes.find((x) => x.id === c.clienteId)?.nome} · {nomeEqp(c.equipamentoId)}</p>
                  {ult && <p className="mt-1.5 line-clamp-1 text-sm"><span className="text-mata-suave">{ult.de === 'cliente' ? 'Cliente' : ult.de === 'ia' ? 'IA' : ult.autor ?? 'Equipe'}: </span>{ult.texto}</p>}
                  <p className="mt-1 text-xs text-mata-suave">{relativo(c.atualizadoEm)}{c.responsavel && <> · <Selo>{c.responsavel}</Selo></>}</p>
                </Link>
              </li>
            )
          })}
        </ul>
      )}

      <Modal aberto={qr} aoFechar={() => setQr(false)} titulo="Opcional: adesivo no drone" largura="sm"
        rodape={<Button icone={<Printer size={16} />} onClick={imprimir}>Imprimir adesivo</Button>}>
        <div className="space-y-3">
          <p className="text-sm text-mata-suave">O cliente entra pelo link e senha do plano de suporte. O adesivo é só um atalho extra, e ele também precisa entrar com a senha.</p>
          <Select value={alvo} onChange={(e) => setEqpQr(e.target.value)} aria-label="Drone">
            {equipamentos.map((e) => <option key={e.id} value={e.id}>{nomeEqp(e.id)} — {clientes.find((c) => c.id === e.clienteId)?.nome}</option>)}
          </Select>
          <div ref={adesivo} className="folha-claro mx-auto flex w-64 flex-col items-center gap-2 rounded-painel border border-linha bg-white p-4 text-center text-black">
            <Marca largura={110} />
            <p className="text-sm font-semibold">Dúvida no campo? Aponte a câmera</p>
            <EtiquetaQR texto={url} legenda={eAlvo ? nomeEqp(eAlvo.id).split(' · ')[0] : undefined} sublegenda={eAlvo?.serial} tamanho={150} className="border-0 p-0" />
          </div>
          <p className="break-all text-xs text-mata-suave">{url}</p>
        </div>
      </Modal>
    </div>
  )
}
