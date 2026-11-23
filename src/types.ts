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
  /** Total do grupo (soma de estoquePorEmpresa; a store mantém os dois coerentes). */
  estoque: number
  /** Quantidade por empresa (id de EmpresaGrupo). */
  estoquePorEmpresa?: Record<string, number>
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
  /** Empresa do grupo dona do registro (ver lib/empresas; ausente = principal). */
  empresaId?: string
  id: string
  produtoId: string
  tipo: 'entrada' | 'saida'
  quantidade: number
  data: string
  origem: string
  valorUnit: number
}

export interface Servico {
  id: string; nome: string; preco: number; horas: number
  /** Obrigações do serviço: viram itens do checklist do compromisso. */
  checklist?: string[]
}

/** Ponto no mapa (área rural: as coordenadas são o dado principal). */
export interface Local {
  lat: number; lng: number; descricao: string
  /** Ex.: "Depois da porteira azul, 3 km de estrada de chão". */
  referencia?: string
  origem?: 'whatsapp' | 'cadastro' | 'tecnico'
  atualizadoEm?: string
}

export interface Cliente {
  /** Empresa de origem (opcional: clientes são do grupo). */
  empresaId?: string
  id: string; nome: string; tipo: 'PF' | 'PJ'; documento: string; ie?: string
  cidade: string; uf: string; endereco: string; cep: string; fone: string; email: string
  desde: string; observacao?: string
  locais?: Local[]
  /** Plano de suporte (acesso do cliente ao agente de IA). Ausente = sem plano. */
  suporte?: SuporteCliente
}

export interface PlanoSuporte {
  id: string; nome: string; precoMensal: number
  perguntasIAMes: number; chamadosEquipeMes: number
  /** Ex.: "Horário comercial", "Prioridade 24h". */
  atendimento: string
  /** Ex.: "Grátis por 12 meses na compra do drone". */
  incluso?: string
}

export interface SuporteCliente {
  planoId: string; ativoAte: string
  /** 4 números. */
  pin: string
  acessoEnviadoEm?: string
  ativo: boolean
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
  /** Adicional opcional: aparece na proposta, mas não entra no total nem baixa estoque. */
  opcional?: boolean
}

export type StatusOrcamento = 'rascunho' | 'enviado' | 'aprovado' | 'recusado' | 'expirado'

export interface Orcamento {
  /** Empresa do grupo dona do registro (ver lib/empresas; ausente = principal). */
  empresaId?: string
  id: string; numero: number; clienteId: string; data: string; validade: string
  status: StatusOrcamento
  itens: ItemComercial[]
  desconto: number; frete: number
  formaPagamento: string; prazoEntrega: string; observacoes: string; vendedor: string
  osId?: string; criadoPorIA?: boolean
  /** Ausente = 'pecas'. */
  tipo?: 'pecas' | 'drone' | 'manutencao' | 'pulverizacao'
  /** Relatório técnico que acompanha orçamento de manutenção. */
  laudo?: { diagnostico: string; causa: string; recomendacao: string; fotoIds?: string[] }
  pulverizacao?: {
    areaHa: number; cultura: string; produto: string; vazaoLHa: number; valorHa: number; data: string
    local?: Local; observacoes?: string
  }
}

export type StatusOS =
  | 'recebido' | 'diagnostico' | 'aguardando_aprovacao' | 'em_manutencao' | 'testes' | 'pronto' | 'entregue'

export interface FotoOS { id: string; fase: 'chegada' | 'dano' | 'saida' | 'peca_nova'; url: string; legenda: string }

export interface RelatorioOS {
  geradoEm: string; resumo: string; condicaoChegada: string; diagnostico: string
  servicosExecutados: string; testes: string; recomendacoes: string; notasTecnico: string
  /** Lista detalhada problema → solução, usada no relatório de entrega. */
  problemas?: { problema: string; solucao: string; pecas?: string }[]
}

export interface OrdemServico {
  /** Empresa do grupo dona do registro (ver lib/empresas; ausente = principal). */
  empresaId?: string
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
  /** Empresa do grupo dona do registro (ver lib/empresas; ausente = principal). */
  empresaId?: string
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
  /** Empresa do grupo dona do registro (ver lib/empresas; ausente = principal). */
  empresaId?: string
  id: string; tipo: 'receber' | 'pagar'; descricao: string; categoria: string
  valor: number; vencimento: string; pagoEm?: string; clienteId?: string; forma: string; origem?: string
}

export type EtapaLead = 'novo' | 'contato' | 'demonstracao' | 'proposta' | 'fechado' | 'perdido'

