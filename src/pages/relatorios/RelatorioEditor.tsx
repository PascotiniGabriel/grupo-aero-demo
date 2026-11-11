import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, FileText, MessageCircle, Printer, RefreshCw, Save, Sparkles } from 'lucide-react'
import { useStore } from '@/store'
import { Button, CabecalhoPagina, EstadoVazio, Modal, Painel, Selo, Textarea, toast } from '@/components/ui'
import { AIComposer } from '@/components/ia/AIComposer'
import { AIPensando } from '@/components/ia/AIPensando'
import { nomeModelo, porId } from '@/store/selectors'
import { gerarRelatorio, reescreverSecao, type ContextoRelatorio, type SecaoRelatorio } from '@/lib/ai/relatorio'
import { GerenciadorFotos, useAdicionarFotos } from '@/pages/os/FotosOS'
import { DocumentoRelatorio } from './DocumentoRelatorio'
import type { RelatorioOS } from '@/types'

const EXEMPLOS = [
  'queda lateral, braço 3 trincado, motor 3 travando, troquei braço e motor, calibrei bússola, teste de voo ok',
  'bomba sem pressão, bicos entupidos, limpei os bicos, troquei a bomba, teste de vazão ok',
  'conector oxidado por defensivo, ESC queimado, troquei ESC, atualizei firmware, voo de teste ok',
]

function Passo({ n, titulo, children }: { n: number; titulo: string; children: React.ReactNode }) {
  return (
    <Painel>
      <div className="mb-3 flex items-center gap-2.5">
        <span className="num inline-flex h-7 w-7 items-center justify-center rounded-full bg-mata text-sm font-semibold text-white">{n}</span>
        <h2 className="text-base">{titulo}</h2>
      </div>
      {children}
    </Painel>
  )
}

