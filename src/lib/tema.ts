import { useSyncExternalStore } from 'react'

export type PreferenciaTema = 'claro' | 'escuro'
const CHAVE = 'aero-tema'
const COR_BARRA = { claro: '#10231C', escuro: '#0E1714' }

const ouvintes = new Set<() => void>()
let preferencia: PreferenciaTema = lerSalva()

function lerSalva(): PreferenciaTema {
  try { return localStorage.getItem(CHAVE) === 'escuro' ? 'escuro' : 'claro' } catch { return 'claro' }
}

/** Aplica o tema no <html> e na cor da barra do navegador. */
export function aplicarTema() {
  const escuro = preferencia === 'escuro'
  const html = document.documentElement
  if (escuro) html.setAttribute('data-tema', 'escuro'); else html.removeAttribute('data-tema')
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', escuro ? COR_BARRA.escuro : COR_BARRA.claro)
}

export function definirTema(p: PreferenciaTema) {
  preferencia = p
  try { localStorage.setItem(CHAVE, p) } catch { /* sem armazenamento */ }
  aplicarTema()
  ouvintes.forEach((f) => f())
}

/** Chamar uma vez na abertura. */
export function iniciarTema() {
  aplicarTema()
}

export function useTema(): PreferenciaTema {
  return useSyncExternalStore((f) => { ouvintes.add(f); return () => { ouvintes.delete(f) } }, () => preferencia, () => 'claro' as PreferenciaTema)
}
