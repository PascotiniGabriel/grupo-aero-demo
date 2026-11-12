import type { Dados } from '@/types'
import { criarClientes, criarEquipamentos, EMPRESA, SERVICOS, USUARIOS } from './pessoas'
import { criarProdutos, MODELOS } from './produtos'
import { criarComercial } from './comercial'
import { criarCompromissos } from './agenda'
import { LOCAIS_CLIENTES, OS_CAMPO } from './locais'
import { criarLancamentos, criarMovimentacoes, criarNotas } from './financeiro'

export { diasAtras, diasAFrente, criarPRNG } from './util'

/** Dados de demonstração, determinísticos e com datas relativas a hoje. Tudo fictício. */
export function criarDadosDemo(): Dados {
  const produtos = criarProdutos()
  const clientes = criarClientes()
  const { orcamentos, ordens, leads, conversas } = criarComercial(produtos, SERVICOS)
  return {
    empresa: { ...EMPRESA, unidades: [...EMPRESA.unidades] },
    usuarios: USUARIOS.map((u) => ({ ...u })),
    modelos: MODELOS.map((m) => ({ ...m })),
    produtos,
    movimentacoes: criarMovimentacoes(produtos),
    servicos: SERVICOS.map((s) => ({ ...s })),
    clientes: clientes.map((c) => (LOCAIS_CLIENTES[c.id] ? { ...c, locais: LOCAIS_CLIENTES[c.id].map((l) => ({ ...l })) } : c)),
    equipamentos: criarEquipamentos(),
    orcamentos,
    ordens: ordens.map((o) => {
      const campo = OS_CAMPO[o.id]
      const local = campo ? LOCAIS_CLIENTES[campo[0]]?.[campo[1]] : undefined
      return campo && local ? { ...o, atendimento: 'campo' as const, local: { ...local } } : { ...o, atendimento: 'oficina' as const }
    }),
    notas: criarNotas(produtos, SERVICOS, clientes),
    lancamentos: criarLancamentos(clientes),
    leads,
    conversas,
    compromissos: criarCompromissos(),
  }
}