export default function RelatorioEditor() {
  const { osId } = useParams()
  const ordens = useStore((s) => s.ordens)
  const clientes = useStore((s) => s.clientes)
  const equipamentos = useStore((s) => s.equipamentos)
  const modelos = useStore((s) => s.modelos)
  const produtos = useStore((s) => s.produtos)
  const servicos = useStore((s) => s.servicos)
  const empresa = useStore((s) => s.empresa)
  const salvar = useStore((s) => s.salvar)

  const os = ordens.find((o) => o.id === osId)
  const { adicionar } = useAdicionarFotos(osId ?? '')
  const [notas, setNotas] = useState(os?.relatorio?.notasTecnico ?? '')
  const [rascunho, setRascunho] = useState<RelatorioOS | null>(os?.relatorio ?? null)
  const [salvo, setSalvo] = useState(!!os?.relatorio)
  const [gerando, setGerando] = useState(false)
  const [reescrevendo, setReescrevendo] = useState<SecaoRelatorio | null>(null)
  const [zapAberto, setZapAberto] = useState(false)
  const [mensagem, setMensagem] = useState('')
  const docRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setNotas(os?.relatorio?.notasTecnico ?? ''); setRascunho(os?.relatorio ?? null); setSalvo(!!os?.relatorio)
  }, [os?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const cliente = porId(clientes, os?.clienteId)
  const equipamento = porId(equipamentos, os?.equipamentoId)
  const modelo = porId(modelos, equipamento?.modeloId)

  const contexto = useMemo<ContextoRelatorio | null>(
    () => (os ? { os, cliente, equipamento, modelo, produtos, servicos, notas } : null),
    [os, cliente, equipamento, modelo, produtos, servicos, notas],
  )

  if (!os || !contexto) {
    return <Painel><EstadoVazio icone={<FileText size={32} />} titulo="Ordem de serviço não encontrada" texto="Abra o relatório a partir de uma OS." /></Painel>
  }

  const nFotos = os.fotos.length
  const etapas = [
    'Lendo as anotações',
    nFotos ? `Analisando ${nFotos} ${nFotos === 1 ? 'foto' : 'fotos'}` : 'Conferindo o registro da OS',
    'Cruzando com as peças e serviços da OS',
    'Escrevendo o relatório em português técnico',
  ]

  async function gerar() {
    if (!notas.trim() && os!.itens.length === 0 && !os!.diagnostico.trim()) {
      toast.erro('Conte o que foi feito: escreva, dite ou use um exemplo.')
      return
    }
    setGerando(true)
    try {
      const r = await gerarRelatorio(contexto!)
      setRascunho(r); setSalvo(false)
      toast.sucesso('Relatório gerado. Revise e salve na OS.')
      setTimeout(() => docRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80)
    } catch {
      toast.erro('Não foi possível gerar o relatório. Tente de novo.')
    } finally { setGerando(false) }
  }

  async function reescrever(secao: SecaoRelatorio, instrucao: string) {
    if (!rascunho) return
    setReescrevendo(secao)
    try {
      const novo = await reescreverSecao(secao, rascunho[secao], instrucao, contexto!)
      setRascunho((r) => (r ? { ...r, [secao]: novo } : r)); setSalvo(false)
    } catch { toast.erro('Não foi possível reescrever este trecho.') } finally { setReescrevendo(null) }
  }

  function salvarNaOS() {
    if (!rascunho) return
    salvar('ordens', {
      ...os!, relatorio: { ...rascunho, notasTecnico: notas },
      historico: [...os!.historico, { data: new Date().toISOString(), texto: os!.relatorio ? 'Relatório de manutenção atualizado' : 'Relatório de manutenção criado' }],
    })
    setSalvo(true)
    toast.sucesso('Relatório salvo na OS')
  }

  function abrirZap() {
    const nome = cliente?.nome.split(' ')[0] ?? ''
    setMensagem(`Olá${nome ? `, ${nome}` : ''}! O relatório de manutenção do seu ${modelo ? nomeModelo(modelo.id, modelos) : 'drone'} (OS ${os!.numero}) está pronto.\n\n${rascunho?.resumo ?? ''}\n\nQualquer dúvida, é só responder esta mensagem.`)
    setZapAberto(true)
  }

  return (
    <>
      <div className="nao-imprimir">
        <Link to={`/os/${os.id}`} className="mb-2 inline-flex min-h-10 items-center gap-1 text-sm text-ceu hover:underline"><ArrowLeft size={16} />OS {os.numero}</Link>
        <CabecalhoPagina
          titulo="Relatório de manutenção"
          descricao={`OS ${os.numero} · ${cliente?.nome ?? ''}${modelo ? ` · ${nomeModelo(modelo.id, modelos)}` : ''}`}
          acoes={rascunho && (
            <>
              {!salvo && <Selo cor="ambar">Alterações não salvas</Selo>}
              <Button variante="secundario" icone={<Printer size={18} />} onClick={() => window.print()}>Imprimir / PDF</Button>
              <Button variante="secundario" icone={<MessageCircle size={18} />} onClick={abrirZap}>Enviar pelo WhatsApp</Button>
              <Button icone={<Save size={18} />} onClick={salvarNaOS} disabled={salvo}>Salvar na OS</Button>
            </>
          )}
        />
      </div>

      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,400px)_minmax(0,1fr)]">
        <div className="nao-imprimir space-y-4">
          <Passo n={1} titulo="Confira as fotos">
            <p className="mb-3 text-sm text-mata-suave">Cada foto entra no relatório na seção da sua fase. Escreva uma legenda para ela aparecer no laudo.</p>
            <GerenciadorFotos osId={os.id} compacto />
          </Passo>

          <Passo n={2} titulo="Conte o que foi feito">
            <AIComposer
              valor={notas} aoMudar={(v) => { setNotas(v); setSalvo(false) }} aoEnviar={() => void gerar()} enviarComEnter={false}
              placeholder="Escreva, dite ou use palavras-chave. Ex.: queda lateral, braço 3 trincado, troquei braço e motor, teste de voo ok"
              rotuloEnviar="Gerar relatório" carregando={gerando} linhas={4} sugestoes={EXEMPLOS} permitirVazio
              aoAnexar={(fs) => void adicionar(fs, 'dano')} rotuloAnexar="Fotos de danos"
            />
          </Passo>

          <Passo n={3} titulo="Gere o relatório">
            <Button variante="ia" bloco tamanho="lg" icone={rascunho ? <RefreshCw size={18} /> : <Sparkles size={18} />} loading={gerando} onClick={() => void gerar()}>
              {rascunho ? 'Gerar de novo' : 'Gerar relatório'}
            </Button>
            <div className="mt-3"><AIPensando ativa={gerando} etapas={etapas} /></div>
            {rascunho && !gerando && <p className="mt-3 text-sm text-mata-suave">Clique em Editar ou Reescrever em qualquer trecho do documento para ajustar.</p>}
          </Passo>
        </div>

        <div ref={docRef} className="min-w-0">
          {rascunho ? (
            <DocumentoRelatorio
              os={os} cliente={cliente} equipamento={equipamento} modelo={modelo} empresa={empresa} produtos={produtos}
              relatorio={rascunho} editavel reescrevendo={reescrevendo}
              aoMudar={(p) => { setRascunho((r) => (r ? { ...r, ...p } : r)); setSalvo(false) }}
              aoReescrever={(s, i) => void reescrever(s, i)}
            />
          ) : (
            <Painel className="nao-imprimir">
              <EstadoVazio icone={<FileText size={32} />} titulo="O relatório aparece aqui" texto="Confira as fotos, conte o que foi feito e toque em Gerar relatório. Leva alguns segundos." />
            </Painel>
          )}
        </div>
      </div>

      <Modal
        aberto={zapAberto} aoFechar={() => setZapAberto(false)} titulo="Enviar ao cliente pelo WhatsApp" largura="md"
        rodape={<>
          <Button variante="secundario" onClick={() => setZapAberto(false)}>Cancelar</Button>
          <Button icone={<MessageCircle size={18} />} onClick={() => { setZapAberto(false); toast.sucesso(`Relatório enviado para ${cliente?.nome ?? 'o cliente'} (${cliente?.fone ?? ''})`) }}>Enviar</Button>
        </>}
      >
        <div className="space-y-3">
          <p className="text-sm text-mata-suave">Para {cliente?.nome} · {cliente?.fone}. O relatório segue em PDF junto com a mensagem.</p>
          <Textarea rows={8} value={mensagem} onChange={(e) => setMensagem(e.target.value)} aria-label="Mensagem" />
        </div>
      </Modal>
    </>
  )
}
