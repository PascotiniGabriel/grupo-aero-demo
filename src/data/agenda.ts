import type { Compromisso, Local, TipoCompromisso } from '@/types'
import { LOCAIS_CLIENTES, OS_CAMPO } from './locais'
import { diasAFrente } from './util'

const T1 = 'usr-3' // Tiago Ferreira
const T2 = 'usr-4' // Lucas Brandão

const ck = (...itens: (string | [string, boolean])[]) =>
  itens.map((i) => (typeof i === 'string' ? { texto: i, feito: false } : { texto: i[0], feito: i[1] }))

const localDe = (cli: string, i = 0): Local | undefined => LOCAIS_CLIENTES[cli]?.[i]
const localOS = (osId: string): Local | undefined => { const o = OS_CAMPO[osId]; return o ? localDe(o[0], o[1]) : undefined }

type C = {
  t: string; tipo: TipoCompromisso; titulo: string; dia: number; h: number; dur: number
  status?: Compromisso['status']; os?: string; cli?: string; local?: Local; lista?: Compromisso['checklist']; obs?: string
}

/** Compromissos de ontem a +6 dias, ligados às OS e aos locais do seed. Datas relativas a hoje. */
export function criarCompromissos(): Compromisso[] {
  const lista: C[] = [
    // Tiago
    { t: T1, tipo: 'manutencao_oficina', titulo: 'Troca do braço dianteiro, OS 1037', dia: -1, h: 8, dur: 120, status: 'concluido', os: 'os-1037', cli: 'cli-08',
      lista: ck(['Separar braço e parafusos', true], ['Reapertar dobradiça', true], ['Fotografar o reparo', true]) },
    { t: T1, tipo: 'atendimento_campo', titulo: 'Vistoria de campo, OS 1039', dia: 0, h: 8, dur: 180, os: 'os-1039', cli: 'cli-01', local: localOS('os-1039'),
      lista: ck('Levar bateria reserva', 'Conferir bicos', 'Teste de vazão com água', 'Fotografar número de série') },
    { t: T1, tipo: 'entrega', titulo: 'Entrega do drone da OS 1041', dia: 0, h: 14, dur: 60, os: 'os-1041', cli: 'cli-13',
      lista: ck('Conferir etiqueta do QR', 'Imprimir relatório', 'Coletar assinatura de retirada') },
    { t: T1, tipo: 'atendimento_campo', titulo: 'Atendimento em campo, OS 1035', dia: 1, h: 9, dur: 180, os: 'os-1035', cli: 'cli-05', local: localOS('os-1035'),
      lista: ck('Levar motor e ESC reserva', 'Levar multímetro', 'Checar temperatura do motor 3 após 20 min de voo') },
    { t: T1, tipo: 'treinamento', titulo: 'Treinamento operacional, Fazenda Santa Luzia', dia: 2, h: 8, dur: 240, cli: 'cli-01', local: localDe('cli-01', 0),
      lista: ck('Levar apostila impressa', 'Separar 2 baterias de treino', 'Conferir lista de presença') },
    { t: T1, tipo: 'manutencao_oficina', titulo: 'Teste de bancada, OS 1037', dia: 3, h: 14, dur: 90, os: 'os-1037', cli: 'cli-08',
      lista: ck('Teste de carga', 'Calibração de bússola e IMU') },
    { t: T1, tipo: 'atendimento_campo', titulo: 'Atendimento em Cruz Alta (RS), OS 1033', dia: 4, h: 7, dur: 600, os: 'os-1033', cli: 'cli-06', local: localOS('os-1033'),
      lista: ck('Levar kit de limpeza da pulverização', 'Levar filtro e bomba reserva', 'Baixar mapa offline do trajeto') },
    { t: T1, tipo: 'revisao_programada', titulo: 'Revisão programada do T20P, José Carlos Menezes', dia: 5, h: 9, dur: 180, cli: 'cli-04', local: localDe('cli-04'),
      lista: ck('Levar graxa e parafusos de hélice', 'Conferir bicos', 'Atualizar firmware') },
    { t: T1, tipo: 'outro', titulo: 'Planejamento de peças para a safra', dia: 6, h: 10, dur: 60, obs: 'Alinhar com a Paula a lista de peças de maior giro.' },
    // Lucas
    { t: T2, tipo: 'atendimento_campo', titulo: 'Vistoria inicial, OS 1034', dia: -1, h: 9, dur: 150, status: 'concluido', os: 'os-1034', cli: 'cli-03', local: localOS('os-1034'),
      lista: ck(['Medir vibração em voo pairado', true], ['Conferir folga do motor traseiro direito', true], ['Fotografar número de série', false]) },
    { t: T2, tipo: 'manutencao_oficina', titulo: 'Troca dos braços, OS 1038', dia: 0, h: 9, dur: 120, status: 'em_andamento', os: 'os-1038', cli: 'cli-05',
      lista: ck(['Separar braços e hélices', true], 'Alinhar o trem de pouso', 'Calibrar bússola e IMU') },
    { t: T2, tipo: 'atendimento_campo', titulo: 'Teste de vazão no campo, OS 1040', dia: 0, h: 15, dur: 180, os: 'os-1040', cli: 'cli-02', local: localOS('os-1040'),
      lista: ck('Levar bateria reserva', 'Levar água para o teste de vazão', 'Teste de carga máxima em voo') },
    { t: T2, tipo: 'entrega', titulo: 'Entrega de drone novo T20P, Marcos Antônio Teixeira', dia: 1, h: 8, dur: 120, cli: 'cli-14', local: localDe('cli-14'),
      lista: ck('Conferir itens da caixa', 'Registrar o serial', 'Treinar o primeiro voo', 'Coletar assinatura') },
    { t: T2, tipo: 'manutencao_oficina', titulo: 'Diagnóstico do radar, OS 1036', dia: 2, h: 10, dur: 90, os: 'os-1036', cli: 'cli-12',
      lista: ck('Testar o módulo do radar', 'Testar o cabo') },
    { t: T2, tipo: 'atendimento_campo', titulo: 'Atendimento em campo, OS 1034', dia: 3, h: 13, dur: 240, os: 'os-1034', cli: 'cli-03', local: localOS('os-1034'),
      lista: ck('Levar hélices de reserva', 'Balancear hélices', 'Teste de voo de 10 minutos') },
    { t: T2, tipo: 'treinamento', titulo: 'Treinamento de operadores, Cafés Serra Azul', dia: 4, h: 8, dur: 300, cli: 'cli-03', local: localDe('cli-03', 0),
      lista: ck('Levar apostila impressa', 'Separar 2 baterias de treino') },
    { t: T2, tipo: 'revisao_programada', titulo: 'Revisão de 300 h do T25, Fazenda Santa Luzia', dia: 6, h: 9, dur: 240, cli: 'cli-01', local: localDe('cli-01', 1),
      lista: ck('Levar kit de bicos', 'Teste de vazão com água') },
  ]
  return lista.map((c, i) => {
    const inicio = diasAFrente(c.dia, c.h, 0)
    return {
      id: `cmp-${String(i + 1).padStart(2, '0')}`, tecnicoId: c.t, tipo: c.tipo, titulo: c.titulo,
      inicio, fim: new Date(new Date(inicio).getTime() + c.dur * 60000).toISOString(),
      osId: c.os, clienteId: c.cli, local: c.local, status: c.status ?? 'agendado', checklist: c.lista, observacoes: c.obs,
    }
  })
}
