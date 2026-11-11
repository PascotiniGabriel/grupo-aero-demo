# Fundação: o que já existe para os módulos usarem

Imports: `@/components/ui` (tudo do kit), `@/components/ia/AIComposer`, `@/components/ia/AIPensando`,
`@/components/qr/LeitorQR`, `@/components/qr/EtiquetaQR`, `@/store`, `@/store/selectors`, `@/lib/format`,
`@/lib/fotos`, `@/lib/useDitado`, `@/lib/ai`, `@/types`. A casca (`layout/AppShell`) já monta menu, busca
global (Ctrl+K), `LeitorQR` e `Toasts`: a página só devolve o conteúdo, começando por `CabecalhoPagina`.

## Kit (`@/components/ui`)
- `Button` `{variante?: 'primario'|'secundario'|'fantasma'|'perigo'|'ia', tamanho?: 'sm'|'md'|'lg', icone?, loading?, bloco?}` + props de `<button>`. `ia` só em ação de IA.
- `IconButton` `{icone, 'aria-label' (obrigatório), destaque?}`
- `Input`, `Textarea`, `Select` — nativos estilizados, aceitam `invalido?`. `campoBase` = classes de campo.
- `Campo` `{rotulo, erro?, ajuda?, obrigatorio?}` — envolve UM controle e liga label/id sozinho.
- `Selo` `{cor?: 'neutro'|'verde'|'azul'|'ambar'|'vermelho', icone?}` · `SeloIA` (degradê, só IA)
- `SeloStatus` `{tipo: 'os'|'orcamento'|'nota'|'lancamento', status}` · `rotuloStatus(tipo, status)` · `statusLancamento(l)` → `'pago'|'a_vencer'|'vencido'`
- `Painel` `{titulo?, acoes?, semPadding?}` (use `semPadding` com `Tabela` dentro) · `CabecalhoPagina` `{titulo, descricao?, acoes?}`
- `Tabela<T>` `{colunas: Coluna<T>[], dados, chave, aoClicar?, vazio?, ordemInicial?}`; `Coluna` `{id, titulo, render, valor? (habilita ordenar), alinhar?, principal?, ocultarMobile?, largura?}`. No celular vira lista de cartões.
- `Abas` `{abas: {id, rotulo, contagem?}[], ativa, aoMudar}`
- `Modal` `{aberto, aoFechar, titulo, rodape?, largura?: 'sm'|'md'|'lg'|'xl'}` · `Gaveta` `{aberta, aoFechar, titulo, rodape?, largura?: 'md'|'lg'|'xl'}` (lateral direita; tela cheia no celular)
- `Confirmar` `{aberto, titulo, texto?, rotuloConfirmar?, perigo?, aoConfirmar, aoCancelar}`
- `toast.sucesso(t)` / `toast.erro(t)` / `toast.info(t)` (ou `useToast()`); `Toasts` já está montado.
- `EstadoVazio` `{icone?, titulo?, texto?, acao?}` · `Indicador` `{rotulo, valor, variacao? (%), detalhe?, cor?}`
- `CampoBusca` `{valor, aoMudar, placeholder?}` · `ChipsModelos` `{ids, max?}` (vazio = "Universal") · `Avatar` `{nome, tamanho?}` · `cx(...classes)`

```tsx
const colunas: Coluna<Produto>[] = [
  { id: 'nome', titulo: 'Peça', principal: true, valor: (p) => p.nome, render: (p) => p.nome },
  { id: 'estoque', titulo: 'Estoque', alinhar: 'direita', valor: (p) => p.estoque, render: (p) => numero(p.estoque) },
]
<Painel semPadding><Tabela colunas={colunas} dados={produtos} chave={(p) => p.id} aoClicar={(p) => navegar(`/estoque/${p.id}`)} /></Painel>
```

## IA
- `AIComposer` (controlado) `{valor, aoMudar, aoEnviar, placeholder?, rotuloEnviar?, carregando?, desabilitado?, sugestoes?: string[], aoAnexar?: (arquivos: File[]) => void, rotuloAnexar?, anexos?: ReactNode, linhas?, enviarComEnter? (padrão true), permitirVazio?, autoFoco?}`. Microfone aparece sozinho se o navegador suporta ditado.
- `AIPensando` `{etapas: string[], ativa, intervaloMs?}` — some quando `ativa` é false.
- `@/lib/ai`: `lerConfigIA()`, `salvarConfigIA(parcial)`, `iaReal()`, `chamarGemini({sistema, prompt, imagens?, json?})` → texto (lança `Error` legível), `esperar(ms)`, `similaridade(a, b)`, `buscarProdutos(texto, produtos, limite?)`.
- `useDitado((texto, final) => ...)` → `{suportado, ouvindo, iniciar, parar, erro}` (o AIComposer já usa).

