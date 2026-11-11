import { useMemo, useState } from 'react'
import { AlertTriangle, CheckCircle2, ExternalLink, Eye, EyeOff, Info, Plus, RotateCcw, Trash2, XCircle } from 'lucide-react'
import {
  Abas, Button, Campo, CabecalhoPagina, Confirmar, IconButton, Input, Painel, Select, Selo, SeloIA, toast, cx,
} from '@/components/ui'
import { useStore } from '@/store'
import { chamarGemini, lerConfigIA, salvarConfigIA, type ConfigIA } from '@/lib/ai'
import type { Empresa, Usuario } from '@/types'

type Aba = 'empresa' | 'usuarios' | 'ia' | 'dados'
const ABAS: { id: Aba; rotulo: string }[] = [
  { id: 'empresa', rotulo: 'Empresa' },
  { id: 'usuarios', rotulo: 'Usuários' },
  { id: 'ia', rotulo: 'Inteligência artificial' },
  { id: 'dados', rotulo: 'Dados da demonstração' },
]

// ------------------------------------------------------------------ Empresa

function AbaEmpresa() {
  const empresa = useStore((s) => s.empresa)
  const salvarEmpresa = useStore((s) => s.salvarEmpresa)
  const [form, setForm] = useState<Empresa>(() => ({ ...empresa, unidades: [...empresa.unidades] }))
  const [nova, setNova] = useState('')
  const alterado = useMemo(() => JSON.stringify(form) !== JSON.stringify(empresa), [form, empresa])
  const set = <K extends keyof Empresa>(k: K, v: Empresa[K]) => setForm((f) => ({ ...f, [k]: v }))

  function adicionarUnidade() {
    const t = nova.trim()
    if (!t) return
    if (form.unidades.some((u) => u.toLowerCase() === t.toLowerCase())) { toast.info('Essa unidade já está na lista'); return }
    set('unidades', [...form.unidades, t]); setNova('')
  }
  function salvar() {
    if (!form.nome.trim()) { toast.erro('Informe o nome da empresa'); return }
    salvarEmpresa({ ...form, nome: form.nome.trim(), unidades: form.unidades.map((u) => u.trim()).filter(Boolean) })
    toast.sucesso('Dados da empresa salvos')
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Painel titulo="Dados da empresa">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2"><Campo rotulo="Nome da empresa" obrigatorio><Input value={form.nome} onChange={(e) => set('nome', e.target.value)} /></Campo></div>
          <Campo rotulo="CNPJ"><Input value={form.cnpj} inputMode="numeric" onChange={(e) => set('cnpj', e.target.value)} /></Campo>
          <Campo rotulo="Telefone"><Input value={form.fone} inputMode="tel" onChange={(e) => set('fone', e.target.value)} /></Campo>
          <div className="sm:col-span-2"><Campo rotulo="Endereço"><Input value={form.endereco} onChange={(e) => set('endereco', e.target.value)} /></Campo></div>
          <Campo rotulo="Cidade"><Input value={form.cidade} onChange={(e) => set('cidade', e.target.value)} /></Campo>
          <Campo rotulo="E-mail"><Input type="email" value={form.email} onChange={(e) => set('email', e.target.value)} /></Campo>
        </div>
        <div className="mt-5 flex flex-wrap items-center justify-end gap-2">
          {alterado && <Button variante="fantasma" onClick={() => setForm({ ...empresa, unidades: [...empresa.unidades] })}>Descartar alterações</Button>}
          <Button disabled={!alterado} onClick={salvar}>Salvar dados</Button>
        </div>
      </Painel>

      <Painel titulo="Unidades">
        <p className="mb-3 text-sm text-mata-suave">Locais de atendimento e depósito. Aparecem na localização das peças e nos documentos.</p>
        <ul className="divide-y divide-linha rounded-campo border border-linha">
          {form.unidades.length === 0 && <li className="p-3 text-sm text-mata-suave">Nenhuma unidade cadastrada.</li>}
          {form.unidades.map((u, i) => (
            <li key={`${u}-${i}`} className="flex items-center gap-2 py-1 pl-3 pr-1">
              <input aria-label={`Unidade ${i + 1}`} value={u} onChange={(e) => set('unidades', form.unidades.map((x, k) => (k === i ? e.target.value : x)))}
                className="h-10 min-w-0 flex-1 bg-transparent text-sm focus:outline-none" />
              <IconButton aria-label={`Remover ${u}`} icone={<Trash2 size={16} />} onClick={() => set('unidades', form.unidades.filter((_, k) => k !== i))} />
            </li>
          ))}
        </ul>
        <div className="mt-3 flex gap-2">
          <Input value={nova} placeholder="Nome da nova unidade" aria-label="Nova unidade" onChange={(e) => setNova(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); adicionarUnidade() } }} />
          <Button variante="secundario" icone={<Plus size={16} />} onClick={adicionarUnidade}>Adicionar</Button>
        </div>
        <p className="mt-3 text-xs text-mata-suave">Lembre de salvar os dados da empresa depois de mudar as unidades.</p>
      </Painel>
    </div>
  )
}

