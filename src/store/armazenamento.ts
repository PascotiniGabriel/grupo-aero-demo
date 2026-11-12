import { del, get, set } from 'idb-keyval'
import type { StateStorage } from 'zustand/middleware'

/** Storage assíncrono em IndexedDB (aguenta fotos em dataURL; gravação a cada alteração). */
export const idbStorage: StateStorage = {
  getItem: async (nome) => {
    try { return ((await get(nome)) as string | undefined) ?? null } catch { return null }
  },
  setItem: async (nome, valor) => {
    try { await set(nome, valor) } catch (e) { console.warn('Não foi possível gravar no aparelho', e) }
  },
  removeItem: async (nome) => { try { await del(nome) } catch { /* sem armazenamento */ } },
}

/** Pede ao navegador para não apagar os dados quando faltar espaço. */
export async function pedirArmazenamentoPersistente() {
  try { await navigator.storage?.persist?.() } catch { /* ignora */ }
}

export async function usoDeArmazenamento(): Promise<{ usado: number; total: number; persistente: boolean } | null> {
  try {
    const e = await navigator.storage?.estimate?.()
    if (!e) return null
    return { usado: e.usage ?? 0, total: e.quota ?? 0, persistente: (await navigator.storage.persisted?.()) ?? false }
  } catch { return null }
}
