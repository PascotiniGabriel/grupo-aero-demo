import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Camera, CheckCircle2, Headset, Mic, Send, Sparkles, UserRound } from 'lucide-react'
import { SeloIA, Button, IconButton, cx } from '@/components/ui'
import { useStore, novoId } from '@/store'
import { useDitado } from '@/lib/useDitado'
import { reduzirImagem } from '@/lib/fotos'
import { responderCliente, pedeEquipe } from '@/lib/ai/suporte'
import { usoSuporte, linkWhatsApp } from '@/lib/suporte'
import type { Chamado, Cliente, Equipamento, MensagemChamado, ModeloDrone, PlanoSuporte } from '@/types'
import { BarraUso } from './comum'

const SUGESTOES = ['Tamanho de gota', 'Calibrar balança', 'Calibrar fluxômetro', 'Mau contato na placa']
const PERGUNTAS: Record<string, string> = {
  'Tamanho de gota': 'Qual tamanho de gota devo usar na aplicação?',
  'Calibrar balança': 'Como calibro a balança do tanque?',
  'Calibrar fluxômetro': 'Como calibro o fluxômetro?',
  'Mau contato na placa': 'Acho que tem mau contato na placa, como limpo os contatos?',
}

const hora = (iso: string) => new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
const lerChamado = (id?: string) => useStore.getState().chamados.find((c) => c.id === id)

interface Props { cliente: Cliente; equipamento: Equipamento; modelo: ModeloDrone; plano: PlanoSuporte }