export interface Lead {
  /** Empresa do grupo dona do registro (ver lib/empresas; ausente = principal). */
  empresaId?: string
  id: string; nome: string; cidade: string; uf: string; fone: string; interesse: string
  valorEstimado: number; etapa: EtapaLead; origem: string; responsavel: string
  proximaAcao: string; proximaData: string; criadoEm: string; culturaHa?: string
}

export interface MensagemConversa { id: string; de: 'cliente' | 'equipe' | 'ia'; texto: string; hora: string }

export interface Conversa {
  /** Empresa do grupo dona do registro (ver lib/empresas; ausente = principal). */
  empresaId?: string
  id: string; clienteId?: string; nome: string; fone: string
  etiqueta: 'Peças' | 'Manutenção' | 'Venda de drone' | 'Financeiro'
  naoLidas: number
  mensagens: MensagemConversa[]
}

export interface Usuario {
  id: string; nome: string; papel: 'Gestor' | 'Vendas' | 'Técnico' | 'Estoque'
  /** Empresas do grupo a que o usuário tem acesso. */
  empresaIds: string[]
}

/** Empresa (CNPJ) do grupo. `Empresa` abaixo guarda os dados gerais/configurações. */
export interface EmpresaGrupo { id: string; nome: string; nomeCurto: string; cnpj: string; cidade: string; uf: string }

export interface Empresa {
  nome: string; cnpj: string; endereco: string; cidade: string; fone: string; email: string; unidades: string[]
  /** Modelos de checklist por tipo de atendimento (ausente = padrão do seed). */
  checklistAtendimento?: { campo: string[]; oficina: string[] }
  planosSuporte?: PlanoSuporte[]
}

export type TipoCompromisso = 'atendimento_campo' | 'manutencao_oficina' | 'entrega' | 'treinamento' | 'revisao_programada' | 'outro'
export type StatusCompromisso = 'agendado' | 'em_andamento' | 'concluido' | 'cancelado'

/** Item de checklist; `origem` diz de onde veio (serviço ou tipo de atendimento). */
export interface ItemChecklist { texto: string; feito: boolean; origem?: string }

export interface Compromisso {
  /** Empresa do grupo dona do registro (ver lib/empresas; ausente = principal). */
  empresaId?: string
  id: string
  /** id de Usuario (OrdemServico.tecnico guarda o NOME). */
  tecnicoId: string
  tipo: TipoCompromisso
  titulo: string
  inicio: string; fim: string
  osId?: string; clienteId?: string
  local?: Local
  status: StatusCompromisso
  checklist?: ItemChecklist[]
  observacoes?: string
}

export interface Fornecedor {
  id: string; nome: string; cidade: string; contato: string; fone: string; email: string
  categorias: string[]; prazoMedioDias: number
}

export interface ItemCotacao { produtoId?: string; descricao: string; quantidade: number }

export interface RespostaCotacao {
  fornecedorId: string
  /** Mesmo índice dos itens; 0 = não tem. */
  precos: number[]
  /** Peso unitário em kg por item (mesmo índice dos itens); 0 = não informado. */
  pesos?: number[]
  frete: number; outrasDespesas: number; prazoDias: number; observacao?: string; recebidaEm: string
}

export interface Cotacao {
  /** Empresa do grupo dona do registro (ver lib/empresas; ausente = principal). */
  empresaId?: string
  id: string; numero: number; titulo: string; osId?: string; criadaEm: string
  status: 'rascunho' | 'enviada' | 'respondida' | 'fechada'
  itens: ItemCotacao[]
  fornecedorIds: string[]
  respostas: RespostaCotacao[]
  escolhidaId?: string
}

export interface MensagemChamado {
  id: string; de: 'cliente' | 'ia' | 'equipe'; texto: string; hora: string
  autor?: string; passos?: string[]; fonte?: string; fotoUrl?: string
  /** 'outro' = mensagem do cliente que não conta como pergunta à IA (atalho, foto, conversa com a equipe). */
  tipo?: 'outro'
}

export interface Chamado {
  /** Empresa do grupo dona do registro (ver lib/empresas; ausente = principal). */
  empresaId?: string
  id: string; numero: number; clienteId: string; equipamentoId?: string; assunto: string
  status: 'ia' | 'aguardando_equipe' | 'equipe' | 'resolvido'
  abertoEm: string; atualizadoEm: string; responsavel?: string
  mensagens: MensagemChamado[]
}

export interface Dados {
  empresa: Empresa
  empresas: EmpresaGrupo[]
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
  fornecedores: Fornecedor[]
  cotacoes: Cotacao[]
  chamados: Chamado[]
}