// ------------------------------------------------------------------ Usuários

const VISAO: Record<Usuario['papel'], string> = {
  Gestor: 'Vê tudo: painel, financeiro, notas fiscais, relatórios e configurações.',
  Vendas: 'Funil, orçamentos, clientes e conversas. Não vê o financeiro completo.',
  Técnico: 'Ordens de serviço, relatórios de manutenção, catálogo e consulta de peças.',
  Estoque: 'Peças, movimentações, notas de entrada e inventário.',
}

function AbaUsuarios() {
  const usuarios = useStore((s) => s.usuarios)
  const atualId = useStore((s) => s.usuarioAtualId)
  const definir = useStore((s) => s.definirUsuario)
  const papeis = Array.from(new Set(usuarios.map((u) => u.papel)))

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
      <Painel titulo="Usuários" semPadding>
        <ul className="divide-y divide-linha">
          {usuarios.map((u) => {
            const atual = u.id === atualId
            return (
              <li key={u.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{u.nome}</p>
                  <p className="text-sm text-mata-suave">{u.papel}</p>
                </div>
                {atual ? <Selo cor="verde" icone={<CheckCircle2 size={12} />}>Usuário atual</Selo> : (
                  <Button variante="secundario" tamanho="sm" onClick={() => { definir(u.id); toast.sucesso(`Agora você usa o sistema como ${u.nome} (${u.papel})`) }}>
                    Usar como este usuário
                  </Button>
                )}
              </li>
            )
          })}
        </ul>
      </Painel>
      <Painel titulo="O que cada papel vê">
        <dl className="space-y-3 text-sm">
          {papeis.map((p) => (
            <div key={p}><dt className="font-medium">{p}</dt><dd className="text-mata-suave">{VISAO[p]}</dd></div>
          ))}
        </dl>
        <p className="mt-4 flex items-start gap-2 border-t border-linha pt-3 text-xs text-mata-suave">
          <Info size={14} className="mt-px shrink-0" aria-hidden />Nesta demonstração todas as telas continuam abertas. No sistema final, cada papel enxerga só o que precisa.
        </p>
      </Painel>
    </div>
  )
}

// ------------------------------------------------------------------ Inteligência artificial

const MODELOS_GEMINI = ['gemini-2.5-flash', 'gemini-2.5-flash-lite', 'gemini-2.5-pro']