export default function SuporteChat({ cliente, equipamento, modelo, plano }: Props) {
  const equipamentoId = equipamento.id
  const empresa = useStore((s) => s.empresa)
  const chamados = useStore((s) => s.chamados)
  const salvar = useStore((s) => s.salvar)
  const uso = usoSuporte(cliente.id, chamados)
  const esgotado = uso.perguntas >= plano.perguntasIAMes
  const equipeLiberada = uso.chamados < plano.chamadosEquipeMes
  const maior = (empresa.planosSuporte ?? []).filter((p) => p.precoMensal > plano.precoMensal).sort((a, b) => a.precoMensal - b.precoMensal)[0]
  const [verPlano, setVerPlano] = useState(false)
  const [aviso, setAviso] = useState('')

  const [chamadoId, setChamadoId] = useState<string | null>(null)
  const [texto, setTexto] = useState('')
  const [pensando, setPensando] = useState(false)
  const fim = useRef<HTMLDivElement>(null)
  const arquivo = useRef<HTMLInputElement>(null)

  // conversa atual (a que o cliente abriu agora); depois dela, o chamado em andamento deste drone
  const chamado = useMemo(
    () => (chamadoId ? chamados.find((c) => c.id === chamadoId) : chamados.find((c) => c.equipamentoId === equipamentoId && (c.status === 'equipe' || c.status === 'aguardando_equipe'))),
    [chamados, chamadoId, equipamentoId],
  )

  const ditado = useDitado((t) => setTexto(t))

  useEffect(() => { fim.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }) }, [chamado?.mensagens.length, pensando])

  const msg = (de: MensagemChamado['de'], t: string, extra: Partial<MensagemChamado> = {}): MensagemChamado =>
    ({ id: novoId('cm'), de, texto: t, hora: new Date().toISOString(), ...extra })

  function gravar(base: Chamado | undefined, novas: MensagemChamado[], mudar: Partial<Chamado> = {}): Chamado {
    const agora = new Date().toISOString()
    const numero = base?.numero ?? Math.max(0, ...useStore.getState().chamados.map((c) => c.numero)) + 1
    const c: Chamado = {
      id: base?.id ?? novoId('cha'), numero, clienteId: cliente.id, equipamentoId: equipamento.id,
      assunto: base?.assunto ?? 'Dúvida no campo', status: base?.status ?? 'ia',
      abertoEm: base?.abertoEm ?? agora, responsavel: base?.responsavel,
      ...mudar, atualizadoEm: agora, mensagens: [...(base?.mensagens ?? []), ...novas],
    }
    salvar('chamados', c)
    setChamadoId(c.id)
    return c
  }

  async function enviar(t: string, fotoUrl?: string) {
    const pergunta = t.trim()
    if ((!pergunta && !fotoUrl) || pensando) return
    const atual0 = lerChamado(chamado?.id) ?? chamado
    const comEquipe = atual0?.status === 'equipe'
    // limite do plano: a IA só responde se ainda houver perguntas no mês
    if (!comEquipe && pergunta && usoSuporte(cliente.id, useStore.getState().chamados).perguntas >= plano.perguntasIAMes) { setTexto(''); return }
    setTexto('')
    ditado.parar()
    const c1 = gravar(atual0, [msg('cliente', pergunta || 'Enviei uma foto.', { fotoUrl, tipo: comEquipe || !pergunta ? 'outro' : undefined })])
    // com a equipe na conversa (ou só foto), a IA fica quieta
    if (c1.status === 'equipe' || !pergunta) return
    setPensando(true)
    try {
      const r = await responderCliente(pergunta, { equipamento, modelo, cliente, historico: c1.mensagens })
      const precisa = r.precisaEquipe || pedeEquipe(pergunta)
      const fresco = lerChamado(c1.id) ?? c1
      const primeira = fresco.mensagens.filter((m) => m.de === 'cliente').length <= 1
      gravar(fresco, [msg('ia', r.texto, { passos: r.passos, fonte: r.fonte })], {
        assunto: primeira ? r.assunto : fresco.assunto,
        status: fresco.status === 'equipe' ? 'equipe' : precisa || fresco.status === 'aguardando_equipe' ? 'aguardando_equipe' : 'ia',
      })
    } finally { setPensando(false) }
  }

  function resolvido() {
    if (!chamado) return
    gravar(lerChamado(chamado.id) ?? chamado, [msg('cliente', 'Resolveu, obrigado!', { tipo: 'outro' })], { status: 'resolvido' })
  }
  function chamarEquipe() {
    const atual = lerChamado(chamado?.id) ?? chamado
    if (atual?.status === 'equipe') return
    if (atual?.status !== 'aguardando_equipe' && usoSuporte(cliente.id, useStore.getState().chamados).chamados >= plano.chamadosEquipeMes) {
      setAviso(`Você já usou os ${plano.chamadosEquipeMes} atendimentos com a equipe do seu plano este mês.`)
      return
    }
    setAviso('')
    gravar(atual, [msg('cliente', 'Quero falar com a equipe.', { tipo: 'outro' }), msg('ia', 'Certo, já chamei a equipe da Aerobrasil. Um técnico vai entrar na conversa em breve.')], { status: 'aguardando_equipe' })
  }
  async function foto(f?: File) {
    if (!f) return
    let url: string
    try { url = await reduzirImagem(f) } catch { url = URL.createObjectURL(f) }
    await enviar(texto, url)
  }
  function novaConversa() {
    // abre um chamado novo na próxima pergunta
    setChamadoId('__novo__')
    setTexto('')
  }

  const novo = chamadoId === '__novo__'
  const atual = novo ? undefined : chamado
  const status = atual?.status
  const encerrado = status === 'resolvido'
  const msgs = atual?.mensagens ?? []
  const tecnico = atual?.responsavel?.split(' ')[0]
  const bloqueado = esgotado && status !== 'equipe'

  return (
    <div className="mx-auto flex h-dvh max-w-[480px] flex-col bg-nevoa text-mata">
      <header className="shrink-0 border-b border-linha bg-papel px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <Link to="/suporte" className="inline-flex min-h-10 items-center gap-1.5 text-sm text-ceu-texto"><ArrowLeft size={16} aria-hidden />Meus drones</Link>
          <SeloIA>Suporte com IA</SeloIA>
        </div>
        <p className="mt-1 text-sm">
          Seu drone: <strong>{modelo.nome}</strong> · série <span className="serial">{equipamento.serial}</span>
        </p>
        <div className="mt-2"><BarraUso rotulo="perguntas este mês" usado={uso.perguntas} limite={plano.perguntasIAMes} compacta /></div>
      </header>

      <main className="flex-1 space-y-3 overflow-y-auto px-3 py-4">
        {msgs.length === 0 && (
          <div className="space-y-3">
            <p className="text-sm">Olá! Sou o assistente da Aerobrasil. Pergunte sobre o seu {modelo.nome} ou escolha um assunto:</p>
            <div className="flex flex-wrap gap-2">
              {SUGESTOES.map((s) => (
                <button key={s} onClick={() => enviar(PERGUNTAS[s])} disabled={bloqueado} className="min-h-10 rounded-full border border-linha bg-papel px-3.5 text-sm hover:bg-nevoa disabled:opacity-50">{s}</button>
              ))}
            </div>
          </div>
        )}

        {msgs.map((m, i) => {
          const entrou = m.de === 'equipe' && msgs[i - 1]?.de !== 'equipe'
          return (
            <div key={m.id} className="space-y-2">
              {entrou && (
                <p className="flex items-center justify-center gap-1.5 text-xs text-mata-suave">
                  <UserRound size={14} aria-hidden />{(m.autor ?? 'Equipe').split(' ')[0]} (técnico) entrou na conversa
                </p>
              )}
              <div className={cx('flex', m.de === 'cliente' ? 'justify-end' : 'justify-start')}>
                <div className={cx('max-w-[88%] rounded-painel px-3.5 py-2.5 text-sm', m.de === 'cliente' ? 'bg-forte text-white' : 'border border-linha bg-papel')}>
                  {m.de === 'ia' && <SeloIA className="mb-1.5" />}
                  {m.de === 'equipe' && <p className="mb-1 text-xs font-semibold text-lavoura-texto">{m.autor ?? 'Equipe'} · Aerobrasil</p>}
                  {m.fotoUrl && <img src={m.fotoUrl} alt="Foto enviada" className="mb-2 max-h-56 w-full rounded-campo object-cover" />}
                  <p className="whitespace-pre-wrap">{m.texto}</p>
                  {m.passos && (
                    <ol className="mt-2 space-y-1.5">
                      {m.passos.map((p, k) => (
                        <li key={k} className="flex gap-2 rounded-campo bg-nevoa p-2 text-mata">
                          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-lavoura text-xs font-semibold tabular-nums text-white">{k + 1}</span>
                          <span>{p}</span>
                        </li>
                      ))}
                    </ol>
                  )}
                  {m.fonte && <p className="mt-2 text-xs text-mata-suave">Fonte: {m.fonte}</p>}
                  <p className={cx('mt-1 text-right text-[11px]', m.de === 'cliente' ? 'text-white/70' : 'text-mata-suave')}>{hora(m.hora)}</p>
                </div>
              </div>
            </div>
          )
        })}

        {pensando && <p className="text-sm text-mata-suave">Consultando o manual...</p>}
        {status === 'aguardando_equipe' && <p className="rounded-campo bg-ambar-claro p-2.5 text-center text-sm text-ambar-texto">A equipe foi avisada e responde por aqui.</p>}
        {status === 'equipe' && <p className="rounded-campo bg-lavoura-claro p-2.5 text-center text-sm text-lavoura-texto">{tecnico} (técnico) está na conversa com você.</p>}
        {encerrado && (
          <div className="space-y-2 text-center">
            <p className="flex items-center justify-center gap-1.5 text-sm text-lavoura-texto"><CheckCircle2 size={16} aria-hidden />Atendimento encerrado.</p>
            <Button variante="secundario" onClick={novaConversa}>Fazer outra pergunta</Button>
          </div>
        )}
        <div ref={fim} />
      </main>

      {bloqueado && !encerrado && (
        <footer className="shrink-0 space-y-3 border-t border-linha bg-papel p-4">
          <p className="font-medium">Você usou as {plano.perguntasIAMes} perguntas do seu plano este mês</p>
          <p className="text-sm text-mata-suave">As perguntas voltam no começo do próximo mês.{maior ? ` Com o plano ${maior.nome} você pode perguntar mais.` : ''}</p>
          {aviso && <p className="rounded-campo bg-ambar-claro p-2.5 text-sm text-ambar-texto">{aviso}</p>}
          <div className="flex flex-col gap-2">
            {(equipeLiberada || status === 'aguardando_equipe') && (
              <Button variante="secundario" icone={<Headset size={16} />} onClick={chamarEquipe} disabled={status === 'aguardando_equipe'}>
                {status === 'aguardando_equipe' ? 'A equipe foi avisada' : 'Falar com a equipe'}
              </Button>
            )}
            {!equipeLiberada && status !== 'aguardando_equipe' && <p className="text-sm text-mata-suave">Os atendimentos com a equipe deste mês também acabaram. Ligue para {empresa.fone}.</p>}
            {maior && <Button icone={<Sparkles size={16} />} onClick={() => setVerPlano((v) => !v)}>Conhecer o plano {maior.nome}</Button>}
          </div>
          {maior && verPlano && (
            <div className="space-y-1.5 rounded-painel border border-linha bg-nevoa p-3 text-sm">
              <p><strong>{maior.nome}</strong> · R$ {maior.precoMensal.toLocaleString('pt-BR')} por mês</p>
              <p>{maior.perguntasIAMes} perguntas por mês, {maior.chamadosEquipeMes} atendimentos com a equipe. {maior.atendimento}.</p>
              <a href={linkWhatsApp(empresa.fone, `Olá! Quero contratar o plano ${maior.nome} do Suporte Aerobrasil.`)} target="_blank" rel="noreferrer" className="inline-flex min-h-10 items-center text-ceu-texto underline">Pedir o plano pelo WhatsApp</a>
            </div>
          )}
        </footer>
      )}

      {!encerrado && !bloqueado && (
        <footer className="shrink-0 space-y-2 border-t border-linha bg-papel p-3">
          {aviso && <p className="rounded-campo bg-ambar-claro p-2.5 text-sm text-ambar-texto">{aviso}</p>}
          {atual && (
            <div className="flex gap-2">
              <Button variante="secundario" tamanho="sm" icone={<CheckCircle2 size={16} />} onClick={resolvido} className="flex-1">Resolveu</Button>
              {status !== 'equipe' && <Button variante="secundario" tamanho="sm" icone={<Headset size={16} />} onClick={chamarEquipe} disabled={status === 'aguardando_equipe'} className="flex-1">Falar com a equipe</Button>}
            </div>
          )}
          {msgs.length > 0 && !pensando && status === 'ia' && (
            <div className="flex gap-2 overflow-x-auto">
              {SUGESTOES.map((s) => <button key={s} onClick={() => enviar(PERGUNTAS[s])} className="min-h-10 shrink-0 rounded-full border border-linha px-3 text-sm">{s}</button>)}
            </div>
          )}
          <form onSubmit={(e) => { e.preventDefault(); enviar(texto) }} className="flex items-center gap-2">
            <input ref={arquivo} type="file" accept="image/*" capture="environment" hidden onChange={(e) => { foto(e.target.files?.[0]); e.target.value = '' }} />
            <IconButton aria-label="Anexar foto" icone={<Camera size={18} />} onClick={() => arquivo.current?.click()} />
            <input
              value={texto} onChange={(e) => setTexto(e.target.value)} placeholder={ditado.ouvindo ? 'Ouvindo...' : 'Escreva sua dúvida'}
              className="h-11 min-w-0 flex-1 rounded-campo border border-linha bg-papel px-3 text-sm text-mata outline-none focus:border-lavoura"
            />
            {ditado.suportado && <IconButton aria-label={ditado.ouvindo ? 'Parar ditado' : 'Falar'} icone={<Mic size={18} />} onClick={() => (ditado.ouvindo ? ditado.parar() : ditado.iniciar())} />}
            <Button type="submit" aria-label="Enviar" icone={<Send size={16} />} disabled={!texto.trim() || pensando} />
          </form>
        </footer>
      )}
    </div>
  )
}
