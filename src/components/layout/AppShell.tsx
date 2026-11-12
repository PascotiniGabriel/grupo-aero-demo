import { Suspense, useEffect, useRef, useState } from 'react'
import { Link, NavLink, Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { CalendarDays, ClipboardCheck, Ellipsis, FileText, House, Loader2, Menu, MessageCircle, Package, QrCode, Receipt, Search, Settings, ShieldOff, Sparkles, Wrench, X, type LucideIcon } from 'lucide-react'
import { useStore } from '@/store'
import { Button, EstadoVazio, IconButton, SeloIA, Toasts, cx } from '@/components/ui'
import { inicioDoPapel, podeAcessar, type Papel } from '@/lib/acesso'
import { LeitorQR, useLeitorQR } from '@/components/qr/LeitorQR'
import { BuscaGlobal, useBuscaGlobal } from './BuscaGlobal'
import { Marca } from './Marca'
import { gruposDoPapel, usePapel, type ItemNav } from './nav'
import { IndicadorSync } from './Sincronizacao'
import { VerComo } from './VerComo'

/** Casca do app: barra lateral, barra superior, navegação do celular, busca global, leitor de QR e avisos. */
export function AppShell() {
  const [menuAberto, setMenuAberto] = useState(false)
  const { pathname } = useLocation()
  const abrirQR = useLeitorQR((s) => s.abrir)
  const papel = usePapel()
  const permitido = podeAcessar(papel, pathname)

  useEffect(() => {
    setMenuAberto(false)
    window.scrollTo(0, 0)
  }, [pathname])

  return (
    <div className="casca-app flex min-h-dvh">
      <aside className="nao-imprimir sticky top-0 hidden h-dvh w-[252px] shrink-0 bg-mata lg:block">
        <BarraLateral />
      </aside>

      {menuAberto && (
        <div className="nao-imprimir fixed inset-0 z-40 lg:hidden" role="presentation">
          <div className="absolute inset-0 bg-mata/60" onClick={() => setMenuAberto(false)} aria-hidden />
          <div role="dialog" aria-modal="true" aria-label="Menu" className="anim-menu relative h-full w-[min(300px,86vw)] bg-mata shadow-2xl">
            <BarraLateral aoFechar={() => setMenuAberto(false)} />
          </div>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <FaixaDemo />
        <BarraSuperior abrirMenu={() => setMenuAberto(true)} />
        <main className="mx-auto w-full max-w-[1400px] flex-1 px-4 pb-28 pt-5 md:px-6 lg:px-8 lg:pb-10">
          <Suspense fallback={<Carregando />}>
            {permitido ? <Outlet /> : pathname === '/' ? <Navigate to={inicioDoPapel(papel)} replace /> : <NaoPermitido papel={papel} />}
          </Suspense>
        </main>
      </div>

      <NavCelular papel={papel} abrirMenu={() => setMenuAberto(true)} abrirQR={() => abrirQR()} />
      <BuscaGlobal />
      <LeitorQR />
      <Toasts />
    </div>
  )
}

function NaoPermitido({ papel }: { papel: Papel }) {
  const navegar = useNavigate()
  return (
    <EstadoVazio
      icone={<ShieldOff size={28} />}
      titulo={`Seu perfil (${papel}) não acessa esta tela`}
      texto="Cada setor vê só o que é do trabalho dele. Para ver esta tela, troque o perfil em Ver como."
      acao={<Button onClick={() => navegar(inicioDoPapel(papel))}>Ir para o meu início</Button>}
    />
  )
}

function Carregando() {
  return (
    <div className="flex items-center justify-center gap-2 py-24 text-sm text-mata-suave" role="status">
      <Loader2 size={18} className="animate-spin" aria-hidden /> Carregando
    </div>
  )
}

/* ------------------------------------------------------------------ faixa de demonstração */

function FaixaDemo() {
  const [visivel, setVisivel] = useState(() => {
    try { return sessionStorage.getItem('aero-faixa') !== 'oculta' } catch { return true }
  })
  if (!visivel) return null
  const fechar = () => {
    setVisivel(false)
    try { sessionStorage.setItem('aero-faixa', 'oculta') } catch { /* sem armazenamento */ }
  }
  return (
    <div className="nao-imprimir flex items-center gap-2 bg-ambar-claro pl-4 pr-1 text-xs text-[#7A5600] md:pl-6 lg:pl-8">
      <p className="flex-1 py-1.5">Demonstração com dados fictícios. O que você alterar fica salvo só neste navegador.</p>
      <button type="button" onClick={fechar} aria-label="Dispensar aviso de demonstração" className="flex h-9 w-9 shrink-0 items-center justify-center rounded hover:bg-ambar/15">
        <X size={14} aria-hidden />
      </button>
    </div>
  )
}

/* ------------------------------------------------------------------ barra lateral */

function BarraLateral({ aoFechar }: { aoFechar?: () => void }) {
  const naoLidas = useStore((s) => s.conversas.reduce((n, c) => n + c.naoLidas, 0))
  const papel = usePapel()
  const grupos = gruposDoPapel(papel)

  return (
    <div className="flex h-full flex-col text-white">
      <div className="flex h-16 shrink-0 items-center justify-between pl-5 pr-2">
        <Link to="/" aria-label="Grupo AERO, ir para o início" className="rounded-campo"><Marca clara /></Link>
        {aoFechar && (
          <button type="button" onClick={aoFechar} aria-label="Fechar menu" className="flex h-10 w-10 items-center justify-center rounded-campo text-white/70 hover:bg-white/10 hover:text-white">
            <X size={18} aria-hidden />
          </button>
        )}
      </div>

      <nav aria-label="Principal" className="flex-1 overflow-y-auto px-3 pb-3">
        {grupos.map((g, i) => (
          <div key={g.titulo ?? i} className={cx(i > 0 && 'mt-4')}>
            {g.titulo && <p className="px-3 pb-1 text-xs text-white/45">{g.titulo}</p>}
            <ul className="flex flex-col gap-0.5">
              {g.itens.map((item) => (
                <li key={item.para}><LinkLateral item={item} contador={item.contador === 'conversas' ? naoLidas : 0} /></li>
              ))}
            </ul>
          </div>
        ))}

        <div className="mt-4 border-t border-white/10 pt-3">
          <NavLink to="/assistente" className={({ isActive }) => cx(ESTILO_LINK, isActive ? ESTILO_ATIVO : ESTILO_INATIVO)}>
            <Sparkles size={18} className="shrink-0" aria-hidden />
            <span className="flex-1 truncate">Assistente</span>
            <SeloIA />
          </NavLink>
        </div>
      </nav>

      <div className="shrink-0 border-t border-white/10 p-3">
        <NavLink to="/config" className={({ isActive }) => cx(ESTILO_LINK, isActive ? ESTILO_ATIVO : ESTILO_INATIVO)}>
          <Settings size={18} className="shrink-0" aria-hidden />
          <span className="flex-1 truncate">{papel === 'Gestor' ? 'Configurações' : 'Meu perfil'}</span>
        </NavLink>
        <VerComo aoTrocar={aoFechar} />
      </div>
    </div>
  )
}

const ESTILO_LINK = 'relative flex min-h-10 items-center gap-3 rounded-campo px-3 py-2 text-sm transition-colors focus-visible:outline-white'
const ESTILO_ATIVO = 'bg-white/10 font-medium text-white before:absolute before:inset-y-2 before:left-0 before:w-[3px] before:rounded-full before:bg-[#4CC27D]'
const ESTILO_INATIVO = 'text-white/70 hover:bg-white/5 hover:text-white'

function LinkLateral({ item, contador }: { item: ItemNav; contador: number }) {
  const I = item.icone
  return (
    <NavLink to={item.para} end={item.exato} className={({ isActive }) => cx(ESTILO_LINK, isActive ? ESTILO_ATIVO : ESTILO_INATIVO)}>
      <I size={18} className="shrink-0" aria-hidden />
      <span className="flex-1 truncate">{item.rotulo}</span>
      {contador > 0 && (
        <span className="num flex h-5 min-w-5 items-center justify-center rounded-full bg-lavoura px-1.5 text-xs font-semibold text-white" aria-label={`${contador} não lidas`}>
          {contador}
        </span>
      )}
    </NavLink>
  )
}

/* ------------------------------------------------------------------ barra superior */

function BarraSuperior({ abrirMenu }: { abrirMenu: () => void }) {
  const abrirBusca = useBuscaGlobal((s) => s.abrir)
  const abrirQR = useLeitorQR((s) => s.abrir)
  const mac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform)

  return (
    <header className="nao-imprimir sticky top-0 z-30 border-b border-linha bg-nevoa/92 backdrop-blur">
      <div className="mx-auto flex h-14 w-full max-w-[1400px] items-center gap-2 px-2 md:px-4 lg:h-16 lg:gap-3 lg:px-8">
        <IconButton aria-label="Abrir menu" icone={<Menu size={20} aria-hidden />} onClick={abrirMenu} className="lg:hidden" />
        <Link to="/" aria-label="Grupo AERO, ir para o início" className="rounded-campo lg:hidden"><Marca /></Link>

        <button
          type="button" onClick={abrirBusca}
          className="hidden h-10 max-w-xl flex-1 items-center gap-2.5 rounded-campo border border-linha bg-papel px-3 text-left text-sm text-mata-suave transition-colors hover:border-mata-suave/40 lg:flex"
        >
          <Search size={16} className="shrink-0" aria-hidden />
          <span className="flex-1 truncate">Buscar cliente, peça, ordem de serviço ou serial</span>
          <kbd className="rounded border border-linha bg-nevoa px-1.5 py-0.5 font-sans text-[11px] text-mata-suave">{mac ? '⌘ K' : 'Ctrl K'}</kbd>
        </button>

        <div className="flex-1" />

        <IndicadorSync />
        <IconButton aria-label="Buscar" icone={<Search size={20} aria-hidden />} onClick={abrirBusca} className="lg:hidden" />
        <div className="hidden lg:block">
          <Button variante="secundario" icone={<QrCode size={17} aria-hidden />} onClick={() => abrirQR()}>Ler QR</Button>
        </div>
        <Link
          to="/assistente" aria-label="Perguntar à IA"
          className="ia-borda inline-flex h-10 shrink-0 items-center gap-2 rounded-campo px-3 text-sm font-medium text-mata transition-shadow hover:shadow-[0_0_0_3px_rgb(30_120_200/0.14)]"
        >
          <Sparkles size={16} className="text-ceu" aria-hidden />
          <span className="hidden sm:inline">Perguntar à IA</span>
        </Link>
      </div>
    </header>
  )
}

/* ------------------------------------------------------------------ navegação do celular */

interface AtalhoCel { para: string; rotulo: string; icone: LucideIcon; exato?: boolean }
const ATALHOS_CEL: Record<Papel, [AtalhoCel, AtalhoCel]> = {
  Gestor: [{ para: '/', rotulo: 'Início', icone: House, exato: true }, { para: '/os', rotulo: 'Oficina', icone: Wrench }],
  Vendas: [{ para: '/', rotulo: 'Início', icone: House, exato: true }, { para: '/orcamentos', rotulo: 'Orçamentos', icone: FileText }],
  Técnico: [{ para: '/agenda', rotulo: 'Agenda', icone: CalendarDays }, { para: '/os', rotulo: 'OS', icone: Wrench }],
  Estoque: [{ para: '/', rotulo: 'Início', icone: House, exato: true }, { para: '/estoque', rotulo: 'Peças', icone: Package }],
}
const ATALHO_DIREITA: Record<Papel, AtalhoCel> = {
  Gestor: { para: '/estoque', rotulo: 'Estoque', icone: Package },
  Vendas: { para: '/conversas', rotulo: 'Conversas', icone: MessageCircle },
  Técnico: { para: '/relatorios', rotulo: 'Relatórios', icone: ClipboardCheck },
  Estoque: { para: '/notas', rotulo: 'Notas', icone: Receipt },
}

function NavCelular({ papel, abrirMenu, abrirQR }: { papel: Papel; abrirMenu: () => void; abrirQR: () => void }) {
  const item = 'flex h-14 flex-1 flex-col items-center justify-center gap-0.5 text-[11px] font-medium transition-colors'
  const estado = ({ isActive }: { isActive: boolean }) => cx(item, isActive ? 'text-lavoura-escuro' : 'text-mata-suave')
  const [e1, e2] = ATALHOS_CEL[papel]
  const d = ATALHO_DIREITA[papel]
  const Link1 = ({ a }: { a: AtalhoCel }) => <NavLink to={a.para} end={a.exato} className={estado}><a.icone size={20} aria-hidden />{a.rotulo}</NavLink>
  return (
    <nav aria-label="Atalhos" className="nao-imprimir fixed inset-x-0 bottom-0 z-30 border-t border-linha bg-papel pb-[env(safe-area-inset-bottom)] lg:hidden">
      <div className="mx-auto flex max-w-lg items-end px-1">
        <Link1 a={e1} />
        <Link1 a={e2} />
        <div className="flex flex-1 justify-center">
          <button
            type="button" onClick={abrirQR} aria-label="Ler QR code"
            className="-mt-5 mb-1.5 flex h-14 w-14 flex-col items-center justify-center rounded-full bg-lavoura text-white shadow-lg ring-4 ring-papel transition-colors active:bg-lavoura-escuro"
          >
            <QrCode size={24} aria-hidden />
          </button>
        </div>
        <Link1 a={d} />
        <button type="button" onClick={abrirMenu} className={cx(item, 'text-mata-suave')}><Ellipsis size={20} aria-hidden />Mais</button>
      </div>
    </nav>
  )
}
