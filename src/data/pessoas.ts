import type { Cliente, Empresa, Equipamento, Servico, Usuario } from '@/types'
import { diasAtras, diasAFrente } from './util'

export const EMPRESA: Empresa = {
  nome: 'Grupo AERO',
  cnpj: '00.000.000/0001-00',
  endereco: 'Av. das Lavouras, 1000, Centro',
  cidade: 'Barra da Estiva - BA',
  fone: '(77) 90000-0001',
  email: 'contato@grupoaero.exemplo.com.br',
  unidades: ['Barra da Estiva - BA', 'Santa Maria - RS', 'Cruz Alta - RS'],
}

export const USUARIOS: Usuario[] = [
  { id: 'usr-1', nome: 'Marina Albuquerque', papel: 'Gestor' },
  { id: 'usr-2', nome: 'Diego Santos', papel: 'Vendas' },
  { id: 'usr-3', nome: 'Tiago Ferreira', papel: 'Técnico' },
  { id: 'usr-4', nome: 'Lucas Brandão', papel: 'Técnico' },
  { id: 'usr-5', nome: 'Paula Nogueira', papel: 'Estoque' },
]

export const SERVICOS: Servico[] = [
  { id: 'srv-revisao', nome: 'Revisão geral (100 h de voo)', preco: 1850, horas: 6 },
  { id: 'srv-motor', nome: 'Troca de motor', preco: 480, horas: 2.5 },
  { id: 'srv-calibracao', nome: 'Calibração de bússola e IMU', preco: 380, horas: 1.5 },
  { id: 'srv-limpeza', nome: 'Limpeza do sistema de pulverização', preco: 420, horas: 2 },
  { id: 'srv-diag-queda', nome: 'Diagnóstico pós-queda', preco: 650, horas: 3 },
  { id: 'srv-firmware', nome: 'Atualização de firmware', preco: 220, horas: 0.5 },
  { id: 'srv-braco', nome: 'Troca de braço', preco: 540, horas: 2 },
  { id: 'srv-teste-voo', nome: 'Teste de voo e vazão', preco: 280, horas: 1 },
  { id: 'srv-caar', nome: 'Curso CAAR (aplicação aérea com drones)', preco: 4200, horas: 24 },
  { id: 'srv-treino', nome: 'Treinamento operacional', preco: 1900, horas: 8 },
]

type C = [string, string, 'PF' | 'PJ', string, string, string, string, string, string, number]
// id, nome, tipo, documento, cidade, uf, endereco, cep, email-slug, dias desde
const CLI: C[] = [
  ['cli-01', 'Fazenda Santa Luzia', 'PJ', '00.000.011/0001-00', 'Barra da Estiva', 'BA', 'Estrada da Serra, km 12', '46650-000', 'santaluzia', 900],
  ['cli-02', 'Agropecuária Vale do Paramirim', 'PJ', '00.000.012/0001-00', 'Ibicoara', 'BA', 'Rodovia BA-142, km 40', '46760-000', 'valeparamirim', 640],
  ['cli-03', 'Cafés Serra Azul', 'PJ', '00.000.013/0001-00', 'Mucugê', 'BA', 'Fazenda Serra Azul, zona rural', '46750-000', 'serraazul', 1100],
  ['cli-04', 'José Carlos Menezes', 'PF', '000.000.004-00', 'Barra da Estiva', 'BA', 'Povoado do Rio de Contas, s/n', '46650-000', 'josecarlos', 380],
  ['cli-05', 'Aerolavoura Serviços Aéreos', 'PJ', '00.000.015/0001-00', 'Luís Eduardo Magalhães', 'BA', 'Av. Barreiras, 2210', '47850-000', 'aerolavoura', 700],
  ['cli-06', 'Fazenda Três Coxilhas', 'PJ', '00.000.016/0001-00', 'Cruz Alta', 'RS', 'Linha Três Coxilhas, km 8', '98005-000', 'trescoxilhas', 800],
  ['cli-07', 'Ricardo Zanella', 'PF', '000.000.007-00', 'Santa Maria', 'RS', 'Rua Venâncio Aires, 455', '97010-000', 'rzanella', 260],
  ['cli-08', 'Cooperativa Campos do Sul', 'PJ', '00.000.018/0001-00', 'Júlio de Castilhos', 'RS', 'Av. Cooperativa, 90', '98130-000', 'camposdosul', 560],
  ['cli-09', 'Granja Boa Esperança', 'PJ', '00.000.019/0001-00', 'Tupanciretã', 'RS', 'Estrada Municipal, km 21', '98170-000', 'boaesperanca', 210],
  ['cli-10', 'Fazenda Monte Verde', 'PJ', '00.000.020/0001-00', 'Venda Nova do Imigrante', 'ES', 'Rua do Café, 300', '29375-000', 'monteverde', 330],
  ['cli-11', 'Helena Prado', 'PF', '000.000.011-00', 'Domingos Martins', 'ES', 'Sítio das Palmeiras, s/n', '29260-000', 'helenaprado', 150],
  ['cli-12', 'Agrícola Cerrado Mineiro', 'PJ', '00.000.022/0001-00', 'Patrocínio', 'MG', 'Rodovia MG-190, km 7', '38740-000', 'cerradomineiro', 480],
  ['cli-13', 'Aeroagro Pulverização', 'PJ', '00.000.023/0001-00', 'São Gotardo', 'MG', 'Av. Vereador Silva, 1500', '38800-000', 'aeroagro', 610],
  ['cli-14', 'Marcos Antônio Teixeira', 'PF', '000.000.014-00', 'Ibicoara', 'BA', 'Povoado Água de Rega, s/n', '46760-000', 'marcosteixeira', 90],
]

