import { useEffect, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ChevronRight, Download, LogOut, MoreVertical, PlusSquare, Share, X } from 'lucide-react'
import { Button, Selo, cx } from '@/components/ui'
import { useStore } from '@/store'
import { dataCurta } from '@/lib/format'
import { usoSuporte } from '@/lib/suporte'
import type { Cliente, PlanoSuporte } from '@/types'
import { BarraUso, TelaCliente } from './comum'

const CHAVE_CARD = 'aero-suporte-instalar-dispensado'
interface EventoInstalar extends Event { prompt: () => Promise<void> }

function Passo({ n, icone, texto }: { n: number; icone: ReactNode; texto: ReactNode }) {
  return (
    <li className="flex items-center gap-3 rounded-campo bg-nevoa p-2.5 text-sm">
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-lavoura text-xs font-semibold text-white">{n}</span>
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-campo border border-linha bg-papel text-mata">{icone}</span>
      <span>{texto}</span>
    </li>
  )
}

function CardInstalar() {
  const [fechado, setFechado] = useState(() => { try { return localStorage.getItem(CHAVE_CARD) === '1' } catch { return false } })
  const [sistema, setSistema] = useState<'android' | 'iphone'>(() => (/iphone|ipad|ipod/i.test(navigator.userAgent) ? 'iphone' : 'android'))
  const [evento, setEvento] = useState<EventoInstalar | null>(null)
  useEffect(() => {
    const h = (e: Event) => { e.preventDefault(); setEvento(e as EventoInstalar) }
    window.addEventListener('beforeinstallprompt', h)
    return () => window.removeEventListener('beforeinstallprompt', h)
  }, [])
  if (fechado) return null
  const dispensar = () => { setFechado(true); try { localStorage.setItem(CHAVE_CARD, '1') } catch { /* ignora */ } }
  return (
    <section className="relative rounded-painel border border-linha bg-papel p-4" aria-label="Instalar no celular">
      <button onClick={dispensar} aria-label="Dispensar" className="absolute right-1.5 top-1.5 flex h-10 w-10 items-center justify-center rounded-campo text-mata-suave hover:bg-nevoa"><X size={18} /></button>
      <h2 className="titulo pr-10 text-base">Deixe o Suporte Aerobrasil na tela do seu celular</h2>
      <p className="mt-1 text-sm text-mata-suave">Assim você abre com um toque, sem precisar do link.</p>
      {evento && <Button className="mt-3" icone={<Download size={16} />} onClick={async () => { await evento.prompt(); setEvento(null) }}>Instalar</Button>}
      <div className="mt-3 flex gap-2" role="tablist">
        {(['android', 'iphone'] as const).map((s) => (
          <button key={s} role="tab" aria-selected={sistema === s} onClick={() => setSistema(s)}
            className={cx('min-h-10 rounded-full border px-4 text-sm', sistema === s ? 'border-forte bg-forte text-white' : 'border-linha bg-papel')}>{s === 'android' ? 'Android' : 'iPhone'}</button>
        ))}
      </div>
      <ol className="mt-3 space-y-2">
        {sistema === 'android' ? (<>
          <Passo n={1} icone={<MoreVertical size={20} />} texto={<>Toque nos <strong>três pontinhos</strong> no alto do navegador</>} />
          <Passo n={2} icone={<PlusSquare size={20} />} texto={<>Toque em <strong>Adicionar à tela inicial</strong></>} />
          <Passo n={3} icone={<Download size={20} />} texto={<>Confirme em <strong>Adicionar</strong></>} />
        </>) : (<>
          <Passo n={1} icone={<Share size={20} />} texto={<>Toque em <strong>Compartilhar</strong>, o quadrado com a seta</>} />
          <Passo n={2} icone={<PlusSquare size={20} />} texto={<>Role e toque em <strong>Adicionar à Tela de Início</strong></>} />
          <Passo n={3} icone={<Download size={20} />} texto={<>Confirme em <strong>Adicionar</strong></>} />
        </>)}
      </ol>
    </section>
  )
}

export default function Inicio({ cliente, plano, aoSair }: { cliente: Cliente; plano: PlanoSuporte; aoSair: () => void }) {
  const equipamentos = useStore((s) => s.equipamentos)
  const modelos = useStore((s) => s.modelos)
  const chamados = useStore((s) => s.chamados)
  const uso = usoSuporte(cliente.id, chamados)
  const drones = equipamentos.filter((e) => e.clienteId === cliente.id)

  return (
    <TelaCliente>
      <h1 className="titulo text-2xl">Olá, {cliente.tipo === 'PF' ? cliente.nome.split(' ')[0] : cliente.nome}!</h1>
      <p className="mt-1 text-mata-suave">Escolha o drone com dúvida.</p>

      <section className="mt-4 space-y-3 rounded-painel border border-linha bg-papel p-4" aria-label="Seu plano">
        <div className="flex items-center justify-between gap-2">
          <p className="font-medium">Plano {plano.nome}</p>
          <Selo cor="verde">Ativo até {dataCurta(cliente.suporte!.ativoAte)}</Selo>
        </div>
        <BarraUso rotulo="perguntas este mês" usado={uso.perguntas} limite={plano.perguntasIAMes} />
        <BarraUso rotulo="atendimentos com a equipe este mês" usado={uso.chamados} limite={plano.chamadosEquipeMes} />
      </section>

      <ul className="mt-4 space-y-3">
        {drones.length === 0 && <li className="rounded-painel border border-linha bg-papel p-4 text-sm text-mata-suave">Nenhum drone cadastrado no seu nome. Fale com a Aerobrasil.</li>}
        {drones.map((e) => {
          const m = modelos.find((x) => x.id === e.modeloId)
          return (
            <li key={e.id}>
              <Link to={`/suporte/${e.id}`} className="flex min-h-20 items-center gap-3 rounded-painel border border-linha bg-papel p-4 hover:bg-nevoa">
                <span className="min-w-0 flex-1">
                  <span className="block text-lg font-semibold">{m?.nome ?? 'Drone'}{e.apelido ? ` · ${e.apelido}` : ''}</span>
                  <span className="serial block truncate text-xs text-mata-suave">{e.serial}</span>
                  <span className="mt-0.5 block text-sm text-lavoura-texto">Tirar uma dúvida</span>
                </span>
                <ChevronRight size={22} className="shrink-0 text-mata-suave" aria-hidden />
              </Link>
            </li>
          )
        })}
      </ul>

      <div className="mt-4"><CardInstalar /></div>

      <button onClick={aoSair} className="mx-auto mt-6 inline-flex min-h-10 items-center gap-1.5 text-sm text-mata-suave"><LogOut size={16} aria-hidden />Sair</button>
    </TelaCliente>
  )
}
