import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Check, ChevronsUpDown } from 'lucide-react'
import { useStore } from '@/store'
import { Avatar, toast } from '@/components/ui'
import { inicioDoPapel } from '@/lib/acesso'

/** Troca o usuário da demonstração, avisa e vai para o início do papel. */
export function useVerComo() {
  const usuarios = useStore((s) => s.usuarios)
  const atualId = useStore((s) => s.usuarioAtualId)
  const definir = useStore((s) => s.definirUsuario)
  const navegar = useNavigate()
  const atual = usuarios.find((u) => u.id === atualId) ?? usuarios[0]
  const trocar = (id: string) => {
    const u = usuarios.find((x) => x.id === id)
    if (!u) return
    definir(u.id)
    toast.sucesso(`Agora você está vendo como ${u.nome.split(' ')[0]} (${u.papel})`)
    navegar(inicioDoPapel(u.papel))
  }
  return { usuarios, atual, trocar }
}

/** "Ver como: Marina (Gestor)" com a lista de usuários. Para uso sobre fundo escuro. */
export function VerComo({ aoTrocar }: { aoTrocar?: () => void }) {
  const { usuarios, atual, trocar } = useVerComo()
  const [aberto, setAberto] = useState(false)
  const caixa = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!aberto) return
    const fora = (e: MouseEvent) => { if (!caixa.current?.contains(e.target as Node)) setAberto(false) }
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setAberto(false) }
    document.addEventListener('mousedown', fora)
    document.addEventListener('keydown', esc)
    return () => { document.removeEventListener('mousedown', fora); document.removeEventListener('keydown', esc) }
  }, [aberto])

  if (!atual) return null
  return (
    <div ref={caixa} className="relative mt-1">
      <button
        type="button" onClick={() => setAberto((a) => !a)} aria-haspopup="menu" aria-expanded={aberto}
        className="flex w-full items-center gap-2.5 rounded-campo bg-white/[0.07] px-2 py-2 text-left transition-colors hover:bg-white/10 focus-visible:outline-white"
      >
        <Avatar nome={atual.nome} tamanho={34} />
        <span className="min-w-0 flex-1 leading-tight">
          <span className="block text-[11px] text-white/55">Ver como</span>
          <span className="block truncate text-sm font-medium text-white">{atual.nome.split(' ')[0]} ({atual.papel})</span>
        </span>
        <ChevronsUpDown size={15} className="shrink-0 text-white/50" aria-hidden />
      </button>
      {aberto && (
        <div role="menu" aria-label="Ver o sistema como" className="anim-entrar absolute inset-x-0 bottom-full z-10 mb-1 rounded-painel border border-linha bg-papel p-1 text-mata shadow-xl">
          <p className="px-2.5 pb-1 pt-1.5 text-xs text-mata-suave">Ver o sistema como</p>
          {usuarios.map((u) => (
            <button
              key={u.id} type="button" role="menuitemradio" aria-checked={u.id === atual.id}
              onClick={() => { setAberto(false); if (u.id !== atual.id) { trocar(u.id); aoTrocar?.() } }}
              className="flex min-h-10 w-full items-center gap-2 rounded-campo px-2.5 py-1.5 text-left text-sm hover:bg-nevoa"
            >
              <span className="min-w-0 flex-1 truncate">{u.nome.split(' ')[0]}<span className="ml-2 text-xs text-mata-suave">{u.papel}</span></span>
              {u.id === atual.id && <Check size={15} className="shrink-0 text-lavoura-texto" aria-hidden />}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
