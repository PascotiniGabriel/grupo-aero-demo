import { useSyncExternalStore } from 'react'

export type PreferenciaTema = 'claro' | 'escuro' | 'auto'
const CHAVE = 'aero-tema'
const COR_BARRA = { claro: '#10231C', escuro: '#0E1714' }

const ouvintes = new Set<() => void>()
let preferencia: PreferenciaTema = lerSalva()

function lerSalva(): PreferenciaTema {
  try {
    const v = localStorage.getItem(CHAVE)
    return v === 'claro' || v === 'escuro' ? v : 'auto'
  } catch { return 'auto' }
}

function sistemaEscuro(): boolean {
  try { return window.matchMedia('(prefers-color-scheme: dark)').matches } catch { return false }
}

/** Aplica o tema no <html> e na cor da barra do navegador. */
export function aplicarTema() {
  const escuro = preferencia === 'escuro' || (preferencia === 'auto' && sistemaEscuro())
  const html = document.documentElement
  if (escuro) html.setAttribute('data-tema', 'escuro'); else html.removeAttribute('data-tema')
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', escuro ? COR_BARRA.escuro : COR_BARRA.claro)
}

export function definirTema(p: PreferenciaTema) {
  preferencia = p
  try { if (p === 'auto') localStorage.removeItem(CHAVE); else localStorage.setItem(CHAVE, p) } catch { /* sem armazenamento */ }
  aplicarTema()
  ouvintes.forEach((f) => f())
}

/** Chamar uma vez na abertura: acompanha mudanças do sistema quando está em Automático. */
export function iniciarTema() {
  aplicarTema()
  try {
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => { if (preferencia === 'auto') aplicarTema() })
  } catch { /* navegador antigo */ }
}

export function useTema(): PreferenciaTema {
  return useSyncExternalStore((f) => { ouvintes.add(f); return () => { ouvintes.delete(f) } }, () => preferencia, () => 'auto' as PreferenciaTema)
}

export const ROTULO_TEMA: Record<PreferenciaTema, string> = { claro: 'Claro', escuro: 'Escuro', auto: 'Automático' }
export const PROXIMO_TEMA: Record<PreferenciaTema, PreferenciaTema> = { auto: 'claro', claro: 'escuro', escuro: 'auto' }
