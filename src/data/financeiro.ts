import type { Cliente, Lancamento, Movimentacao, NotaFiscal, Produto, Servico } from '@/types'
import { criarPRNG, diasAFrente, diasAtras } from './util'
import { SLUGS_GIRO, SLUGS_PARADOS, idProduto } from './produtos'

export function criarMovimentacoes(produtos: Produto[]): Movimentacao[] {
  const r = criarPRNG(21)
  const parados = new Set(SLUGS_PARADOS.map(idProduto))
  const giro = new Set(SLUGS_GIRO.map(idProduto))
  const pesos = produtos.map((p) => (giro.has(p.id) ? 7 : p.tipo === 'drone' ? 0.4 : 1))
  const soma = pesos.reduce((a, b) => a + b, 0)
  const escolher = () => {
    let x = r.rand() * soma
    for (let i = 0; i < produtos.length; i++) { x -= pesos[i]; if (x <= 0) return produtos[i] }
    return produtos[0]
  }
  const movs: Movimentacao[] = []
  for (let i = 0; i < 320; i++) {
    const p = escolher()
    const parado = parados.has(p.id)
    const saida = r.chance(parado ? 0.5 : 0.74)
    const dias = parado ? r.int(95, 180) : saida ? Math.floor(Math.pow(r.rand(), 1.3) * 180) : r.int(0, 180)
    const eGiro = giro.has(p.id)
    const qtd = p.tipo === 'drone' ? 1 : eGiro ? (saida ? r.int(1, p.preco < 100 ? 20 : 8) : r.int(10, 40)) : saida ? r.int(1, 2) : r.int(2, 6)
    const origem = saida
      ? r.pick([`OS ${r.int(1002, 1044)}`, `OS ${r.int(1002, 1044)}`, `Orçamento ${r.int(2070, 2109)}`, 'Venda balcão'])
      : r.chance(0.85) ? `NF ${r.int(5400, 5540)}` : 'Ajuste'
    movs.push({
      id: `mov-${i + 1}`, produtoId: p.id, tipo: saida ? 'saida' : 'entrada', quantidade: qtd,
      data: diasAtras(dias, r.int(8, 17), r.int(0, 59)), origem, valorUnit: saida ? p.preco : p.custo,
    })
  }
  // toda peça que não é "parada" tem ao menos uma saída recente (só as paradas ficam sem giro)
  const corte = Date.now() - 80 * 86400000
  const comSaidaRecente = new Set(movs.filter((m) => m.tipo === 'saida' && new Date(m.data).getTime() >= corte).map((m) => m.produtoId))
  let extra = movs.length
  for (const p of produtos) {
    if (p.tipo === 'drone' || parados.has(p.id) || comSaidaRecente.has(p.id)) continue
    movs.push({
      id: `mov-${++extra}`, produtoId: p.id, tipo: 'saida', quantidade: r.int(1, 2),
      data: diasAtras(r.int(3, 75), r.int(8, 17), r.int(0, 59)), origem: `OS ${r.int(1031, 1044)}`, valorUnit: p.preco,
    })
  }
  return movs.sort((a, b) => b.data.localeCompare(a.data))
}

