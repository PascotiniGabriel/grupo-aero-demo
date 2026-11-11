# Grupo AERO — demo do sistema de gestão

Demo navegável (dados fictícios, sem backend) de um ERP para o Grupo AERO: revenda de
drones agrícolas DJI Agras, venda de peças e oficina de manutenção. Objetivo da demo:
mostrar o fluxo completo do sistema. Layout simples, objetivo e intuitivo.

## Stack e comandos
- Vite + React 18 + TypeScript + Tailwind v4 (`@tailwindcss/vite`), `react-router-dom`
  (HashRouter), `zustand` (persist em localStorage), `recharts`, `lucide-react`,
  `jsqr`, `qrcode`.
- `npm run dev` · `npm run build` · checagem de tipos: `npx tsc --noEmit -p tsconfig.app.json`
- Deploy: GitHub Pages (branch `gh-pages`), `base: './'` no Vite.

## Regras invioláveis
1. **Dados 100% fictícios.** Nunca CPF, CNPJ, telefone, e-mail, conta bancária ou
   serial reais. CNPJ da empresa na demo: `00.000.000/0001-00`. Telefones `(77) 90000-00xx`.
2. **Nenhuma chave de API no repositório.** Chave Gemini só via tela Configurações
   (localStorage). Sem chave, tudo funciona em modo "IA simulada".
3. Interface inteira em **pt-BR**, frases em caixa normal (nada de RÓTULOS EM CAIXA ALTA),
   verbos diretos ("Gerar orçamento", "Dar entrada"). Sem lorem ipsum.
4. Datas dos dados fictícios sempre **relativas a hoje** (helpers em `src/data/seed.ts`).
5. Cada módulo só edita arquivos da própria pasta (`src/pages/<modulo>/`,
   `src/lib/ai/<modulo>.ts`). Não mexer em `src/components/`, `src/store/`, `src/data/`,
   `src/types.ts`, `src/App.tsx` sem necessidade real — e avisar no retorno se mexer.
6. Funciona em celular (oficina usa telefone pra foto e QR): sem rolagem horizontal
   na página, alvos de toque ≥ 40px.

## Design (não improvisar outro)
- Cores (tokens Tailwind em `src/index.css`): `nevoa #F3F6F4` (fundo), `papel #FFFFFF`
  (superfícies), `mata #10231C` (texto e barra lateral), `lavoura #1F8A4C` (ação
  principal), `ceu #1E78C8` (informação/links), `ambar #D99A00` (atenção),
  `barro #C8402F` (erro/atraso), `linha #DDE5E0` (bordas).
- **Assinatura da IA**: degradê `lavoura → ceu` aparece **somente** em coisas de IA
  (borda do `AIComposer`, selo "IA", botão de gerar). Em nenhum outro lugar.
- Tipografia: família única **Archivo** (variável). Títulos com `font-stretch: 112%`,
  peso 600; corpo 100%/400; números com `tabular-nums`. Sem fonte monoespaçada
  decorativa (só em código/serial).
- Forma: raio 6px em campos/botões, 10px em painéis. Painéis com borda `linha`, sem
  sombra; sombra só em modal/drawer/menu. Nada de degradê decorativo nem cartões
  idênticos em grade só por enfeite.
- Movimento: só em resposta a ação (abrir, gerar, confirmar). Respeitar
  `prefers-reduced-motion`.
- Gráficos (recharts): séries em `lavoura`, `ceu`, `ambar`, `mata`; grade discreta,
  valores em R$ formatados pt-BR.

## Mapa de módulos e rotas
| Rota | Página | Pasta |
|---|---|---|
| `/` | Início (painel) | `pages/inicio` |
| `/funil` | Funil de vendas | `pages/funil` |
| `/orcamentos`, `/orcamentos/novo`, `/orcamentos/:id` | Orçamentos | `pages/orcamentos` |
| `/clientes`, `/clientes/:id` | Clientes e equipamentos | `pages/clientes` |
| `/conversas` | Conversas (WhatsApp) | `pages/conversas` |
| `/os`, `/os/:id` | Ordens de serviço | `pages/os` |
| `/relatorios`, `/relatorios/:osId` | Relatórios de manutenção | `pages/relatorios` |
| `/estoque`, `/estoque/:id` | Peças e produtos | `pages/estoque` |
| `/catalogo`, `/catalogo/:modeloId` | Catálogo com vista explodida | `pages/catalogo` |
| `/notas` | Notas fiscais | `pages/notas` |
| `/financeiro` | Financeiro | `pages/financeiro` |
| `/assistente` | Assistente IA | `pages/assistente` |
| `/config` | Configurações | `pages/config` |

## IA
- `src/lib/ai/index.ts`: configuração, `chamarGemini`, helpers de texto. Cada função de
  IA tem dois caminhos: **simulado** (lógica local real sobre os dados da store, sempre
  funciona) e **Gemini** (se houver chave; em erro cai no simulado).
- No produto real essas funções passam a chamar a API do Claude via backend — manter a
  assinatura das funções independente do provedor.
- Ditado por voz: hook `useDitado` (Web Speech API, pt-BR).
