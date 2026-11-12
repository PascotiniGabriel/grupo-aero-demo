export interface ModeloDrone { id: string; nome: string; rotores: 4 | 8; tanqueL: number; ano: number }

export type GrupoDiagrama =
  | 'motor' | 'helice' | 'braco' | 'esc' | 'tanque' | 'bomba' | 'bico' | 'radar'
  | 'bateria' | 'trem' | 'camera' | 'placa' | 'controle' | 'carregador'

export type CategoriaProduto =
  | 'Propulsão' | 'Pulverização' | 'Estrutura' | 'Eletrônica' | 'Energia' | 'Sensores' | 'Acessórios' | 'Drones'

export interface Produto {
  id: string
  sku: string
  codigoFabricante: string
  nome: string
  categoria: CategoriaProduto
  tipo: 'peca' | 'drone' | 'acessorio'
  modelosCompativeis: string[]
  grupo?: GrupoDiagrama
  custo: number
  preco: number
  estoque: number
  estoqueMinimo: number
  pesoG: number
  dimensoesCm: { c: number; l: number; a: number }
  ncm: string
  localizacao: string
  fornecedor: string
  controlaSerial: boolean
  seriais: string[]
  observacao?: string
}

export interface Movimentacao {
  id: string
  produtoId: string
  tipo: 'entrada' | 'saida'
  quantidade: number
  data: string
  origem: string
  valorUnit: number
}

export interface Servico { id: string; nome: string; preco: number; horas: number }

/** Ponto no mapa (área rural: as coordenadas são o dado principal). */
export interface Local {
  lat: number; lng: number; descricao: string
  /** Ex.: "Depois da porteira azul, 3 km de estrada de chão". */
  referencia?: string
  origem?: 'whatsapp' | 'cadastro' | 'tecnico'
  atualizadoEm?: string
}

export interface Cliente {
  id: string; nome: string; tipo: 'PF' | 'PJ'; documento: string; ie?: string
  cidade: string; uf: string; endereco: string; cep: string; fone: string; email: string
  desde: string; observacao?: string
  locais?: Local[]
}

export interface Equipamento {
  id: string; clienteId: string; modeloId: string; serial: string; apelido?: string
  horasVoo: number; hectares: number; compradoConosco: boolean; dataCompra?: string; garantiaAte?: string
}

export interface ItemComercial {
  id: string
  tipo: 'peca' | 'servico' | 'drone'
  produtoId?: string
  servicoId?: string
  descricao: string
  quantidade: number
  valorUnit: number
}

export type StatusOrcamento = 'rascunho' | 'enviado' | 'aprovado' | 'recusado' | 'expirado'

export interface Orcamento {
  id: string; numero: number; clienteId: string; data: string; validade: string
  status: StatusOrcamento
  itens: ItemComercial[]
  desconto: number; frete: number
  formaPagamento: string; prazoEntrega: string; observacoes: string; vendedor: string
  osId?: string; criadoPorIA?: boolean
}

export type StatusOS =
  | 'recebido' | 'diagnostico' | 'aguardando_aprovacao' | 'em_manutencao' | 'testes' | 'pronto' | 'entregue'

export interface FotoOS { id: string; fase: 'chegada' | 'dano' | 'saida'; url: string; legenda: string }

export interface RelatorioOS {
  geradoEm: string; resumo: string; condicaoChegada: string; diagnostico: string
  servicosExecutados: string; testes: string; recomendacoes: string; notasTecnico: string
}

export interface OrdemServico {
  id: string; numero: number; clienteId: string; equipamentoId: string
  status: StatusOS
  abertura: string; previsao: string; conclusao?: string
  tecnico: string; relatoCliente: string; diagnostico: string
  itens: ItemComercial[]
  fotos: FotoOS[]
  relatorio?: RelatorioOS
  orcamentoId?: string
  historico: { data: string; texto: string }[]
  atendimento?: 'oficina' | 'campo'
  local?: Local
}

export interface ItemNota { descricao: string; ncm: string; quantidade: number; valorUnit: number; produtoId?: string }

export interface NotaFiscal {
  id: string; numero: number; serie: string
  tipo: 'saida' | 'entrada'
  modelo: 'NF-e' | 'NFS-e'
  natureza: string
  clienteId?: string; emitente?: string
  data: string; valor: number
  status: 'autorizada' | 'pendente' | 'rejeitada' | 'cancelada'
  chave: string
  itens: ItemNota[]
  origem?: string
}

export interface Lancamento {
  id: string; tipo: 'receber' | 'pagar'; descricao: string; categoria: string
  valor: number; vencimento: string; pagoEm?: string; clienteId?: string; forma: string; origem?: string
}

export type EtapaLead = 'novo' | 'contato' | 'demonstracao' | 'proposta' | 'fechado' | 'perdido'

export interface Lead {
  id: string; nome: string; cidade: string; uf: string; fone: string; interesse: string
  valorEstimado: number; etapa: EtapaLead; origem: string; responsavel: string
  proximaAcao: string; proximaData: string; criadoEm: string; culturaHa?: string
}

export interface MensagemConversa { id: string; de: 'cliente' | 'equipe' | 'ia'; texto: string; hora: string }

export interface Conversa {
  id: string; clienteId?: string; nome: string; fone: string
  etiqueta: 'Peças' | 'Manutenção' | 'Venda de drone' | 'Financeiro'
  naoLidas: number
  mensagens: MensagemConversa[]
}

export interface Usuario { id: string; nome: string; papel: 'Gestor' | 'Vendas' | 'Técnico' | 'Estoque' }

export interface Empresa { nome: string; cnpj: string; endereco: string; cidade: string; fone: string; email: string; unidades: string[] }

export type TipoCompromisso = 'atendimento_campo' | 'manutencao_oficina' | 'entrega' | 'treinamento' | 'revisao_programada' | 'outro'
export type StatusCompromisso = 'agendado' | 'em_andamento' | 'concluido' | 'cancelado'

export interface Compromisso {
  id: string
  /** id de Usuario (OrdemServico.tecnico guarda o NOME). */
  tecnicoId: string
  tipo: TipoCompromisso
  titulo: string
  inicio: string; fim: string
  osId?: string; clienteId?: string
  local?: Local
  status: StatusCompromisso
  checklist?: { texto: string; feito: boolean }[]
  observacoes?: string
}

export interface Dados {
  empresa: Empresa
  usuarios: Usuario[]
  modelos: ModeloDrone[]
  produtos: Produto[]
  movimentacoes: Movimentacao[]
  servicos: Servico[]
  clientes: Cliente[]
  equipamentos: Equipamento[]
  orcamentos: Orcamento[]
  ordens: OrdemServico[]
  notas: NotaFiscal[]
  lancamentos: Lancamento[]
  leads: Lead[]
  conversas: Conversa[]
  compromissos: Compromisso[]
}
