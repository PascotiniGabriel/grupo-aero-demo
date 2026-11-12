import { useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ArrowUpRight, BookOpen, Database, Plus } from 'lucide-react'
import { Button, CabecalhoPagina, SeloIA, cx } from '@/components/ui'
import { AIComposer } from '@/components/ia/AIComposer'
import { AIPensando } from '@/components/ia/AIPensando'
import { useStore } from '@/store'
import type { Papel } from '@/lib/acesso'
import { PERFIL_IA } from '@/lib/ai/assistente'
import { Markdown } from './Markdown'
import { BaseConhecimento } from './BaseConhecimento'
import { useAssistente, type MensagemChat } from './store'

type Grupo = { titulo: string; perguntas: string[] }

const GRUPOS_POR_PAPEL: Record<Papel, Grupo[]> = {
  Gestor: [
  { titulo: 'Estoque', perguntas: ['Quais peças mais saem?', 'O que preciso comprar?', 'Quais peças estão paradas há mais de 90 dias?', 'Quanto pesa 2 pares de hélice do T40 e 1 bomba?'] },
  { titulo: 'Oficina', perguntas: ['Quais OS estão atrasadas?', 'Quantas OS cada técnico tem em aberto?', 'Qual modelo mais passa pela oficina?', 'Qual o histórico do drone Frota 01?'] },
  { titulo: 'Vendas', perguntas: ['Quais orçamentos aguardam resposta?', 'Como está o funil de vendas?', 'Quanto custa o drone T50?', 'Histórico da Fazenda Santa Luzia'] },
  { titulo: 'Financeiro', perguntas: ['Quanto faturamos este mês?', 'Compare o faturamento com o mês passado', 'Quais contas a receber estão vencidas?', 'Quais contas a pagar vencem em breve?'] },
  { titulo: 'Técnico', perguntas: ['Em quais drones serve o parafuso da hélice?', 'Quais peças servem no T40?', 'Como limpar o sistema de pulverização após a aplicação?', 'Qual o checklist depois de uma queda?'] },
],
  Vendas: [
    { titulo: 'Clientes', perguntas: ['Histórico da Fazenda Santa Luzia', 'Qual o histórico do drone Frota 01?', 'Qual o status das OS da Fazenda Santa Luzia?'] },
    { titulo: 'Orçamentos e funil', perguntas: ['Quais orçamentos aguardam resposta?', 'Quais são meus orçamentos em aberto?', 'Como está o funil de vendas?'] },
    { titulo: 'Preços e peças', perguntas: ['Quanto custa o drone T50?', 'Em quais drones serve o parafuso da hélice?', 'Tem hélice do T40 em estoque?'] },
    { titulo: 'Frete', perguntas: ['Quanto pesa 2 pares de hélice do T40 e 1 bomba?', 'Peso de 2 hélices do T40 e 4 bicos'] },
  ],
  Técnico: [
    { titulo: 'Oficina', perguntas: ['Quais são minhas OS em aberto?', 'Quais das minhas OS estão atrasadas?', 'Qual o histórico do drone Frota 01?'] },
    { titulo: 'Agenda', perguntas: ['Qual minha agenda de hoje?', 'Qual minha agenda de amanhã?'] },
    { titulo: 'Procedimentos técnicos', perguntas: ['Qual o checklist depois de uma queda?', 'Qual o intervalo de revisão de 100 h?', 'Como limpar o sistema de pulverização após a aplicação?', 'Como calibrar a bússola e o IMU?'] },
    { titulo: 'Peças', perguntas: ['Quais peças servem no drone da OS 1039?', 'Onde está a hélice do T40 no estoque?', 'Em quais drones serve o parafuso da hélice?'] },
  ],
  Estoque: [
    { titulo: 'Giro', perguntas: ['Quais peças mais saem?', 'Quais peças estão paradas há mais de 90 dias?'] },
    { titulo: 'Compras', perguntas: ['O que preciso comprar?', 'Quanto custa o motor do T40?'] },
    { titulo: 'Entradas', perguntas: ['Quais notas de entrada chegaram?'] },
    { titulo: 'Peças', perguntas: ['Onde está a hélice do T40?', 'Quanto pesa 2 pares de hélice do T40 e 1 bomba?', 'Quais OS estão em aberto?'] },
  ],
}

