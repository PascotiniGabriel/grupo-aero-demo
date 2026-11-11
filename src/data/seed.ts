import type { Dados } from '@/types'
import { criarClientes, criarEquipamentos, EMPRESA, SERVICOS, USUARIOS } from './pessoas'
import { criarProdutos, MODELOS } from './produtos'
import { criarComercial } from './comercial'
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
    clientes,
    equipamentos: criarEquipamentos(),
    orcamentos,
    ordens,
    notas: criarNotas(produtos, SERVICOS, clientes),
    lancamentos: criarLancamentos(clientes),
    leads,
    conversas,
  }
}