export function criarNotas(produtos: Produto[], servicos: Servico[], clientes: Cliente[]): NotaFiscal[] {
  const r = criarPRNG(33)
  const prod = (slug: string) => produtos.find((p) => p.id === idProduto(slug))!
  const nfP = (slug: string, q: number) => { const p = prod(slug); return { descricao: p.nome, ncm: p.ncm, quantidade: q, valorUnit: p.preco, produtoId: p.id } }
  const nfC = (slug: string, q: number) => { const p = prod(slug); return { descricao: p.nome, ncm: p.ncm, quantidade: q, valorUnit: p.custo, produtoId: p.id } }
  const nfS = (id: string, q = 1) => { const s = servicos.find((x) => x.id === id)!; return { descricao: s.nome, ncm: '00.00.00.00', quantidade: q, valorUnit: s.preco } }
  const chave = () => Array.from({ length: 44 }, () => r.int(0, 9)).join('')
  type N = [NotaFiscal['tipo'], NotaFiscal['modelo'], string, string, number, NotaFiscal['status'], NotaFiscal['itens'], string?]
  const L: N[] = [
    ['saida', 'NF-e', 'Venda de mercadoria', 'cli-01', 3, 'autorizada', [nfP('hel-t40', 4), nfP('bico-t40', 4), nfP('parafuso-helice', 6)]],
    ['saida', 'NFS-e', 'Prestação de serviço de manutenção', 'cli-01', 25, 'autorizada', [nfS('srv-revisao'), nfS('srv-limpeza')], 'OS 1043'],
    ['saida', 'NF-e', 'Venda de mercadoria', 'cli-01', 25, 'autorizada', [nfP('bico-t25', 2), nfP('hel-t25', 1)], 'OS 1043'],
    ['saida', 'NF-e', 'Venda de drone', 'cli-12', 33, 'autorizada', [nfP('drone-t70p', 1), nfP('rtk-base', 1), nfP('bat-db2160', 2)], 'Orçamento 2109'],
    ['saida', 'NFS-e', 'Treinamento operacional', 'cli-12', 33, 'autorizada', [nfS('srv-treino')], 'Orçamento 2109'],
    ['saida', 'NF-e', 'Venda de mercadoria', 'cli-06', 28, 'autorizada', [nfP('mot-t50', 2), nfP('esc-t50', 2), nfP('braco-t50', 1)], 'OS 1042'],
    ['saida', 'NFS-e', 'Prestação de serviço de manutenção', 'cli-06', 28, 'autorizada', [nfS('srv-diag-queda'), nfS('srv-motor', 2), nfS('srv-teste-voo')], 'OS 1042'],
    ['saida', 'NF-e', 'Venda de mercadoria', 'cli-13', 1, 'pendente', [nfP('bomba-t40', 1), nfP('kit-vedacao', 1)], 'OS 1041'],
    ['saida', 'NFS-e', 'Prestação de serviço de manutenção', 'cli-07', 34, 'autorizada', [nfS('srv-calibracao'), nfS('srv-firmware')], 'OS 1044'],
    ['saida', 'NF-e', 'Venda de mercadoria', 'cli-14', 15, 'rejeitada', [nfP('hel-t20p', 2), nfP('bico-leque', 4)]],
    ['saida', 'NF-e', 'Venda de mercadoria', 'cli-10', 60, 'cancelada', [nfP('bat-db800', 1)]],
    ['saida', 'NF-e', 'Venda de mercadoria', 'cli-08', 45, 'autorizada', [nfP('bomba-t25', 2), nfP('bico-t25', 4), nfP('mangueira', 10)]],
    ['entrada', 'NF-e', 'Compra para revenda', 'Agridrone Importação', 20, 'autorizada', [nfC('hel-t40', 40), nfC('hel-t25', 30), nfC('bico-t40', 24)]],
    ['entrada', 'NF-e', 'Compra para revenda', 'Aerotec Distribuição', 55, 'autorizada', [nfC('misturador-300', 2), nfC('gerador', 1)]],
    ['entrada', 'NF-e', 'Compra para revenda', 'Agridrone Importação', 90, 'autorizada', [nfC('drone-t40', 2), nfC('drone-t50', 2), nfC('bat-db1560', 6)]],
    ['entrada', 'NF-e', 'Compra para revenda', 'Nordeste Componentes', 8, 'pendente', [nfC('parafuso-helice', 200), nfC('mangueira', 100), nfC('conector-rapido', 60)]],
  ]
  return L.map(([tipo, modelo, natureza, quem, dias, status, itens, origem], i) => {
    const valor = itens.reduce((s, it) => s + it.quantidade * it.valorUnit, 0)
    const cli = tipo === 'saida' ? clientes.find((c) => c.id === quem) : undefined
    return {
      id: `nf-${i + 1}`, numero: 5531 - i, serie: modelo === 'NFS-e' ? 'A1' : '1', tipo, modelo, natureza,
      clienteId: cli?.id, emitente: tipo === 'entrada' ? quem : undefined,
      data: diasAtras(dias), valor: Math.round(valor * 100) / 100, status,
      chave: chave(), itens, origem,
    }
  })
}

