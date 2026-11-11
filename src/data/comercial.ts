import type {
  Conversa, ItemComercial, Lead, Orcamento, OrdemServico, Produto, RelatorioOS, Servico, StatusOS, StatusOrcamento,
} from '@/types'
import { fotoPlaceholder } from '@/lib/fotos'
import { diasAFrente, diasAtras } from './util'
import { idProduto } from './produtos'

let seq = 0
const uid = (p: string) => `${p}-${++seq}`

export function criarComercial(produtos: Produto[], servicos: Servico[]) {
  seq = 0
  const prod = (slug: string) => produtos.find((p) => p.id === idProduto(slug))!
  const srv = (id: string) => servicos.find((s) => s.id === id)!
  const P = (slug: string, quantidade = 1): ItemComercial => {
    const p = prod(slug)
    return { id: uid('it'), tipo: p.tipo === 'drone' ? 'drone' : 'peca', produtoId: p.id, descricao: p.nome, quantidade, valorUnit: p.preco }
  }
  const S = (id: string, quantidade = 1): ItemComercial => {
    const s = srv(id)
    return { id: uid('it'), tipo: 'servico', servicoId: s.id, descricao: s.nome, quantidade, valorUnit: s.preco }
  }

  // ---------- Orçamentos (números a partir de 2098)
  type O = [number, string, number, number, StatusOrcamento, ItemComercial[], number, number, string, string, string?, boolean?]
  // numero, cliente, dias atrás, validade (dias), status, itens, desconto, frete, pagamento, prazo, osId, IA
  const O_: O[] = [
    [2098, 'cli-08', 24, 15, 'aprovado', [P('braco-t40'), S('srv-diag-queda'), S('srv-braco'), S('srv-calibracao')], 0, 0, 'PIX à vista', '7 dias úteis', 'os-1037'],
    [2099, 'cli-05', 6, 10, 'enviado', [P('mot-t40'), P('esc-t40'), S('srv-motor'), S('srv-teste-voo')], 150, 0, 'Boleto 15 dias', '5 dias úteis', 'os-1035', true],
    [2100, 'cli-09', 40, 15, 'aprovado', [P('drone-t55'), P('rtk-base'), S('srv-treino')], 4000, 0, 'Financiamento 36x', '20 dias', undefined],
    [2101, 'cli-05', 18, 15, 'aprovado', [P('trem-t40', 1), P('braco-t40', 2), P('hel-t40', 2), S('srv-diag-queda'), S('srv-braco', 2)], 300, 0, 'PIX à vista', '10 dias úteis', 'os-1038'],
    [2102, 'cli-12', 4, 10, 'enviado', [P('radar-frontal'), S('srv-calibracao'), S('srv-teste-voo')], 0, 85, 'Cartão 3x', '4 dias úteis', 'os-1036'],
    [2103, 'cli-14', 52, 7, 'recusado', [P('hel-t20p', 2), P('bico-leque', 4), P('parafuso-helice', 2)], 0, 60, 'PIX à vista', 'Pronta entrega'],
    [2104, 'cli-10', 2, 15, 'rascunho', [P('bat-db800', 2), P('carregador-t25'), P('hel-t25', 3)], 500, 180, 'Boleto 30 dias', '8 dias úteis', undefined, true],
    [2105, 'cli-01', 3, 10, 'enviado', [P('hel-t40', 4), P('bico-t40', 4), P('parafuso-helice', 6), P('filtro-tanque', 4)], 120, 95, 'PIX à vista', 'Pronta entrega'],
    [2106, 'cli-06', 21, 15, 'aprovado', [P('mot-t50', 2), P('esc-t50', 2), P('braco-t50'), S('srv-diag-queda'), S('srv-motor', 2), S('srv-teste-voo')], 0, 0, 'Boleto 30 dias', '10 dias úteis', 'os-1042'],
    [2107, 'cli-13', 1, 15, 'rascunho', [P('rtk-base'), P('rtk-relay'), S('srv-treino')], 0, 0, 'A combinar', '15 dias'],
    [2108, 'cli-07', 9, 15, 'enviado', [P('drone-t25'), P('bat-db800'), S('srv-caar'), S('srv-treino')], 3500, 0, 'Financiamento 24x', '12 dias úteis'],
    [2109, 'cli-12', 12, 15, 'aprovado', [P('drone-t70p'), P('rtk-base'), P('bat-db2160', 2), S('srv-treino')], 5900, 0, 'Financiamento 36x', '25 dias'],
  ]
  const orcamentos: Orcamento[] = O_.map(([numero, clienteId, dias, validade, status, itens, desconto, frete, formaPagamento, prazoEntrega, osId, ia]) => ({
    id: `orc-${numero}`, numero, clienteId, data: diasAtras(dias), validade: diasAFrente(validade - dias), status, itens,
    desconto, frete, formaPagamento, prazoEntrega,
    observacoes: 'Valores sujeitos a confirmação de estoque. Garantia de 90 dias para peças e serviços.',
    vendedor: 'Diego Santos', osId, criadoPorIA: ia,
  }))

  // ---------- Ordens de serviço (a partir de 1031)
  const fotos = (leg: [string, string, string]) => [
    { id: uid('ft'), fase: 'chegada' as const, url: fotoPlaceholder(leg[0], 'chegada'), legenda: leg[0] },
    { id: uid('ft'), fase: 'dano' as const, url: fotoPlaceholder(leg[1], 'dano'), legenda: leg[1] },
    { id: uid('ft'), fase: 'saida' as const, url: fotoPlaceholder(leg[2], 'saida'), legenda: leg[2] },
  ]
  type R = [number, string, string, StatusOS, number, number, string, string, string, ItemComercial[], boolean, string?]
  // numero, cliente, equipamento, status, dias desde abertura, prazo em dias, técnico, relato, diagnóstico, itens, fotos, orcamento
  const T1 = 'Tiago Ferreira'
  const T2 = 'Lucas Brandão'
  const R_: R[] = [
    [1031, 'cli-04', 'eqp-05', 'recebido', 0, 7, T1, 'Caiu em talhão de café, hélice quebrada e carcaça trincada.', '', [], false],
    [1032, 'cli-11', 'eqp-16', 'recebido', 1, 6, T2, 'Drone molhou na chuva depois do voo e não liga mais.', '', [], false],
    [1033, 'cli-06', 'eqp-10', 'diagnostico', 3, 5, T1, 'A bomba não puxa calda e o fluxo oscila em voo.', 'Em análise: suspeita de entupimento no filtro e desgaste da bomba peristáltica.', [S('srv-limpeza')], false],
    [1034, 'cli-03', 'eqp-04', 'diagnostico', 4, 5, T2, 'Vibração alta em voo pairado, com puxada para a direita.', 'Em análise: verificar balanceamento das hélices e folga no motor traseiro direito.', [S('srv-calibracao')], false],
    [1035, 'cli-05', 'eqp-06', 'aguardando_aprovacao', 6, 5, T1, 'Motor 3 com ruído metálico e aquecimento depois de 20 minutos de voo.', 'Rolamento do motor 3 com folga e ESC com sinais de superaquecimento. Recomendada troca do motor e do ESC.', [P('mot-t40'), P('esc-t40'), S('srv-motor'), S('srv-teste-voo')], false, 'orc-2099'],
    [1036, 'cli-12', 'eqp-18', 'aguardando_aprovacao', 4, 6, T2, 'Radar frontal acusa falha intermitente e o drone não desvia de obstáculos.', 'Sensor do radar frontal sem resposta em 30% dos testes. Cabo íntegro, falha no módulo.', [P('radar-frontal'), S('srv-calibracao'), S('srv-teste-voo')], false, 'orc-2102'],
    [1037, 'cli-08', 'eqp-12', 'em_manutencao', 12, 4, T1, 'Queda leve na decolagem, braço dianteiro esquerdo trincado.', 'Braço dianteiro esquerdo trincado na dobradiça. Motor e hélice sem danos. Eletrônica íntegra.', [P('braco-t40'), S('srv-diag-queda'), S('srv-braco'), S('srv-calibracao')], true, 'orc-2098'],
    [1038, 'cli-05', 'eqp-07', 'em_manutencao', 9, 5, T2, 'Perda de sinal e queda em lavoura de milho. Trem de pouso quebrado.', 'Trem de pouso partido, dois braços empenados e duas hélices destruídas. Sem dano em placa e bateria.', [P('trem-t40'), P('braco-t40', 2), P('hel-t40', 2), S('srv-diag-queda'), S('srv-braco', 2)], true, 'orc-2101'],
    [1039, 'cli-01', 'eqp-01', 'em_manutencao', 5, 3, T1, 'Revisão geral das 600 horas de voo.', 'Desgaste normal. Bicos com resíduo de calda e parafusos de hélice com folga.', [S('srv-revisao'), S('srv-limpeza'), P('parafuso-helice', 2), P('bico-t40', 2)], false],
    [1040, 'cli-02', 'eqp-03', 'testes', 8, 2, T2, 'Motor 2 desligando em voo com carga máxima.', 'ESC do motor 2 com falha de comutação. Substituído; em bancada de testes de carga.', [P('esc-t50'), S('srv-motor'), S('srv-teste-voo')], true],
    [1041, 'cli-13', 'eqp-19', 'pronto', 10, 1, T1, 'Atualização de firmware e troca de bomba com vazamento.', 'Bomba de pulverização com vazamento no selo. Trocada e testada com 40 L.', [P('bomba-t40'), P('kit-vedacao'), S('srv-firmware'), S('srv-teste-voo')], false],
    [1042, 'cli-06', 'eqp-09', 'entregue', 30, 8, T1, 'Queda após perda de sinal GNSS, dois motores sem resposta.', 'Dois motores com bobina queimada, ESC 1 e 2 danificados e braço traseiro direito empenado.', [P('mot-t50', 2), P('esc-t50', 2), P('braco-t50'), S('srv-diag-queda'), S('srv-motor', 2), S('srv-teste-voo')], true, 'orc-2106'],
    [1043, 'cli-01', 'eqp-02', 'entregue', 26, 3, T2, 'Revisão programada de 300 horas.', 'Equipamento em bom estado geral. Bicos com desgaste leve e sistema de pulverização com resíduos.', [S('srv-revisao'), S('srv-limpeza'), P('bico-t25', 2), P('hel-t25', 1)], true],
    [1044, 'cli-07', 'eqp-11', 'entregue', 35, 2, T1, 'Bússola com erro constante ao decolar.', 'Interferência magnética por cabo mal posicionado. Cabo reposicionado e bússola calibrada.', [S('srv-calibracao'), S('srv-firmware')], false],
  ]
  const hist = (status: StatusOS, dias: number, tec: string) => {
    const ordem: StatusOS[] = ['recebido', 'diagnostico', 'aguardando_aprovacao', 'em_manutencao', 'testes', 'pronto', 'entregue']
    const rotulo: Record<StatusOS, string> = {
      recebido: 'Equipamento recebido e etiquetado.', diagnostico: `Diagnóstico iniciado por ${tec}.`,
      aguardando_aprovacao: 'Orçamento enviado ao cliente, aguardando aprovação.', em_manutencao: 'Orçamento aprovado. Manutenção em andamento.',
      testes: 'Manutenção concluída. Testes de voo e bancada.', pronto: 'Equipamento pronto para retirada.', entregue: 'Equipamento entregue ao cliente.',
    }
    const alvo = ordem.indexOf(status)
    return ordem.slice(0, alvo + 1).map((s, i) => ({ data: diasAtras(Math.max(0, dias - Math.round((i * dias) / Math.max(1, alvo + 1)))), texto: rotulo[s] }))
  }
  const rel: Record<number, RelatorioOS> = {
    1042: {
      geradoEm: diasAtras(22),
      resumo: 'Aeronave recebida após queda por perda de sinal GNSS. Substituídos dois motores, dois ESCs e o braço traseiro direito. Calibração completa e testes de voo aprovados.',
      condicaoChegada: 'Aeronave com o braço traseiro direito empenado, hélices 3 e 4 quebradas, tanque sem trincas e carcaça com riscos superficiais. Bateria sem inchaço e conectores íntegros.',
      diagnostico: 'Motores 3 e 4 com bobina em curto (resistência fora da faixa), ESC 3 e 4 queimados por sobrecorrente. Placa controladora e radares sem falhas. A causa provável é perda do sinal GNSS em área de sombra, seguida de resposta brusca dos motores.',
      servicosExecutados: 'Troca dos motores 3 e 4 e dos ESCs correspondentes. Substituição do braço traseiro direito. Reaperto de todos os parafusos de hélice, limpeza do sistema de pulverização e calibração de bússola e IMU. Atualização de firmware para a versão mais recente.',
      testes: 'Teste em bancada com carga: temperatura dos motores abaixo de 62 °C em 15 minutos. Voo pairado de 10 minutos estável. Voo com 40 L de água: vazão uniforme nos dois bicos, sem vibração e sem alertas de radar.',
      recomendacoes: 'Evitar operação em bordas de mata e linhas de transmissão sem a base RTK. Substituir as hélices a cada 150 horas de voo. Revisão geral na marca de 300 horas.',
      notasTecnico: 'Cliente orientado sobre o uso da base D-RTK 3 e sobre o procedimento de retorno seguro ao perder o sinal.',
    },
    1043: {
      geradoEm: diasAtras(24),
      resumo: 'Revisão programada de 300 horas concluída sem anormalidades estruturais. Realizada limpeza completa da pulverização e troca preventiva de bicos e de uma hélice.',
      condicaoChegada: 'Aeronave limpa externamente, com resíduo de calda seco nos bicos e nas mangueiras. Hélices com pequenas marcas de uso e parafusos com leve folga.',
      diagnostico: 'Sistema de propulsão dentro dos parâmetros. Bicos centrífugos com desgaste nos discos, reduzindo a uniformidade da aplicação. Hélice 2 com microtrinca na raiz.',
      servicosExecutados: 'Revisão geral das 300 horas, limpeza do sistema de pulverização com circulação de solução desincrustante, troca de dois bicos centrífugos e de uma hélice. Lubrificação das dobradiças e reaperto geral.',
      testes: 'Teste de vazão com 20 L: variação de 3% entre os bicos. Voo de 12 minutos em modo de pulverização, sem alertas. Verificação de IMU e bússola sem desvios.',
      recomendacoes: 'Lavar o sistema de pulverização ao fim de cada dia de aplicação. Trocar os bicos restantes ao atingir 450 horas. Próxima revisão com 400 horas.',
      notasTecnico: 'Equipamento em ótimo estado de conservação. Cliente mantém boa rotina de limpeza.',
    },
  }
  const ordens: OrdemServico[] = R_.map(([numero, clienteId, equipamentoId, status, dias, prazo, tecnico, relatoCliente, diagnostico, itens, comFotos, orc]) => ({
    id: `os-${numero}`, numero, clienteId, equipamentoId, status,
    abertura: diasAtras(dias), previsao: numero === 1038 ? diasAtras(2) : numero === 1033 ? diasAtras(1) : diasAFrente(prazo),
    conclusao: status === 'entregue' ? diasAtras(Math.max(1, dias - prazo - 1)) : undefined,
    tecnico, relatoCliente, diagnostico, itens,
    fotos: comFotos
      ? fotos([`Equipamento na chegada, OS ${numero}`, numero === 1043 ? 'Bicos com resíduo e desgaste' : 'Dano identificado na inspeção', 'Equipamento revisado, pronto para entrega'])
      : [],
    relatorio: rel[numero],
    orcamentoId: orc,
    historico: hist(status, dias, tecnico),
  }))

  // ---------- Leads
  const leads: Lead[] = [
    { id: 'lead-1', nome: 'Fazenda São Pedro', cidade: 'Barreiras', uf: 'BA', fone: '(77) 90000-0061', interesse: 'Drone T50 para 1.800 ha de soja', valorEstimado: 148000, etapa: 'novo', origem: 'Instagram', responsavel: 'Diego Santos', proximaAcao: 'Ligar e entender a área', proximaData: diasAFrente(1), criadoEm: diasAtras(1), culturaHa: 'Soja, 1.800 ha' },
    { id: 'lead-2', nome: 'Vinícola Colina Azul', cidade: 'Bento Gonçalves', uf: 'RS', fone: '(77) 90000-0062', interesse: 'Drone T25 para vinhedos', valorEstimado: 78900, etapa: 'novo', origem: 'Indicação', responsavel: 'Diego Santos', proximaAcao: 'Enviar apresentação do T25', proximaData: diasAFrente(2), criadoEm: diasAtras(2), culturaHa: 'Uva, 120 ha' },
    { id: 'lead-3', nome: 'Paulo Henrique Ribeiro', cidade: 'Cruz Alta', uf: 'RS', fone: '(77) 90000-0063', interesse: 'Peças e manutenção para T30', valorEstimado: 12000, etapa: 'contato', origem: 'WhatsApp', responsavel: 'Diego Santos', proximaAcao: 'Retornar com valores de revisão', proximaData: diasAFrente(1), criadoEm: diasAtras(6), culturaHa: 'Trigo e soja, 600 ha' },
    { id: 'lead-4', nome: 'Cafeicultores de Mucugê', cidade: 'Mucugê', uf: 'BA', fone: '(77) 90000-0064', interesse: 'Compra em grupo de 2 drones T40', valorEstimado: 250000, etapa: 'contato', origem: 'Feira agrícola', responsavel: 'Marina Albuquerque', proximaAcao: 'Agendar reunião com o grupo', proximaData: diasAFrente(3), criadoEm: diasAtras(9), culturaHa: 'Café, 450 ha' },
    { id: 'lead-5', nome: 'Agrícola Horizonte', cidade: 'Luís Eduardo Magalhães', uf: 'BA', fone: '(77) 90000-0065', interesse: 'Demonstração do T70P', valorEstimado: 179900, etapa: 'demonstracao', origem: 'Site', responsavel: 'Diego Santos', proximaAcao: 'Demonstração em campo', proximaData: diasAFrente(4), criadoEm: diasAtras(14), culturaHa: 'Algodão, 2.400 ha' },
    { id: 'lead-6', nome: 'Fazenda Rio Claro', cidade: 'Santa Maria', uf: 'RS', fone: '(77) 90000-0066', interesse: 'Demonstração do T50 em arroz irrigado', valorEstimado: 148000, etapa: 'demonstracao', origem: 'Indicação', responsavel: 'Diego Santos', proximaAcao: 'Confirmar data da demonstração', proximaData: diasAFrente(2), criadoEm: diasAtras(18), culturaHa: 'Arroz, 900 ha' },
    { id: 'lead-7', nome: 'Grupo Terra Roxa', cidade: 'Patrocínio', uf: 'MG', fone: '(77) 90000-0067', interesse: 'Proposta para T55 e base RTK', valorEstimado: 178000, etapa: 'proposta', origem: 'Cliente atual', responsavel: 'Marina Albuquerque', proximaAcao: 'Cobrar retorno da proposta', proximaData: diasAFrente(0), criadoEm: diasAtras(25), culturaHa: 'Café, 700 ha' },
    { id: 'lead-8', nome: 'Sítio Aurora', cidade: 'Domingos Martins', uf: 'ES', fone: '(77) 90000-0068', interesse: 'Drone T25 financiado', valorEstimado: 78900, etapa: 'proposta', origem: 'Instagram', responsavel: 'Diego Santos', proximaAcao: 'Enviar simulação de financiamento', proximaData: diasAFrente(1), criadoEm: diasAtras(21), culturaHa: 'Café e hortaliças, 80 ha' },
    { id: 'lead-9', nome: 'Fazenda Boa Vista', cidade: 'Ibicoara', uf: 'BA', fone: '(77) 90000-0069', interesse: 'Drone T40 e curso CAAR', valorEstimado: 129100, etapa: 'fechado', origem: 'Indicação', responsavel: 'Diego Santos', proximaAcao: 'Agendar entrega técnica', proximaData: diasAFrente(5), criadoEm: diasAtras(38), culturaHa: 'Batata, 300 ha' },
    { id: 'lead-10', nome: 'Sementes Planalto', cidade: 'Tupanciretã', uf: 'RS', fone: '(77) 90000-0070', interesse: 'Drone T40 usado', valorEstimado: 90000, etapa: 'perdido', origem: 'Site', responsavel: 'Diego Santos', proximaAcao: 'Retomar contato no próximo semestre', proximaData: diasAFrente(60), criadoEm: diasAtras(55), culturaHa: 'Soja, 1.100 ha' },
  ]

  // ---------- Conversas de WhatsApp
  const m = (de: 'cliente' | 'equipe' | 'ia', texto: string, dias: number, h: number, min = 0) => ({ id: uid('msg'), de, texto, hora: diasAtras(dias, h, min) })
  const conversas: Conversa[] = [
    { id: 'conv-1', clienteId: 'cli-01', nome: 'Fazenda Santa Luzia', fone: '(77) 90000-0010', etiqueta: 'Peças', naoLidas: 2, mensagens: [
      m('cliente', 'Bom dia! Preciso de 4 pares de hélice do T40 e bico centrífugo, 4 unidades. Tem em estoque?', 0, 8, 12),
      m('equipe', 'Bom dia! Temos sim. Já separo e passo o valor com frete.', 0, 8, 20),
      m('cliente', 'Pode mandar para Barra da Estiva mesmo. Preciso até sexta.', 0, 8, 31),
      m('cliente', 'Consegue também 10 parafusos de hélice?', 0, 8, 33),
    ] },
    { id: 'conv-2', clienteId: 'cli-08', nome: 'Cooperativa Campos do Sul', fone: '(77) 90000-0034', etiqueta: 'Manutenção', naoLidas: 1, mensagens: [
      m('cliente', 'Nosso T40 caiu agora há pouco na decolagem. Está inteiro, só um braço trincado. Como faço?', 12, 15, 40),
      m('equipe', 'Sem problema, traga o equipamento e abrimos uma ordem de serviço. Vamos avaliar o braço e a calibração.', 12, 15, 52),
      m('cliente', 'Pode mandar o orçamento por aqui mesmo?', 11, 9, 5),
      m('ia', 'Resumo para o atendente: queda leve, braço dianteiro esquerdo trincado. OS 1037 aberta.', 11, 9, 6),
      m('cliente', 'Alguma novidade sobre o braço? A safra está chegando.', 0, 10, 14),
    ] },
    { id: 'conv-3', nome: 'Fazenda Rio Claro', fone: '(77) 90000-0066', etiqueta: 'Venda de drone', naoLidas: 0, mensagens: [
      m('cliente', 'Vi o T50 no Instagram de vocês. Serve para arroz irrigado?', 18, 11, 2),
      m('equipe', 'Serve muito bem. Aplicamos com taxa de 10 a 15 L/ha e o T50 cobre cerca de 21 ha por hora. Quer uma demonstração na sua fazenda?', 18, 11, 30),
      m('cliente', 'Quero sim. Tenho 900 ha de arroz, só que a área tem muito vento.', 17, 8, 45),
      m('equipe', 'Vamos agendar no período da manhã, com menos vento. Confirmo a data com você ainda esta semana.', 17, 9, 10),
    ] },
    { id: 'conv-4', clienteId: 'cli-05', nome: 'Aerolavoura Serviços Aéreos', fone: '(77) 90000-0022', etiqueta: 'Manutenção', naoLidas: 3, mensagens: [
      m('cliente', 'O orçamento 2099 está certo? Motor e ESC do T40.', 5, 14, 2),
      m('equipe', 'Está sim. Prazo de 5 dias úteis depois da aprovação.', 5, 14, 40),
      m('cliente', 'Estamos no meio da safra, não dá para atrasar. Qual o prazo real?', 1, 16, 8),
      m('cliente', 'Se aprovar hoje, entrega até quando?', 1, 16, 9),
      m('cliente', 'Preciso de uma resposta urgente.', 0, 7, 50),
    ] },
    { id: 'conv-5', clienteId: 'cli-14', nome: 'Marcos Antônio Teixeira', fone: '(77) 90000-0052', etiqueta: 'Peças', naoLidas: 0, mensagens: [
      m('cliente', 'O motor do T40 serve no T50?', 3, 10, 4),
      m('equipe', 'Não. O motor do T40 é exclusivo. Para o T50 precisa do motor de propulsão T50. Já a hélice 62 pol. serve nos dois.', 3, 10, 20),
      m('cliente', 'Entendi. E o parafuso da hélice?', 3, 10, 22),
      m('equipe', 'O parafuso M5 serve em T25, T30, T40 e T50.', 3, 10, 25),
      m('cliente', 'Perfeito, obrigado!', 3, 10, 27),
    ] },
    { id: 'conv-6', clienteId: 'cli-06', nome: 'Fazenda Três Coxilhas', fone: '(77) 90000-0025', etiqueta: 'Financeiro', naoLidas: 1, mensagens: [
      m('cliente', 'Recebi o boleto da OS 1042 mas o valor está diferente do orçamento.', 2, 9, 30),
      m('equipe', 'Vou conferir. O boleto inclui o frete de retorno, que ficou fora do orçamento original.', 2, 10, 5),
      m('cliente', 'Pode reenviar o boleto com vencimento para dia 20?', 0, 9, 12),
    ] },
  ]

  return { orcamentos, ordens, leads, conversas }
}
