import { useState } from 'react'
import { KeyRound, Smartphone } from 'lucide-react'
import { Button } from '@/components/ui'
import { useStore } from '@/store'
import { entrarSuporte, situacaoSuporte } from '@/lib/suporte'
import type { Cliente } from '@/types'
import { TelaCliente } from './comum'

const campo = 'h-14 w-full rounded-campo border border-linha bg-papel px-4 text-lg text-mata outline-none focus:border-lavoura'

export default function Login({ aoEntrar }: { aoEntrar: (c: Cliente) => void }) {
  const clientes = useStore((s) => s.clientes)
  const [celular, setCelular] = useState('')
  const [pin, setPin] = useState('')
  const [erro, setErro] = useState('')
  const contas = clientes.filter((c) => situacaoSuporte(c) === 'ativo').slice(0, 2)

  function entrar(e: React.FormEvent) {
    e.preventDefault()
    const c = entrarSuporte(clientes, celular, pin)
    if (!c) { setErro('Celular ou senha incorretos. Confira e tente de novo.'); return }
    setErro('')
    aoEntrar(c)
  }

  return (
    <TelaCliente>
      <h1 className="titulo text-2xl">Suporte Aerobrasil</h1>
      <p className="mt-1 text-mata-suave">Tire dúvidas do seu drone a qualquer hora.</p>

      <form onSubmit={entrar} className="mt-6 space-y-4">
        <label className="block">
          <span className="mb-1.5 flex items-center gap-1.5 font-medium"><Smartphone size={18} aria-hidden />Seu celular</span>
          <input className={campo} value={celular} onChange={(e) => setCelular(e.target.value)} inputMode="tel" autoComplete="tel" placeholder="(77) 90000-0000" />
        </label>
        <label className="block">
          <span className="mb-1.5 flex items-center gap-1.5 font-medium"><KeyRound size={18} aria-hidden />Senha de 4 números</span>
          <input className={`${campo} tracking-[0.5em]`} value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))} inputMode="numeric" type="password" autoComplete="current-password" placeholder="••••" maxLength={4} />
        </label>
        {erro && <p role="alert" className="rounded-campo bg-barro-claro p-3 text-sm text-barro-texto">{erro}</p>}
        <Button type="submit" tamanho="lg" className="h-14 w-full text-base">Entrar</Button>
        <p className="text-center text-sm text-mata-suave">Não tem a senha? A Aerobrasil envia o acesso pelo WhatsApp.</p>
      </form>

      {contas.length > 0 && (
        <div className="mt-8 rounded-painel border border-dashed border-linha bg-papel p-3.5 text-sm">
          <p className="font-medium">Demonstração: contas de teste</p>
          <ul className="mt-1.5 space-y-2">
            {contas.map((c) => (
              <li key={c.id}>
                <button type="button" onClick={() => { setCelular(c.fone); setPin(c.suporte!.pin) }} className="min-h-10 w-full rounded-campo bg-nevoa px-3 py-2 text-left">
                  <span className="block">{c.nome}</span>
                  <span className="tabular-nums text-mata-suave">{c.fone} · senha {c.suporte!.pin}</span>
                </button>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-mata-suave">Toque numa conta para preencher.</p>
        </div>
      )}
    </TelaCliente>
  )
}
