import { useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ArrowUpRight, BookOpen, Database, Plus } from 'lucide-react'
import { Button, CabecalhoPagina, SeloIA, cx } from '@/components/ui'
import { AIComposer } from '@/components/ia/AIComposer'
import { AIPensando } from '@/components/ia/AIPensando'
import { Markdown } from './Markdown'
import { BaseConhecimento } from './BaseConhecimento'
import { useAssistente, type MensagemChat } from './store'

const GRUPOS: { titulo: string; perguntas: string[] }[] = [
  { titulo: 'Estoque', perguntas: ['Quais peças mais saem?', 'O que preciso comprar?', 'Quais peças estão paradas há mais de 90 dias?', 'Quanto pesa 2 pares de hélice do T40 e 1 bomba?'] },
  { titulo: 'Oficina', perguntas: ['Quais OS estão atrasadas?', 'Quantas OS cada técnico tem em aberto?', 'Qual modelo mais passa pela oficina?', 'Qual o histórico do drone Frota 01?'] },
  { titulo: 'Vendas', perguntas: ['Quais orçamentos aguardam resposta?', 'Como está o funil de vendas?', 'Quanto custa o drone T50?', 'Histórico da Fazenda Santa Luzia'] },
  { titulo: 'Financeiro', perguntas: ['Quanto faturamos este mês?', 'Compare o faturamento com o mês passado', 'Quais contas a receber estão vencidas?', 'Quais contas a pagar vencem em breve?'] },
  { titulo: 'Técnico', perguntas: ['Em quais drones serve o parafuso da hélice?', 'Quais peças servem no T40?', 'Como limpar o sistema de pulverização após a aplicação?', 'Qual o checklist depois de uma queda?'] },
]

const ETAPAS = ['Entendendo a pergunta', 'Consultando os dados', 'Montando a resposta']

function Inicio({ aoPerguntar }: { aoPerguntar: (p: string) => void }) {
  return (
    <div className="mx-auto max-w-3xl py-2">
      <div className="mb-6 flex items-center gap-2">
        <SeloIA>Assistente</SeloIA>
      </div>
      <h2 className="text-xl">O que você quer saber hoje?</h2>
      <p className="mt-1 text-sm text-mata-suave">Pergunte do seu jeito, por texto ou voz. Eu consulto o estoque, as OS, os orçamentos, o financeiro e o catálogo de peças.</p>
      <div className="mt-6 grid gap-x-8 gap-y-6 md:grid-cols-2">
        {GRUPOS.map((g) => (
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
        <p className="max-w-[88%] whitespace-pre-wrap rounded-painel rounded-br-sm bg-mata px-4 py-2.5 text-[15px] leading-relaxed text-white sm:max-w-[75%]">{m.texto}</p>
      </div>
    )
  }
  return (
    <div data-msg={m.id} className="flex min-w-0 max-w-full flex-col gap-3 sm:max-w-[92%]">
      <div><SeloIA>Assistente</SeloIA></div>
      <Markdown texto={m.texto} className={m.erro ? 'text-barro' : undefined} />
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
  const [texto, setTexto] = useState('')
  const [baseAberta, setBaseAberta] = useState(false)
  const [params, setParams] = useSearchParams()
  const rolagem = useRef<HTMLDivElement>(null)
  const jaEnviou = useRef<string | null>(null)

  // ?q=<pergunta> envia ao abrir
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
        descricao="Faça perguntas sobre estoque, peças, oficina, vendas e financeiro."
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
              <Inicio aoPerguntar={perguntar} />
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
                placeholder="Pergunte sobre estoque, peças, OS, clientes ou financeiro"
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