const PLACEHOLDER: Record<Papel, string> = {
  Gestor: 'Pergunte sobre estoque, peças, OS, clientes ou financeiro',
  Vendas: 'Pergunte sobre clientes, orçamentos, preços ou peças',
  Técnico: 'Pergunte sobre suas OS, agenda, procedimentos ou peças',
  Estoque: 'Pergunte sobre estoque, giro, compras ou peças',
}

const ETAPAS = ['Entendendo a pergunta', 'Consultando os dados', 'Montando a resposta']

function Inicio({ aoPerguntar, papel }: { aoPerguntar: (p: string) => void; papel: Papel }) {
  return (
    <div className="mx-auto max-w-3xl py-2">
      <div className="mb-6 flex items-center gap-2">
        <SeloIA>Assistente</SeloIA>
      </div>
      <h2 className="text-xl">O que você quer saber hoje?</h2>
      <p className="mt-1 text-sm text-mata-suave">Pergunte do seu jeito, por texto ou voz. Eu consulto {PERFIL_IA[papel].apresentacao}.</p>
      <div className="mt-6 grid gap-x-8 gap-y-6 md:grid-cols-2">
        {GRUPOS_POR_PAPEL[papel].map((g) => (
          <section key={g.titulo}>
            <h3 className="mb-1 text-sm font-semibold text-mata-suave">{g.titulo}</h3>
            <ul className="divide-y divide-linha border-y border-linha">
              {g.perguntas.map((p) => (
                <li key={p}>
                  <button type="button" onClick={() => aoPerguntar(p)}
                    className="flex min-h-11 w-full items-center justify-between gap-3 py-2 text-left text-[15px] transition-colors hover:text-ceu">
                    <span>{p}</span>
                    <ArrowUpRight size={15} className="shrink-0 text-mata-suave" aria-hidden />
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  )
}

function Balao({ m, ultima, aoPerguntar, bloqueado }: { m: MensagemChat; ultima: boolean; aoPerguntar: (p: string) => void; bloqueado: boolean }) {
  if (m.papel === 'usuario') {
    return (
      <div className="flex justify-end">
        <p className="max-w-[88%] whitespace-pre-wrap rounded-painel rounded-br-sm bg-forte px-4 py-2.5 text-[15px] leading-relaxed text-white sm:max-w-[75%]">{m.texto}</p>
      </div>
    )
  }
  return (
    <div data-msg={m.id} className="flex min-w-0 max-w-full flex-col gap-3 sm:max-w-[92%]">
      <div><SeloIA>Assistente</SeloIA></div>
      <Markdown texto={m.texto} className={m.erro ? 'text-barro-texto' : undefined} />
      {m.links && m.links.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {m.links.map((l) => (
            <Link key={l.rota + l.rotulo} to={l.rota}
              className="inline-flex min-h-10 items-center gap-1.5 rounded-campo border border-linha px-3 text-sm font-medium text-ceu transition-colors hover:bg-ceu-claro">
              {l.rotulo}<ArrowUpRight size={14} aria-hidden />
            </Link>
          ))}
        </div>
      )}
      {m.fonte && (
        <p className="flex items-start gap-1.5 text-xs text-mata-suave"><Database size={13} className="mt-px shrink-0" aria-hidden /><span>Com base em: {m.fonte}</span></p>
      )}
      {ultima && m.continuacoes && m.continuacoes.length > 0 && (
        <div className="flex flex-wrap gap-2 pt-1">
          {m.continuacoes.map((c) => (
            <button key={c} type="button" disabled={bloqueado} onClick={() => aoPerguntar(c)}
              className="min-h-10 rounded-full border border-linha bg-papel px-3.5 text-sm transition-colors hover:border-ceu hover:text-ceu disabled:opacity-50">
              {c}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default function Assistente() {
  const msgs = useAssistente((s) => s.msgs)
  const carregando = useAssistente((s) => s.carregando)
  const enviar = useAssistente((s) => s.enviar)
  const nova = useAssistente((s) => s.nova)
  const dono = useAssistente((s) => s.dono)
  const usuarioId = useStore((s) => s.usuarioAtualId)
  const papel = useStore((s) => s.usuarios.find((u) => u.id === s.usuarioAtualId)?.papel ?? 'Gestor')
  const [texto, setTexto] = useState('')
  const [baseAberta, setBaseAberta] = useState(false)
  const [params, setParams] = useSearchParams()
  const rolagem = useRef<HTMLDivElement>(null)
  const jaEnviou = useRef<string | null>(null)

  // trocar de perfil descarta a conversa (evita mostrar resposta de outro perfil)
  useEffect(() => {
    if (dono !== undefined && dono !== usuarioId) nova()
  }, [dono, usuarioId, nova])

  // ?q=<pergunta> envia ao abrir (passa pelo mesmo filtro do perfil)
  useEffect(() => {
    const q = params.get('q')
    if (q && jaEnviou.current !== q) {
      jaEnviou.current = q
      void enviar(q)
      setParams({}, { replace: true })
    }
  }, [params, enviar, setParams])

  useEffect(() => {
    const el = rolagem.current
    if (!el || msgs.length === 0) return
    const reduzir = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    const ultimaMsg = msgs[msgs.length - 1]
    // resposta nova: mostra o começo dela; pergunta nova ou "pensando": vai ao fim
    const alvo = ultimaMsg.papel === 'ia' ? el.querySelector<HTMLElement>(`[data-msg="${ultimaMsg.id}"]`) : null
    const topo = alvo ? Math.max(0, alvo.offsetTop - 12) : el.scrollHeight
    el.scrollTo({ top: topo, behavior: reduzir ? 'auto' : 'smooth' })
  }, [msgs, carregando])

  function perguntar(p: string) {
    setTexto('')
    void enviar(p)
  }

  return (
    <>
      <CabecalhoPagina
        titulo="Assistente"
        descricao={PERFIL_IA[papel].subtitulo}
        acoes={
          <>
            {msgs.length > 0 && <Button variante="secundario" icone={<Plus size={16} />} onClick={nova}>Nova conversa</Button>}
            <Button variante="secundario" icone={<BookOpen size={16} />} className="lg:hidden" onClick={() => setBaseAberta((v) => !v)} aria-expanded={baseAberta}>
              Conhecimento
            </Button>
          </>
        }
      />
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
        <section className="flex h-[calc(100dvh-22rem)] min-h-[400px] min-w-0 flex-col rounded-painel border border-linha bg-papel lg:h-[calc(100dvh-14rem)]" aria-label="Conversa com o assistente">
          <div ref={rolagem} className="relative min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-4 py-5 md:px-6">
            {msgs.length === 0 ? (
              <Inicio aoPerguntar={perguntar} papel={papel} />
            ) : (
              <div className="mx-auto flex max-w-3xl flex-col gap-6">
                {msgs.map((m, i) => (
                  <Balao key={m.id} m={m} ultima={i === msgs.length - 1 && !carregando} aoPerguntar={perguntar} bloqueado={carregando} />
                ))}
                <AIPensando ativa={carregando} etapas={ETAPAS} intervaloMs={320} className="max-w-sm" />
              </div>
            )}
          </div>
          <div className="border-t border-linha p-3 md:px-6">
            <div className="mx-auto max-w-3xl">
              <AIComposer
                valor={texto} aoMudar={setTexto} aoEnviar={() => perguntar(texto)} carregando={carregando}
                rotuloEnviar="Perguntar" linhas={1}
                placeholder={PLACEHOLDER[papel]}
              />
            </div>
          </div>
        </section>
        <aside className={cx('min-w-0 lg:block lg:sticky lg:top-4', baseAberta ? 'order-first block lg:order-none' : 'hidden')}>
          <BaseConhecimento />
        </aside>
      </div>
    </>
  )
}