```tsx
<AIComposer valor={texto} aoMudar={setTexto} aoEnviar={gerar} carregando={gerando} rotuloEnviar="Gerar orçamento"
  sugestoes={['2 pares de hélice do T40 para a Fazenda Santa Luzia']} aoAnexar={(fs) => adicionarFotos(fs)} />
<AIPensando ativa={gerando} etapas={['Lendo o pedido', 'Procurando as peças', 'Montando o orçamento']} />
// função de IA do módulo: if (iaReal()) { try { return JSON.parse(await chamarGemini({ ..., json: true })) } catch { /* cai no simulado */ } } await esperar(1800); return simulado(...)
```

## QR
- `useLeitorQR()` → `{abrir(opcoes?), fechar()}`. `abrir()` mostra o resultado completo (peça: ver, orçamento, entrada/saída; drone: OS, cliente; desconhecido: cadastrar). `abrir({ aoLer: (codigo) => ..., titulo? })` só devolve o código e fecha.
- Rotas que o leitor chama e que os módulos devem tratar: `/orcamentos/novo?add=<produtoId>`, `/os?novo=<equipamentoId>`, `/estoque?novo=<codigo>`.
- `localizarCodigo(codigo, produtos, equipamentos)` → `{tipo: 'produto', produto, serial?} | {tipo: 'equipamento', equipamento} | {tipo: 'desconhecido'}` · `lerQRDeImagem(file)` → `string | null`
- `EtiquetaQR` `{texto, legenda?, sublegenda?, tamanho?}` — o leitor reconhece SKU, código do fabricante e serial.

## Store (`@/store`) e seletores
- `useStore((s) => s.produtos)` — coleções: `usuarios, modelos, produtos, movimentacoes, servicos, clientes, equipamentos, orcamentos, ordens, notas, lancamentos, leads, conversas` + `empresa`, `usuarioAtualId`. Selecione uma coleção por vez (não devolva objeto/array novo no seletor: causa re-render infinito; derive com `useMemo`).
- Ações: `salvar(colecao, item)` (cria ou atualiza por id), `remover(colecao, id)`, `movimentarEstoque({produtoId, tipo, quantidade, origem, valorUnit?})`, `proximoNumero('orcamento'|'os'|'nota')`, `salvarEmpresa(e)`, `definirUsuario(id)`, `restaurarDemo()`. `novoId(prefixo?)`.
- `@/store/selectors`: `porId(lista, id)`, `totalItens(itens)`, `totalOrcamento(o)`, `pesoItens(itens, produtos)` (g), `saidasPorProduto(movs, dias)` → `{[produtoId]: qtd}`, `nomeModelo(id)`.
- Ids dos dados fictícios: `prd-<slug>`, `cli-01..14`, `eqp-01..20`, `os-<numero>`, `srv-<slug>`, `usr-1..5`. `ordens[].tecnico`, `orcamentos[].vendedor` e `leads[].responsavel` guardam o NOME do usuário.

```tsx
const salvar = useStore((s) => s.salvar)
salvar('orcamentos', { ...orcamento, status: 'enviado' }); toast.sucesso('Orçamento enviado')
```

## Utilitários
- `@/lib/format`: `brl(n)`, `numero(n, casas?)`, `dataCurta(iso)`, `dataHora(iso)`, `relativo(iso)` ("há 3 dias"), `peso(g)`, `normalizar(texto)`.
- `@/lib/fotos`: `fotoPlaceholder(legenda, fase)` (data URI), `reduzirImagem(file, maxLado?)` → dataURL JPEG (use antes de guardar foto na store).
- `@/data/seed`: `diasAtras(n)`, `diasAFrente(n)`, `criarDadosDemo()`.

## CSS (`src/index.css`)
- Cores Tailwind: `nevoa, papel, mata, mata-suave, mata-claro, lavoura, lavoura-escuro, lavoura-claro, ceu, ceu-claro, ambar, ambar-claro, barro, barro-claro, linha`. Raios: `rounded-campo` (6px), `rounded-painel` (10px).
- Classes: `titulo` (fonte de título), `num` (algarismos tabulares), `serial` (monoespaçada, só código/serial), `ia-gradiente`, `ia-borda`, `anim-entrar`, `anim-pulso`.
- Impressão: `nao-imprimir` esconde; envolva o documento em `folha-impressao` e chame `window.print()`. A casca já some na impressão.
