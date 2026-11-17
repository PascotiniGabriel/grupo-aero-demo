import type { Cotacao, Fornecedor } from '@/types'
import { diasAtras } from './util'
import { idProduto } from './produtos'

export function criarFornecedores(): Fornecedor[] {
  return [
    { id: 'for-1', nome: 'AgroParts Distribuidora', cidade: 'Ribeirão Preto', contato: 'Renato Almeida', fone: '(77) 90000-0081', email: 'vendas@agroparts.exemplo.com.br', categorias: ['Propulsão', 'Estrutura', 'Pulverização'], prazoMedioDias: 5 },
    { id: 'for-2', nome: 'Rotor Sul Peças', cidade: 'Passo Fundo', contato: 'Camila Duarte', fone: '(77) 90000-0082', email: 'comercial@rotorsul.exemplo.com.br', categorias: ['Propulsão', 'Eletrônica'], prazoMedioDias: 7 },
    { id: 'for-3', nome: 'DroneTech Importadora', cidade: 'São Paulo', contato: 'Fábio Nogueira', fone: '(77) 90000-0083', email: 'pedidos@dronetech.exemplo.com.br', categorias: ['Eletrônica', 'Sensores', 'Drones', 'Acessórios'], prazoMedioDias: 12 },
    { id: 'for-4', nome: 'Baterias Centro-Oeste', cidade: 'Goiânia', contato: 'Marta Queiroz', fone: '(77) 90000-0084', email: 'atendimento@bateriascentro.exemplo.com.br', categorias: ['Energia'], prazoMedioDias: 6 },
    { id: 'for-5', nome: 'Hélices & Cia', cidade: 'Curitiba', contato: 'Jorge Prado', fone: '(77) 90000-0085', email: 'contato@helicesecia.exemplo.com.br', categorias: ['Propulsão', 'Acessórios'], prazoMedioDias: 4 },
  ]
}

export function criarCotacoes(): Cotacao[] {
  return [
    {
      id: 'cot-1', numero: 1, titulo: 'Reposição de hélices e bicos do T40', criadaEm: diasAtras(1), status: 'rascunho',
      itens: [
        { produtoId: idProduto('hel-t40'), descricao: 'Hélice T40 (par)', quantidade: 12 },
        { produtoId: idProduto('bico-t40'), descricao: 'Bico centrífugo T40', quantidade: 10 },
        { produtoId: idProduto('filtro-tanque'), descricao: 'Filtro do tanque', quantidade: 8 },
      ],
      fornecedorIds: ['for-1', 'for-5'], respostas: [],
    },
    {
      id: 'cot-2', numero: 2, titulo: 'Baterias e carregador para a revenda', criadaEm: diasAtras(4), status: 'enviada',
      itens: [
        { produtoId: idProduto('bat-db800'), descricao: 'Bateria inteligente DB800', quantidade: 6 },
        { produtoId: idProduto('carregador-t25'), descricao: 'Carregador T25', quantidade: 3 },
      ],
      fornecedorIds: ['for-3', 'for-4'], respostas: [],
    },
    {
      id: 'cot-3', numero: 3, titulo: 'Motor e ESC para a OS 1035', osId: 'os-1035', criadaEm: diasAtras(6), status: 'respondida',
      itens: [
        { produtoId: idProduto('mot-t40'), descricao: 'Motor de propulsão T40', quantidade: 2 },
        { produtoId: idProduto('esc-t40'), descricao: 'ESC T40', quantidade: 2 },
        { produtoId: idProduto('parafuso-helice'), descricao: 'Parafuso de hélice M5', quantidade: 10 },
      ],
      fornecedorIds: ['for-1', 'for-2', 'for-3'],
      respostas: [
        { fornecedorId: 'for-1', precos: [1180, 640, 6.5], frete: 120, outrasDespesas: 0, prazoDias: 5, recebidaEm: diasAtras(4, 10) },
        { fornecedorId: 'for-2', precos: [1090, 690, 0], frete: 95, outrasDespesas: 35, prazoDias: 8, observacao: 'Parafusos em falta, sem previsão.', recebidaEm: diasAtras(3, 15) },
        { fornecedorId: 'for-3', precos: [1050, 590, 5.9], frete: 0, outrasDespesas: 180, prazoDias: 14, observacao: 'Importação: taxas já incluídas em outras despesas.', recebidaEm: diasAtras(2, 9) },
      ],
    },
  ]
}