function AbaIA() {
  const inicial = useMemo(() => lerConfigIA(), [])
  const [cfg, setCfg] = useState<ConfigIA>(inicial)
  const [salva, setSalva] = useState<ConfigIA>(inicial)
  const [mostrar, setMostrar] = useState(false)
  const [testando, setTestando] = useState(false)
  const [teste, setTeste] = useState<{ ok: boolean; texto: string } | null>(null)
  const alterado = JSON.stringify(cfg) !== JSON.stringify(salva)
  const modelos = MODELOS_GEMINI.includes(cfg.modeloGemini) ? MODELOS_GEMINI : [cfg.modeloGemini, ...MODELOS_GEMINI]
  const semChave = cfg.provedor === 'gemini' && cfg.chaveGemini.trim().length <= 10

  function salvar() {
    const nova = salvarConfigIA({ ...cfg, chaveGemini: cfg.chaveGemini.trim() })
    setSalva(nova); setCfg(nova)
    toast.sucesso(nova.provedor === 'gemini' ? 'Configuração salva. A IA usará o Google Gemini.' : 'Configuração salva. A IA usará o modo simulado.')
  }

  async function testar() {
    const nova = salvarConfigIA({ ...cfg, chaveGemini: cfg.chaveGemini.trim() })
    setSalva(nova); setCfg(nova)
    setTestando(true); setTeste(null)
    try {
      const r = await chamarGemini({ sistema: 'Responda apenas com a palavra OK.', prompt: 'Teste de conexão.' })
      setTeste({ ok: true, texto: `Conexão funcionando. O modelo ${nova.modeloGemini} respondeu: "${r.trim().slice(0, 40)}".` })
    } catch (e) {
      setTeste({ ok: false, texto: e instanceof Error ? e.message : 'Não foi possível conectar.' })
    } finally { setTestando(false) }
  }

  const opcao = (id: ConfigIA['provedor'], titulo: string, texto: string) => {
    const ativa = cfg.provedor === id
    return (
      <button type="button" role="radio" aria-checked={ativa} onClick={() => { setCfg((c) => ({ ...c, provedor: id })); setTeste(null) }}
        className={cx('flex w-full items-start gap-3 rounded-painel border p-4 text-left transition-colors',
          ativa ? 'border-lavoura bg-lavoura-claro/40' : 'border-linha hover:bg-nevoa')}>
        <span className={cx('mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2', ativa ? 'border-lavoura' : 'border-linha')}>
          {ativa && <span className="h-2.5 w-2.5 rounded-full bg-lavoura" />}
        </span>
        <span><span className="block font-medium">{titulo}</span><span className="block text-sm text-mata-suave">{texto}</span></span>
      </button>
    )
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
      <div className="space-y-4">
        <Painel titulo="Provedor de IA">
          <div role="radiogroup" aria-label="Provedor de IA" className="grid gap-3 md:grid-cols-2">
            {opcao('simulada', 'Simulada (demonstração)', 'Funciona sem internet e sem chave. As respostas são calculadas com os dados do sistema.')}
            {opcao('gemini', 'Google Gemini', 'Respostas redigidas por um modelo de linguagem real, com os dados do sistema como base.')}
          </div>
        </Painel>

        {cfg.provedor === 'gemini' && (
          <Painel titulo="Chave e modelo do Gemini">
            <div className="space-y-4">
              <Campo rotulo="Chave da API do Gemini" ajuda="Cole a chave aqui. Ela fica salva só neste navegador.">
                <div className="flex gap-2">
                  <Input type={mostrar ? 'text' : 'password'} value={cfg.chaveGemini} autoComplete="off" spellCheck={false} placeholder="Cole sua chave"
                    onChange={(e) => { setCfg((c) => ({ ...c, chaveGemini: e.target.value })); setTeste(null) }} />
                  <IconButton aria-label={mostrar ? 'Ocultar a chave' : 'Mostrar a chave'} icone={mostrar ? <EyeOff size={18} /> : <Eye size={18} />} onClick={() => setMostrar((v) => !v)} />
                </div>
              </Campo>
              <p className="text-sm text-mata-suave">
                Para obter uma chave gratuita, entre no{' '}
                <a href="https://aistudio.google.com/apikey" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-medium text-ceu">
                  Google AI Studio<ExternalLink size={13} aria-hidden />
                </a>, faça login com uma conta Google e clique em criar chave de API.
              </p>
              <Campo rotulo="Modelo">
                <Select value={cfg.modeloGemini} onChange={(e) => { setCfg((c) => ({ ...c, modeloGemini: e.target.value })); setTeste(null) }}>
                  {modelos.map((m) => <option key={m} value={m}>{m}</option>)}
                </Select>
              </Campo>
              {semChave && <p className="text-sm text-ambar" role="status">Sem a chave, o sistema continua usando a IA simulada.</p>}
              <div className="flex flex-wrap items-center gap-2">
                <Button variante="ia" icone={<CheckCircle2 size={16} />} loading={testando} disabled={semChave} onClick={() => void testar()}>Testar conexão</Button>
                <span className="text-xs text-mata-suave">Salva a configuração e envia uma pergunta curta ao Gemini.</span>
              </div>
              {teste && (
                <div role="status" className={cx('flex items-start gap-2 rounded-campo border px-3 py-2.5 text-sm',
                  teste.ok ? 'border-lavoura/30 bg-lavoura-claro text-lavoura-escuro' : 'border-barro/30 bg-barro-claro text-[#9A2D20]')}>
                  {teste.ok ? <CheckCircle2 size={16} className="mt-0.5 shrink-0" aria-hidden /> : <XCircle size={16} className="mt-0.5 shrink-0" aria-hidden />}
                  <span>{teste.texto}</span>
                </div>
              )}
            </div>
          </Painel>
        )}

        <div className="flex flex-wrap items-center justify-end gap-2">
          {alterado && <Button variante="fantasma" onClick={() => { setCfg(salva); setTeste(null) }}>Descartar</Button>}
          <Button disabled={!alterado} onClick={salvar}>Salvar configuração</Button>
        </div>
      </div>

      <div className="space-y-4">
        <Painel titulo="Situação atual">
          <p className="flex flex-wrap items-center gap-2 text-sm">
            <SeloIA>IA</SeloIA>
            {salva.provedor === 'gemini' && salva.chaveGemini.trim().length > 10 ? `Usando o Google Gemini (${salva.modeloGemini}).` : 'Usando a IA simulada.'}
          </p>
        </Painel>
        <div className="flex gap-3 rounded-painel border border-ambar/40 bg-ambar-claro p-4 text-sm">
          <AlertTriangle size={18} className="mt-0.5 shrink-0 text-ambar" aria-hidden />
          <div className="space-y-1.5">
            <p className="font-medium">A chave fica só neste navegador</p>
            <p>Ela não é enviada para nenhum servidor da empresa. Não use um computador compartilhado. Com o Gemini ligado, trechos dos dados consultados são enviados ao Google; na demonstração eles são fictícios.</p>
          </div>
        </div>
        <p className="flex items-start gap-2 text-sm text-mata-suave">
          <Info size={16} className="mt-0.5 shrink-0" aria-hidden />
          No sistema final a IA será o Claude, da Anthropic, rodando no servidor. A chave nunca fica no navegador.
        </p>
      </div>
    </div>
  )
}