export function criarClientes(): Cliente[] {
  return CLI.map(([id, nome, tipo, documento, cidade, uf, endereco, cep, slug, desde], i) => ({
    id, nome, tipo, documento, cidade, uf, endereco, cep,
    ie: tipo === 'PJ' ? `000.000.${String(i + 10).padStart(3, '0')}` : undefined,
    fone: `(77) 90000-00${String(10 + i * 3).padStart(2, '0')}`,
    email: `${slug}@exemplo.com.br`,
    desde: diasAtras(desde),
    observacao: i === 4 ? 'Prestadora de aplicação aérea. Prioridade no atendimento da oficina na safra.' : i === 0 ? 'Cliente desde a primeira unidade em Barra da Estiva.' : undefined,
  }))
}

type E = [string, string, string, string, string | undefined, number, number, boolean, number | undefined]
// id, cliente, modelo, serial, apelido, horas, hectares, comprado, dias desde a compra
const EQP: E[] = [
  ['eqp-01', 'cli-01', 't40', '58FBK5S002HQ31', 'T40 da sede', 612, 9800, true, 520],
  ['eqp-02', 'cli-01', 't25', '64UBLA90042215', 'T25 talhões baixos', 310, 4100, true, 300],
  ['eqp-03', 'cli-02', 't50', '1581F674B225M004471A', undefined, 188, 3200, true, 160],
  ['eqp-04', 'cli-03', 't30', '58KDM2T000XY91', 'T30 café', 905, 11200, false, undefined],
  ['eqp-05', 'cli-04', 't20p', '65VQRA40012876', undefined, 740, 6100, false, undefined],
  ['eqp-06', 'cli-05', 't40', '58FBK5S003JL52', 'Frota 01', 1340, 21000, true, 600],
  ['eqp-07', 'cli-05', 't40', '58FBK5S003JL77', 'Frota 02', 1180, 18400, true, 600],
  ['eqp-08', 'cli-05', 't50', '1581F674B225M005102C', 'Frota 03', 420, 7300, true, 240],
  ['eqp-09', 'cli-06', 't50', '1581F674B225M004980B', undefined, 260, 5100, true, 200],
  ['eqp-10', 'cli-06', 't25', '64UBLA90027743', 'T25 soja', 520, 6900, false, undefined],
  ['eqp-11', 'cli-07', 't25', '64UBLA90051309', undefined, 140, 1500, true, 120],
  ['eqp-12', 'cli-08', 't40', '58FBK5S004MN18', 'Cooperativa 1', 705, 10900, true, 420],
  ['eqp-13', 'cli-08', 't30', '58KDM2T001AB44', 'Cooperativa 2', 980, 12300, false, undefined],
  ['eqp-14', 'cli-09', 't55', '1581F674B225M006220D', undefined, 96, 1700, true, 70],
  ['eqp-15', 'cli-10', 't25', '64UBLA90033981', undefined, 430, 5200, false, undefined],
  ['eqp-16', 'cli-11', 't20p', '65VQRA40009452', 'T20P do sítio', 210, 900, false, undefined],
  ['eqp-17', 'cli-12', 't70p', '1581F674B225M007301E', 'T70P', 150, 3900, true, 110],
  ['eqp-18', 'cli-12', 't50', '1581F674B225M004125F', 'T50 pivô', 560, 9700, true, 380],
  ['eqp-19', 'cli-13', 't40', '58FBK5S002QZ09', undefined, 1500, 24000, false, undefined],
  ['eqp-20', 'cli-13', 't100', '1581F674B225M007788G', 'T100', 60, 1800, true, 45],
]

export function criarEquipamentos(): Equipamento[] {
  return EQP.map(([id, clienteId, modeloId, serial, apelido, horasVoo, hectares, compradoConosco, dias]) => ({
    id, clienteId, modeloId, serial, apelido, horasVoo, hectares, compradoConosco,
    dataCompra: dias ? diasAtras(dias) : undefined,
    garantiaAte: dias ? (dias < 365 ? diasAFrente(365 - dias) : diasAtras(dias - 365)) : undefined,
  }))
}
