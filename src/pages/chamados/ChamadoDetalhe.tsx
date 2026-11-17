import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, CheckCircle2, ClipboardList, Send, UserCheck } from 'lucide-react'
import { Button, Painel, SeloIA, EstadoVazio, Selo, cx } from '@/components/ui'
import { useStore, novoId } from '@/store'
import { dataHora } from '@/lib/format'
import type { Chamado, MensagemChamado } from '@/types'
import { rotuloStatus } from '@/components/ui/SeloStatus'
import { SeloChamado, SeloPlano } from './comum'

export default function ChamadoDetalhe() {
  const { id } = useParams()
  const navigate = useNavigate()
  const chamado = useStore((s) => s.chamados.find((c) => c.id === id))
  const clientes = useStore((s) => s.clientes)
  const equipamentos = useStore((s) => s.equipamentos)
  const modelos = useStore((s) => s.modelos)
  const ordens = useStore((s) => s.ordens)
  const usuario = useStore((s) => s.usuarios.find((u) => u.id === s.usuarioAtualId))
  const salvar = useStore((s) => s.salvar)
  const [texto, setTexto] = useState('')
  const fim = useRef<HTMLDivElement>(null)
  useEffect(() => { fim.current?.scrollIntoView({ block: 'end' }) }, [chamado?.mensagens.length])

  if (!chamado) return <Painel><EstadoVazio titulo="Chamado não encontrado" acao={<Link to="/chamados"><Button variante="secundario">Voltar aos chamados</Button></Link>} /></Painel>

  const cliente = clientes.find((c) => c.id === chamado.clienteId)
  const eqp = equipamentos.find((e) => e.id === chamado.equipamentoId)
  const modelo = modelos.find((m) => m.id === eqp?.modeloId)
  const historicoOS = ordens.filter((o) => o.equipamentoId === chamado.equipamentoId)
  const nome = usuario?.nome ?? 'Equipe'
  const encerrado = chamado.status === 'resolvido' || chamado.status === 'ia'

  const atualizar = (mudar: Partial<Chamado>, novas: MensagemChamado[] = []) =>
    salvar('chamados', { ...chamado, ...mudar, atualizadoEm: new Date().toISOString(), mensagens: [...chamado.mensagens, ...novas] })
  const msg = (t: string): MensagemChamado => ({ id: novoId('cm'), de: 'equipe', texto: t, hora: new Date().toISOString(), autor: nome })

  const assumir = () => atualizar({ status: 'equipe', responsavel: nome })
  const responder = () => {
    const t = texto.trim()
    if (!t) return
    atualizar({ status: 'equipe', responsavel: chamado.responsavel ?? nome }, [msg(t)])
    setTexto('')
  }
  const resolver = () => atualizar({ status: 'resolvido' })

  return (
    <div>
      <Link to="/chamados" className="mb-3 inline-flex min-h-10 items-center gap-1.5 text-sm text-ceu-texto"><ArrowLeft size={16} />Chamados</Link>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <h1 className="text-xl">#{chamado.numero} · {chamado.assunto}</h1>
        <SeloChamado status={chamado.status} />
        <SeloPlano clienteId={chamado.clienteId} />
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="min-w-0 space-y-3">
          <Painel titulo="Conversa" semPadding>
            <div className="max-h-[55dvh] space-y-3 overflow-y-auto p-4">
              {chamado.mensagens.map((m) => (
                <div key={m.id} className={cx('flex', m.de === 'equipe' ? 'justify-end' : 'justify-start')}>
                  <div className={cx('max-w-[92%] rounded-painel px-3.5 py-2.5 text-sm sm:max-w-[80%]', m.de === 'equipe' ? 'bg-forte text-white' : m.de === 'ia' ? 'border border-linha bg-papel' : 'bg-nevoa')}>
                    <p className={cx('mb-1 flex items-center gap-1.5 text-xs', m.de === 'equipe' ? 'text-white/80' : 'text-mata-suave')}>
                      {m.de === 'ia' ? <SeloIA /> : <strong>{m.de === 'cliente' ? cliente?.nome ?? 'Cliente' : m.autor ?? 'Equipe'}</strong>}
                      <span>{dataHora(m.hora)}</span>
                    </p>
                    {m.fotoUrl && <img src={m.fotoUrl} alt="Foto do cliente" className="mb-2 max-h-60 rounded-campo" />}
                    <p className="whitespace-pre-wrap">{m.texto}</p>
                    {m.passos && (
                      <ol className="mt-2 list-decimal space-y-1 pl-5">{m.passos.map((p, i) => <li key={i}>{p}</li>)}</ol>
                    )}
                    {m.fonte && <p className="mt-2 text-xs text-mata-suave">Fonte: {m.fonte}</p>}
                  </div>
                </div>
              ))}
              <div ref={fim} />
            </div>
            {chamado.status === 'resolvido' ? (
              <p className="border-t border-linha p-4 text-center text-sm text-lavoura-texto">Chamado resolvido.</p>
            ) : (
              <form onSubmit={(e) => { e.preventDefault(); responder() }} className="flex items-end gap-2 border-t border-linha p-3">
                <textarea value={texto} onChange={(e) => setTexto(e.target.value)} rows={2} placeholder="Responder ao cliente"
                  className="min-h-11 min-w-0 flex-1 resize-none rounded-campo border border-linha bg-papel px-3 py-2 text-sm text-mata outline-none focus:border-lavoura" />
                <Button type="submit" icone={<Send size={16} />} disabled={!texto.trim()}>Enviar</Button>
              </form>
            )}
          </Painel>
          <div className="flex flex-wrap gap-2">
            {chamado.status !== 'equipe' && !encerrado && <Button icone={<UserCheck size={16} />} onClick={assumir}>Assumir conversa</Button>}
            {chamado.status !== 'resolvido' && <Button variante="secundario" icone={<CheckCircle2 size={16} />} onClick={resolver}>Marcar como resolvido</Button>}
            <Button variante="secundario" icone={<ClipboardList size={16} />} onClick={() => navigate('/os')}>Abrir ordem de serviço</Button>
          </div>
        </div>

        <aside className="space-y-3">
          <Painel titulo="Cliente">
            <p className="font-medium">{cliente?.nome}</p>
            <p className="text-sm text-mata-suave">{cliente?.cidade}/{cliente?.uf} · {cliente?.fone}</p>
            {cliente && <Link to={`/clientes/${cliente.id}`} className="mt-1 inline-block text-sm text-ceu-texto">Ver cliente</Link>}
          </Painel>
          <Painel titulo="Drone">
            <p className="font-medium">{modelo?.nome ?? 'Sem drone'}</p>
            {eqp && <p className="text-sm text-mata-suave">Série <span className="serial">{eqp.serial}</span></p>}
            {chamado.responsavel && <p className="mt-1 text-sm">Responsável: <Selo cor="azul">{chamado.responsavel}</Selo></p>}
          </Painel>
          <Painel titulo="Histórico de OS do drone">
            {historicoOS.length === 0 ? <p className="text-sm text-mata-suave">Nenhuma OS para este drone.</p> : (
              <ul className="space-y-1.5">
                {historicoOS.map((o) => (
                  <li key={o.id}><Link to={`/os/${o.id}`} className="flex min-h-10 items-center justify-between gap-2 text-sm text-ceu-texto">
                    <span>OS {o.numero}</span><span className="truncate text-mata-suave">{rotuloStatus('os', o.status)}</span>
                  </Link></li>
                ))}
              </ul>
            )}
          </Painel>
        </aside>
      </div>
    </div>
  )
}
