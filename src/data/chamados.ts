import type { Chamado, MensagemChamado } from '@/types'
import { diasAtras } from './util'

let seq = 0
const m = (de: MensagemChamado['de'], texto: string, dias: number, h: number, min: number, extra: Partial<MensagemChamado> = {}): MensagemChamado =>
  ({ id: `cm-${++seq}`, de, texto, hora: diasAtras(dias, h, min), ...extra })

export function criarChamados(): Chamado[] {
  seq = 0
  return [
    {
      id: 'cha-1', numero: 1, clienteId: 'cli-01', equipamentoId: 'eqp-01', assunto: 'Qual tamanho de gota usar em fungicida', status: 'ia',
      abertoEm: diasAtras(2, 8, 5), atualizadoEm: diasAtras(2, 8, 7),
      mensagens: [
        m('cliente', 'Vou aplicar fungicida na soja amanhã. Qual tamanho de gota devo usar?', 2, 8, 5),
        m('ia', 'Para fungicida, o mais comum é gota fina a média, para cobrir bem a folha. Ajuste assim:', 2, 8, 6, {
          passos: ['Abra o menu de pulverização no aplicativo do controle.', 'Escolha o tamanho de gota médio como ponto de partida.', 'Se houver vento acima de 10 km/h, aumente um nível para reduzir a deriva.', 'Confira a vazão por hectare antes de decolar.'],
          fonte: 'Manual Agras T40, cap. 6',
        }),
        m('cliente', 'Deu certo, obrigado!', 2, 8, 7),
      ],
    },
    {
      id: 'cha-2', numero: 2, clienteId: 'cli-05', equipamentoId: 'eqp-06', assunto: 'Fluxômetro não calibra', status: 'aguardando_equipe',
      abertoEm: diasAtras(0, 9, 10), atualizadoEm: diasAtras(0, 9, 24),
      mensagens: [
        m('cliente', 'O fluxômetro não calibra, dá erro no fim do processo.', 0, 9, 10),
        m('ia', 'Vamos tentar a calibração de novo, com o tanque cheio de água limpa:', 0, 9, 11, {
          passos: ['Encha o tanque com água limpa, sem calda.', 'Entre em Pulverização e toque em Calibrar fluxômetro.', 'Aguarde o fim da vazão sem desligar a bomba.', 'Se der erro de novo, limpe o filtro do tanque e repita.'],
          fonte: 'Manual Agras T40, cap. 7',
        }),
        m('cliente', 'Limpei o filtro e repeti. Continua dando erro.', 0, 9, 22),
        m('ia', 'Não consegui resolver pelo manual. Chamei a equipe técnica para falar com você.', 0, 9, 24),
      ],
    },
    {
      id: 'cha-3', numero: 3, clienteId: 'cli-12', equipamentoId: 'eqp-18', assunto: 'Radar some do aplicativo (mau contato na placa)', status: 'equipe', responsavel: 'Tiago Ferreira',
      abertoEm: diasAtras(1, 14, 0), atualizadoEm: diasAtras(0, 8, 40),
      mensagens: [
        m('cliente', 'O radar some do aplicativo de vez em quando e volta sozinho.', 1, 14, 0),
        m('ia', 'Pode ser mau contato na placa. Faça a limpeza dos contatos com o drone desligado:', 1, 14, 1, {
          passos: ['Desligue o drone e retire a bateria.', 'Desconecte o cabo do radar da placa.', 'Passe limpa contato nos terminais e deixe secar.', 'Reconecte com firmeza e ligue para testar.'],
          fonte: 'Manual Agras T40, cap. 11',
        }),
        m('cliente', 'Fiz e não resolveu.', 1, 15, 30),
        m('equipe', 'Oi, aqui é o Tiago da oficina. Pode me mandar uma foto do conector do radar?', 0, 8, 30, { autor: 'Tiago Ferreira' }),
        m('cliente', 'Mandei agora.', 0, 8, 40),
      ],
    },
    {
      id: 'cha-4', numero: 4, clienteId: 'cli-07', equipamentoId: 'eqp-11', assunto: 'Como calibrar a balança', status: 'resolvido',
      abertoEm: diasAtras(6, 10, 0), atualizadoEm: diasAtras(6, 10, 12),
      mensagens: [
        m('cliente', 'A leitura de produto no tanque está errada. Como calibro a balança?', 6, 10, 0),
        m('ia', 'Calibre a célula de carga com o tanque vazio:', 6, 10, 1, {
          passos: ['Esvazie o tanque e pouse o drone em piso plano.', 'Abra Pulverização e toque em Calibrar balança.', 'Confirme o tanque vazio e aguarde a leitura estabilizar.', 'Adicione 10 L de água e confira a leitura.'],
          fonte: 'Manual Agras T40, cap. 8',
        }),
        m('cliente', 'Calibrou, valeu.', 6, 10, 12),
      ],
    },
  ]
}