export function criarLancamentos(clientes: Cliente[]): Lancamento[] {
  const r = criarPRNG(44)
  const out: Lancamento[] = []
  let n = 0
  const add = (l: Omit<Lancamento, 'id'>) => out.push({ id: `lan-${++n}`, ...l })
  const clientesAtivos = clientes.filter((c) => c.id !== 'cli-04')
  for (let mes = 5; mes >= 0; mes--) {
    const base = mes * 30
    for (let k = 0; k < 3; k++) {
      const c = r.pick(clientesAtivos)
      const venc = base + r.int(0, 25) - 25 + 25
      const valor = Math.round(r.int(1800, k === 0 ? 62000 : 14000) / 10) * 10
      add({ tipo: 'receber', descricao: k === 0 ? `Venda de equipamento e peças, ${c.nome}` : `Serviços e peças, ${c.nome}`, categoria: k === 0 ? 'Vendas' : 'Oficina', valor, vencimento: diasAtras(venc), pagoEm: diasAtras(Math.max(0, venc - r.int(0, 3))), clienteId: c.id, forma: r.pick(['PIX', 'Boleto', 'Cartão']) })
    }
    add({ tipo: 'pagar', descricao: 'Compra de peças, Agridrone Importação', categoria: 'Fornecedores', valor: r.int(18, 55) * 1000, vencimento: diasAtras(base + 12), pagoEm: diasAtras(base + 12), forma: 'Boleto' })
    add({ tipo: 'pagar', descricao: 'Folha de pagamento e encargos', categoria: 'Pessoal', valor: 38500, vencimento: diasAtras(base + 5), pagoEm: diasAtras(base + 5), forma: 'Transferência' })
    add({ tipo: 'pagar', descricao: 'Aluguel e impostos das unidades', categoria: 'Despesas fixas', valor: r.int(9, 14) * 1000, vencimento: diasAtras(base + 20), pagoEm: diasAtras(base + 20), forma: 'Boleto' })
  }
  add({ tipo: 'receber', descricao: 'Boleto OS 1042, Fazenda Três Coxilhas', categoria: 'Oficina', valor: 12840, vencimento: diasAtras(6), clienteId: 'cli-06', forma: 'Boleto', origem: 'OS 1042' })
  add({ tipo: 'receber', descricao: 'Serviços OS 1038, Aerolavoura', categoria: 'Oficina', valor: 9120, vencimento: diasAtras(13), clienteId: 'cli-05', forma: 'Boleto', origem: 'OS 1038' })
  add({ tipo: 'receber', descricao: 'Parcela 1/36 drone T70P, Agrícola Cerrado Mineiro', categoria: 'Vendas', valor: 5230, vencimento: diasAFrente(4), clienteId: 'cli-12', forma: 'Financiamento', origem: 'Orçamento 2109' })
  add({ tipo: 'receber', descricao: 'Peças pedido 2105, Fazenda Santa Luzia', categoria: 'Vendas', valor: 4786, vencimento: diasAFrente(9), clienteId: 'cli-01', forma: 'PIX', origem: 'Orçamento 2105' })
  add({ tipo: 'receber', descricao: 'Manutenção OS 1041, Aeroagro', categoria: 'Oficina', valor: 2230, vencimento: diasAFrente(15), clienteId: 'cli-13', forma: 'Boleto', origem: 'OS 1041' })
  add({ tipo: 'receber', descricao: 'Sinal drone T25, Ricardo Zanella', categoria: 'Vendas', valor: 15000, vencimento: diasAFrente(24), clienteId: 'cli-07', forma: 'PIX', origem: 'Orçamento 2108' })
  add({ tipo: 'pagar', descricao: 'Compra de parafusos e mangueiras, Nordeste Componentes', categoria: 'Fornecedores', valor: 11400, vencimento: diasAFrente(6), forma: 'Boleto', origem: 'NF 5524' })
  add({ tipo: 'pagar', descricao: 'Frete e importação, lote de baterias', categoria: 'Fornecedores', valor: 8700, vencimento: diasAtras(2), forma: 'Boleto' })
  add({ tipo: 'pagar', descricao: 'Folha de pagamento e encargos', categoria: 'Pessoal', valor: 38500, vencimento: diasAFrente(25), forma: 'Transferência' })
  return out.sort((a, b) => a.vencimento.localeCompare(b.vencimento))
}
