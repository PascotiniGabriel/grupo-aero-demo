/** Modelos de checklist: obrigações por serviço e por tipo de atendimento. */

export const CHECKLIST_ATENDIMENTO: { campo: string[]; oficina: string[] } = {
  campo: [
    'Levar bateria reserva carregada',
    'Levar gerador e combustível',
    'Conferir coordenadas e rota antes de sair',
    'Fotografar número de série',
  ],
  oficina: [
    'Etiquetar o equipamento na entrada',
    'Fotos de chegada (frente, lados e tanque)',
  ],
}

export const CHECKLIST_SERVICO: Record<string, string[]> = {
  'srv-revisao': [
    'Medir folga e ruído dos motores',
    'Trocar graxa e conferir rolamentos',
    'Inspecionar braços, dobradiças e travas',
    'Limpar radar e câmeras',
    'Testar bomba, mangueiras e bicos',
    'Atualizar firmware e registrar as horas de voo',
  ],
  'srv-motor': [
    'Desconectar a bateria antes de abrir',
    'Anotar a posição e o sentido de giro do motor',
    'Conferir o ESC e os conectores do motor novo',
    'Aplicar trava-rosca nos parafusos',
    'Testar giro em bancada sem hélice',
    'Medir temperatura após 5 minutos de voo pairado',
  ],
  'srv-calibracao': [
    'Afastar o drone de metal, carro e cercas',
    'Calibrar bússola nos dois eixos',
    'Calibrar IMU com o drone nivelado',
    'Conferir sinal de GNSS e RTK',
    'Registrar o resultado no relatório',
  ],
  'srv-limpeza': [
    'Esvaziar e enxaguar o tanque',
    'Desmontar e limpar os bicos',
    'Limpar o filtro da bomba',
    'Circular água limpa por 2 minutos',
    'Conferir vedações e mangueiras',
    'Secar e reinstalar os bicos',
  ],
  'srv-diag-queda': [
    'Fotografar os danos antes de mexer',
    'Inspecionar braços, motores e hélices',
    'Testar ESCs e cabos de energia',
    'Conferir estrutura e trem de pouso',
    'Ler o registro de voo e os erros',
    'Listar as peças a trocar para o orçamento',
  ],
  'srv-firmware': [
    'Bateria do drone e do controle acima de 50%',
    'Anotar a versão atual de firmware',
    'Atualizar drone, controle e baterias',
    'Recalibrar após a atualização, se pedir',
    'Registrar a versão nova',
  ],
  'srv-braco': [
    'Soltar com cuidado os cabos do motor e do ESC',
    'Remover o braço danificado',
    'Instalar o braço novo e reapertar a dobradiça',
    'Alinhar o motor e conferir o ângulo',
    'Religar os cabos e testar o giro',
    'Fotografar o reparo',
  ],
  'srv-teste-voo': [
    'Escolher área livre e verificar o vento',
    'Voo de 3 minutos pairado, olhando vibração',
    'Teste de vazão com água limpa',
    'Conferir uniformidade do leque dos bicos',
    'Anotar o resultado e liberar o drone',
  ],
  'srv-caar': [
    'Conferir a lista de presença',
    'Separar material didático e certificados',
    'Montar o drone e os equipamentos de demonstração',
    'Aula de legislação e segurança',
    'Prática de voo com cada aluno',
    'Registrar a frequência e as notas',
  ],
  'srv-treino': [
    'Levar apostila impressa',
    'Separar 2 baterias de treino',
    'Conferir a lista de presença',
    'Treinar a calibração da vazão e dos bicos',
    'Prática de voo supervisionado',
    'Deixar os contatos do suporte técnico',
  ],
}
