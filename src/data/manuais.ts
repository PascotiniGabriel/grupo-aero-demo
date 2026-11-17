/** Base de manuais do agente de suporte. Texto genérico, conforme o manual do equipamento (sem afirmar especificação oficial). */
export interface TrechoManual {
  id: string
  /** ids de ModeloDrone (ex.: 't40'). */
  modelos: string[]
  tema: string
  palavras: string[]
  titulo: string
  passos: string[]
  fonte: string
}

export const MANUAIS: TrechoManual[] = [
  {
    id: 'man-gota-fungicida', modelos: ['t25', 't40', 't50'], tema: 'tamanho de gota',
    palavras: ['gota', 'fungicida', 'tamanho', 'deriva', 'bico', 'pressão', 'vazão'],
    titulo: 'Tamanho de gota para fungicida',
    passos: ['O tamanho da gota depende do bico, da pressão e da vazão: mais vazão e bico centrífugo mais rápido geram gotas menores.', 'Para fungicida, conforme o manual do equipamento, use gota fina a média para cobrir bem a folha.', 'Com vento forte, suba um nível de tamanho para reduzir a deriva.', 'Confira a vazão por hectare antes de decolar.'],
    fonte: 'Manual Agras T40, cap. 6',
  },
  {
    id: 'man-gota-inseticida', modelos: ['t25', 't40', 't50'], tema: 'tamanho de gota',
    palavras: ['gota', 'inseticida', 'tamanho', 'praga', 'vazão'],
    titulo: 'Tamanho de gota para inseticida',
    passos: ['Para inseticida, use gota média: equilibra cobertura e resistência à deriva.', 'Em cultura densa, aumente a vazão por hectare em vez de reduzir o tamanho da gota.', 'Evite aplicar nas horas mais quentes do dia.'],
    fonte: 'Manual Agras T40, cap. 6',
  },
  {
    id: 'man-gota-herbicida', modelos: ['t25', 't40', 't50'], tema: 'tamanho de gota',
    palavras: ['gota', 'herbicida', 'tamanho', 'deriva', 'dessecação'],
    titulo: 'Tamanho de gota para herbicida',
    passos: ['Para herbicida, prefira gota média a grossa para evitar deriva sobre culturas vizinhas.', 'Mantenha a altura de voo recomendada no manual e velocidade constante.', 'Não aplique com vento acima do limite indicado no rótulo do produto.'],
    fonte: 'Manual Agras T40, cap. 6',
  },
  {
    id: 'man-balanca', modelos: ['t25', 't40', 't50'], tema: 'calibração de balança',
    palavras: ['balança', 'célula de carga', 'peso', 'calibrar', 'tanque', 'leitura'],
    titulo: 'Calibrar a balança (célula de carga)',
    passos: ['Esvazie o tanque e pouse o drone em piso plano.', 'No aplicativo, abra Pulverização e toque em Calibrar balança.', 'Confirme o tanque vazio e aguarde a leitura estabilizar.', 'Adicione 10 L de água e confira se a leitura bate.'],
    fonte: 'Manual Agras T40, cap. 8',
  },
  {
    id: 'man-fluxometro', modelos: ['t25', 't40', 't50'], tema: 'calibração de fluxômetro',
    palavras: ['fluxômetro', 'fluxo', 'vazão', 'calibrar', 'bomba', 'erro'],
    titulo: 'Calibrar o fluxômetro',
    passos: ['Encha o tanque com água limpa, sem calda.', 'Entre em Pulverização e toque em Calibrar fluxômetro.', 'Aguarde o fim da vazão sem desligar a bomba.', 'Se der erro, limpe o filtro do tanque e repita. Persistindo, procure a assistência.'],
    fonte: 'Manual Agras T40, cap. 7',
  },
  {
    id: 'man-contatos', modelos: ['t25', 't40', 't50'], tema: 'mau contato na placa',
    palavras: ['contato', 'placa', 'mau contato', 'radar some', 'falha intermitente', 'cabo', 'conector'],
    titulo: 'Limpar os contatos da placa',
    passos: ['Desligue o drone e retire a bateria.', 'Desconecte o cabo do componente com problema.', 'Passe limpa contato nos terminais e deixe secar por completo.', 'Reconecte com firmeza e ligue para testar.'],
    fonte: 'Manual Agras T40, cap. 11',
  },
  {
    id: 'man-bussola', modelos: ['t25', 't40', 't50'], tema: 'bússola',
    palavras: ['bússola', 'erro de bússola', 'calibrar', 'interferência', 'magnético', 'decolagem'],
    titulo: 'Calibrar a bússola',
    passos: ['Afaste-se de metais, cercas, fios e veículos.', 'No aplicativo, abra Estado da aeronave e toque em Calibrar bússola.', 'Gire o drone na horizontal e depois na vertical, conforme a tela indica.', 'Se o erro voltar, mude de local e repita.'],
    fonte: 'Manual Agras T40, cap. 9',
  },
  {
    id: 'man-rtk', modelos: ['t25', 't40', 't50', 't70p'], tema: 'RTK sem sinal',
    palavras: ['rtk', 'sem sinal', 'posicionamento', 'base', 'gnss', 'satélite'],
    titulo: 'RTK sem sinal ou sem fixar',
    passos: ['Instale a base em local aberto, longe de árvores e construções.', 'Confira se a base e o drone usam o mesmo canal e a mesma rede.', 'Aguarde a base fixar antes de ligar o drone.', 'Se a fixação não vier, reinicie a base e o drone, nessa ordem.'],
    fonte: 'Manual D-RTK, cap. 3',
  },
  {
    id: 'man-bateria', modelos: ['t25', 't40', 't50', 't70p'], tema: 'bateria não carrega',
    palavras: ['bateria', 'carrega', 'carregador', 'não carrega', 'luz', 'temperatura'],
    titulo: 'Bateria não carrega',
    passos: ['Deixe a bateria esfriar por pelo menos 30 minutos antes de carregar.', 'Confira o encaixe dos conectores e se o carregador está bem ligado.', 'Teste outro cabo de energia e outra tomada.', 'Bateria inchada ou com cheiro: não use e procure a assistência.'],
    fonte: 'Manual Agras T40, cap. 12',
  },
]