// ------------------------------------------------------------------ Dados

function AbaDados() {
  const restaurar = useStore((s) => s.restaurarDemo)
  const n = {
    clientes: useStore((s) => s.clientes.length), equipamentos: useStore((s) => s.equipamentos.length),
    produtos: useStore((s) => s.produtos.length), movimentacoes: useStore((s) => s.movimentacoes.length),
    orcamentos: useStore((s) => s.orcamentos.length), ordens: useStore((s) => s.ordens.length),
    notas: useStore((s) => s.notas.length), lancamentos: useStore((s) => s.lancamentos.length),
    leads: useStore((s) => s.leads.length), conversas: useStore((s) => s.conversas.length),
    usuarios: useStore((s) => s.usuarios.length), modelos: useStore((s) => s.modelos.length),
  }
  const [confirmar, setConfirmar] = useState(false)
  const linhas: [string, number][] = [
    ['Clientes', n.clientes], ['Drones de clientes', n.equipamentos], ['Peças e produtos', n.produtos], ['Movimentações de estoque', n.movimentacoes],
    ['Orçamentos', n.orcamentos], ['Ordens de serviço', n.ordens], ['Notas fiscais', n.notas], ['Lançamentos financeiros', n.lancamentos],
    ['Leads no funil', n.leads], ['Conversas', n.conversas], ['Usuários', n.usuarios], ['Modelos de drone', n.modelos],
  ]
  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
      <Painel titulo="O que existe hoje na demonstração">
        <dl className="grid gap-x-8 gap-y-2 sm:grid-cols-2">
          {linhas.map(([k, v]) => (
            <div key={k} className="flex items-baseline justify-between gap-3 border-b border-linha py-2 text-sm">
              <dt className="text-mata-suave">{k}</dt><dd className="num font-semibold">{v}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-3 text-xs text-mata-suave">Todos os dados são fictícios. As alterações que você faz ficam salvas neste navegador.</p>
      </Painel>
      <Painel titulo="Começar do zero">
        <p className="text-sm text-mata-suave">Volta tudo ao estado original: clientes, estoque, orçamentos, OS, financeiro e conversas. Use depois de uma apresentação para deixar a demonstração limpa.</p>
        <Button className="mt-4" variante="perigo" icone={<RotateCcw size={16} />} onClick={() => setConfirmar(true)}>Restaurar dados de demonstração</Button>
      </Painel>
      <Confirmar
        aberto={confirmar} perigo titulo="Restaurar os dados de demonstração?"
        texto="Tudo o que você cadastrou ou alterou será apagado e os dados originais voltam. Isso não pode ser desfeito."
        rotuloConfirmar="Restaurar"
        aoConfirmar={() => { restaurar(); setConfirmar(false); toast.sucesso('Dados de demonstração restaurados') }}
        aoCancelar={() => setConfirmar(false)}
      />
    </div>
  )
}

export default function Config() {
  const [aba, setAba] = useState<Aba>('empresa')
  return (
    <>
      <CabecalhoPagina titulo="Configurações" descricao="Dados da empresa, usuários e inteligência artificial." />
      <Abas abas={ABAS} ativa={aba} aoMudar={(id) => setAba(id as Aba)} className="mb-4" />
      {aba === 'empresa' && <AbaEmpresa />}
      {aba === 'usuarios' && <AbaUsuarios />}
      {aba === 'ia' && <AbaIA />}
      {aba === 'dados' && <AbaDados />}
    </>
  )
}
