import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { create } from 'zustand'
import jsQR from 'jsqr'
import {
  ArrowDownToLine, ArrowUpFromLine, Camera, FilePlus2, ImageUp, MapPin, Minus, PackagePlus, Plus, RotateCcw, ScanLine, User, Wrench,
} from 'lucide-react'
import type { Equipamento, Produto } from '@/types'
import { useStore } from '@/store'
import { nomeModelo } from '@/store/selectors'
import { brl, numero } from '@/lib/format'
import { Abas, Button, ChipsModelos, Input, Modal, Selo, cx, toast } from '@/components/ui'

/* ------------------------------------------------------------------ estado global */

export interface OpcoesLeitorQR {
  /** Uso embutido: recebe o código lido e o leitor fecha, sem mostrar o cartão de resultado. */
  aoLer?: (codigo: string) => void
  titulo?: string
}
interface EstadoLeitor {
  aberto: boolean
  opcoes: OpcoesLeitorQR
  abrir: (opcoes?: OpcoesLeitorQR) => void
  fechar: () => void
}
/** `const { abrir } = useLeitorQR(); abrir()` ou `abrir({ aoLer: (codigo) => ... })`. */
export const useLeitorQR = create<EstadoLeitor>((set) => ({
  aberto: false,
  opcoes: {},
  abrir: (opcoes = {}) => set({ aberto: true, opcoes }),
  fechar: () => set({ aberto: false, opcoes: {} }),
}))

/* ------------------------------------------------------------------ busca do código */

export type ResultadoCodigo =
  | { tipo: 'produto'; produto: Produto; serial?: string }
  | { tipo: 'equipamento'; equipamento: Equipamento }
  | { tipo: 'desconhecido' }

/** Procura um código lido em seriais, SKU e código do fabricante das peças e nos seriais dos equipamentos. */
export function localizarCodigo(codigo: string, produtos: Produto[], equipamentos: Equipamento[]): ResultadoCodigo {
  const c = codigo.trim().toUpperCase()
  if (!c) return { tipo: 'desconhecido' }
  const igual = (x: string) => x.toUpperCase() === c
  const contem = (x: string) => x.length >= 10 && c.includes(x.toUpperCase())

  for (const p of produtos) {
    const serial = p.seriais.find(igual)
    if (serial) return { tipo: 'produto', produto: p, serial }
  }
  const eq = equipamentos.find((e) => igual(e.serial))
  if (eq) return { tipo: 'equipamento', equipamento: eq }
  const porCodigo = produtos.find((p) => igual(p.sku) || igual(p.codigoFabricante))
  if (porCodigo) return { tipo: 'produto', produto: porCodigo }

  // QR com mais informação além do código (ex.: endereço + serial)
  for (const p of produtos) {
    const serial = p.seriais.find(contem)
    if (serial) return { tipo: 'produto', produto: p, serial }
    if (contem(p.sku) || contem(p.codigoFabricante)) return { tipo: 'produto', produto: p }
  }
  const eq2 = equipamentos.find((e) => contem(e.serial))
  if (eq2) return { tipo: 'equipamento', equipamento: eq2 }
  return { tipo: 'desconhecido' }
}

function decodificar(ctx: CanvasRenderingContext2D, w: number, h: number): string | null {
  const img = ctx.getImageData(0, 0, w, h)
  const r = jsQR(img.data, img.width, img.height, { inversionAttempts: 'attemptBoth' })
  return r?.data?.trim() || null
}

/** Lê o QR de um arquivo de imagem. Devolve null se não encontrar. */
export async function lerQRDeImagem(arquivo: File): Promise<string | null> {
  const url = URL.createObjectURL(arquivo)
  try {
    const img = await new Promise<HTMLImageElement>((ok, falha) => {
      const i = new Image()
      i.onload = () => ok(i)
      i.onerror = () => falha(new Error('imagem inválida'))
      i.src = url
    })
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    if (!ctx) return null
    // tenta em mais de um tamanho: QR pequeno em foto grande só aparece com mais resolução
    for (const lado of [900, 1500, 500]) {
      const esc = Math.min(1, lado / Math.max(img.width, img.height))
      canvas.width = Math.max(1, Math.round(img.width * esc))
      canvas.height = Math.max(1, Math.round(img.height * esc))
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      const lido = decodificar(ctx, canvas.width, canvas.height)
      if (lido) return lido
    }
    return null
  } catch {
    return null
  } finally {
    URL.revokeObjectURL(url)
  }
}

/* ------------------------------------------------------------------ modal */

/** Leitor de QR global. Montado uma vez no AppShell; abrir com `useLeitorQR().abrir()`. */
export function LeitorQR() {
  const aberto = useLeitorQR((s) => s.aberto)
  const opcoes = useLeitorQR((s) => s.opcoes)
  const fechar = useLeitorQR((s) => s.fechar)
  return (
    <Modal aberto={aberto} aoFechar={fechar} titulo={opcoes.titulo ?? 'Ler QR code'} largura="md">
      {aberto && <Conteudo opcoes={opcoes} fechar={fechar} />}
    </Modal>
  )
}

type Modo = 'camera' | 'foto' | 'simular'

function Conteudo({ opcoes, fechar }: { opcoes: OpcoesLeitorQR; fechar: () => void }) {
  const temCamera = typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia
  const [modo, setModo] = useState<Modo>(temCamera ? 'camera' : 'simular')
  const [codigo, setCodigo] = useState<string | null>(null)

  const receber = (c: string) => {
    const limpo = c.trim()
    if (!limpo) return
    if (opcoes.aoLer) { opcoes.aoLer(limpo); fechar(); return }
    setCodigo(limpo)
  }

  if (codigo) return <Resultado codigo={codigo} fechar={fechar} lerOutro={() => setCodigo(null)} />

  return (
    <div className="flex flex-col gap-4">
      <Abas
        ativa={modo} aoMudar={(id) => setModo(id as Modo)}
        abas={[{ id: 'camera', rotulo: 'Câmera' }, { id: 'foto', rotulo: 'Enviar foto' }, { id: 'simular', rotulo: 'Simular leitura' }]}
      />
      {modo === 'camera' && <ModoCamera aoLer={receber} irPara={setModo} />}
      {modo === 'foto' && <ModoFoto aoLer={receber} />}
      {modo === 'simular' && <ModoSimular aoLer={receber} />}
    </div>
  )
}

function ModoCamera({ aoLer, irPara }: { aoLer: (c: string) => void; irPara: (m: Modo) => void }) {
  const video = useRef<HTMLVideoElement>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [pronta, setPronta] = useState(false)
  const cb = useRef(aoLer)
  cb.current = aoLer

  useEffect(() => {
    if (!navigator.mediaDevices?.getUserMedia) { setErro('Este navegador não dá acesso à câmera.'); return }
    let vivo = true
    let stream: MediaStream | null = null
    let raf = 0
    let ultima = 0
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d', { willReadFrequently: true })

    const quadro = (agora: number) => {
      if (!vivo) return
      const v = video.current
      if (v && ctx && v.readyState >= 2 && v.videoWidth && agora - ultima > 140) {
        ultima = agora
        const esc = Math.min(1, 720 / Math.max(v.videoWidth, v.videoHeight))
        canvas.width = Math.round(v.videoWidth * esc)
        canvas.height = Math.round(v.videoHeight * esc)
        ctx.drawImage(v, 0, 0, canvas.width, canvas.height)
        const lido = decodificar(ctx, canvas.width, canvas.height)
        if (lido) { cb.current(lido); return }
      }
      raf = requestAnimationFrame(quadro)
    }

    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false })
      .then((s) => {
        if (!vivo) { s.getTracks().forEach((t) => t.stop()); return }
        stream = s
        if (video.current) {
          video.current.srcObject = s
          video.current.play().catch(() => { /* reprodução bloqueada: o usuário pode tocar no vídeo */ })
        }
        setPronta(true)
        raf = requestAnimationFrame(quadro)
      })
      .catch((e: { name?: string }) => {
        if (!vivo) return
        setErro(e?.name === 'NotAllowedError'
          ? 'O navegador bloqueou a câmera. Libere o acesso nas permissões do site e tente de novo.'
          : 'Nenhuma câmera encontrada neste aparelho.')
      })

    return () => {
      vivo = false
      cancelAnimationFrame(raf)
      stream?.getTracks().forEach((t) => t.stop())
    }
  }, [])

  if (erro) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-painel border border-linha bg-nevoa px-4 py-8 text-center">
        <Camera size={28} className="text-mata-suave" aria-hidden />
        <p className="max-w-xs text-sm text-mata-suave">{erro}</p>
        <div className="flex flex-wrap justify-center gap-2">
          <Button variante="secundario" onClick={() => irPara('foto')}>Enviar foto do QR</Button>
          <Button variante="secundario" onClick={() => irPara('simular')}>Simular leitura</Button>
        </div>
      </div>
    )
  }
  return (
    <div className="flex flex-col gap-2">
      <div className="relative aspect-[4/3] overflow-hidden rounded-painel bg-mata">
        <video ref={video} playsInline muted className="h-full w-full object-cover" />
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center" aria-hidden>
          <div className="relative h-[58%] aspect-square">
            {(['left-0 top-0 border-l-[3px] border-t-[3px] rounded-tl-lg', 'right-0 top-0 border-r-[3px] border-t-[3px] rounded-tr-lg',
              'left-0 bottom-0 border-l-[3px] border-b-[3px] rounded-bl-lg', 'right-0 bottom-0 border-r-[3px] border-b-[3px] rounded-br-lg'] as const)
              .map((c) => <span key={c} className={cx('absolute h-7 w-7 border-white', c)} />)}
          </div>
        </div>
        {!pronta && <p className="absolute inset-0 flex items-center justify-center text-sm text-white/80">Abrindo a câmera</p>}
      </div>
      <p className="text-sm text-mata-suave">Aponte para o QR da peça ou do drone. A leitura é automática.</p>
    </div>
  )
}

function ModoFoto({ aoLer }: { aoLer: (c: string) => void }) {
  const arquivo = useRef<HTMLInputElement>(null)
  const [lendo, setLendo] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  const escolher = async (f: File | undefined) => {
    if (!f) return
    setErro(null)
    setLendo(true)
    const lido = await lerQRDeImagem(f)
    setLendo(false)
    if (lido) aoLer(lido)
    else setErro('Não encontrei um QR nesta foto. Tire outra mais de perto, com o código inteiro e em foco.')
  }

  return (
    <div className="flex flex-col gap-3">
      <button
        type="button" onClick={() => arquivo.current?.click()} disabled={lendo}
        className="flex flex-col items-center gap-2 rounded-painel border border-dashed border-mata-suave/40 bg-nevoa px-4 py-10 text-center transition-colors hover:border-lavoura hover:bg-lavoura-claro/50"
      >
        <ImageUp size={28} className="text-mata-suave" aria-hidden />
        <span className="font-medium">{lendo ? 'Lendo a foto' : 'Escolher foto do QR'}</span>
        <span className="max-w-xs text-sm text-mata-suave">Serve foto tirada agora ou uma que já está na galeria, como as que chegam pelo WhatsApp.</span>
      </button>
      <input ref={arquivo} type="file" accept="image/*" hidden onChange={(e) => { void escolher(e.target.files?.[0]); e.target.value = '' }} />
      {erro && <p role="alert" className="text-sm text-barro">{erro}</p>}
    </div>
  )
}

function ModoSimular({ aoLer }: { aoLer: (c: string) => void }) {
  const produtos = useStore((s) => s.produtos)
  const equipamentos = useStore((s) => s.equipamentos)
  const clientes = useStore((s) => s.clientes)
  const [manual, setManual] = useState('')

  const exemplos = useMemo(() => {
    const lista: { codigo: string; titulo: string; detalhe: string }[] = []
    const comSerial = produtos.find((p) => p.seriais.length > 0)
    if (comSerial) lista.push({ codigo: comSerial.seriais[0], titulo: 'Serial de item em estoque', detalhe: comSerial.nome })
    const eq = equipamentos[0]
    if (eq) {
      const dono = clientes.find((c) => c.id === eq.clienteId)?.nome
      lista.push({ codigo: eq.serial, titulo: 'Drone de cliente', detalhe: `${nomeModelo(eq.modeloId)}${dono ? `, ${dono}` : ''}` })
    }
    const peca = produtos.find((p) => p.grupo === 'helice') ?? produtos.find((p) => p.tipo === 'peca')
    if (peca) lista.push({ codigo: peca.sku, titulo: 'Etiqueta de peça', detalhe: peca.nome })
    lista.push({ codigo: '5YHTK3C000NV27', titulo: 'Código ainda não cadastrado', detalhe: 'Peça nova chegando do fornecedor' })
    return lista
  }, [produtos, equipamentos, clientes])

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-mata-suave">Sem câmera por perto? Escolha um código de exemplo para ver o que acontece depois da leitura.</p>
      <ul className="flex flex-col gap-2">
        {exemplos.map((ex) => (
          <li key={ex.codigo}>
            <button
              type="button" onClick={() => aoLer(ex.codigo)}
              className="flex w-full items-center gap-3 rounded-painel border border-linha bg-papel px-3 py-2.5 text-left transition-colors hover:border-lavoura hover:bg-lavoura-claro/40"
            >
              <ScanLine size={20} className="shrink-0 text-mata-suave" aria-hidden />
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium">{ex.titulo}</span>
                <span className="block truncate text-xs text-mata-suave">{ex.detalhe}</span>
              </span>
              <span className="serial hidden shrink-0 text-xs text-mata-suave sm:block">{ex.codigo}</span>
            </button>
          </li>
        ))}
      </ul>
      <form className="flex items-end gap-2" onSubmit={(e) => { e.preventDefault(); aoLer(manual) }}>
        <label className="flex flex-1 flex-col gap-1.5 text-sm font-medium">
          Ou digite o código
          <Input value={manual} onChange={(e) => setManual(e.target.value)} placeholder="Serial, SKU ou código do fabricante" className="serial" />
        </label>
        <Button type="submit" variante="secundario" disabled={!manual.trim()}>Buscar</Button>
      </form>
    </div>
  )
}

/* ------------------------------------------------------------------ resultado */

function Resultado({ codigo, fechar, lerOutro }: { codigo: string; fechar: () => void; lerOutro: () => void }) {
  const produtos = useStore((s) => s.produtos)
  const equipamentos = useStore((s) => s.equipamentos)
  const navegar = useNavigate()
  const r = useMemo(() => localizarCodigo(codigo, produtos, equipamentos), [codigo, produtos, equipamentos])
  const ir = (para: string) => { fechar(); navegar(para) }

  return (
    <div className="anim-entrar flex flex-col gap-4">
      <p className="text-sm text-mata-suave">Código lido: <span className="serial text-mata">{codigo}</span></p>

      {r.tipo === 'produto' && <ResultadoProduto produto={r.produto} serial={r.serial} ir={ir} />}
      {r.tipo === 'equipamento' && <ResultadoEquipamento equipamento={r.equipamento} ir={ir} />}
      {r.tipo === 'desconhecido' && (
        <div className="flex flex-col items-start gap-3 rounded-painel border border-linha bg-nevoa p-4">
          <div>
            <p className="font-medium">Código não cadastrado</p>
            <p className="mt-1 text-sm text-mata-suave">Nenhuma peça ou drone usa este código. Se for uma peça nova, cadastre agora e o código já vai preenchido.</p>
          </div>
          <Button icone={<PackagePlus size={16} aria-hidden />} onClick={() => ir(`/estoque?novo=${encodeURIComponent(codigo)}`)}>
            Cadastrar peça com este código
          </Button>
        </div>
      )}

      <div className="flex justify-between gap-2 border-t border-linha pt-3">
        <Button variante="fantasma" icone={<RotateCcw size={16} aria-hidden />} onClick={lerOutro}>Ler outro código</Button>
        <Button variante="secundario" onClick={fechar}>Fechar</Button>
      </div>
    </div>
  )
}

function ResultadoProduto({ produto, serial, ir }: { produto: Produto; serial?: string; ir: (para: string) => void }) {
  const movimentarEstoque = useStore((s) => s.movimentarEstoque)
  const [mov, setMov] = useState<'entrada' | 'saida' | null>(null)
  const [qtd, setQtd] = useState(1)

  const zerado = produto.estoque <= 0
  const baixo = !zerado && produto.estoque <= produto.estoqueMinimo
  const maximo = mov === 'saida' ? produto.estoque : 9999

  const confirmar = () => {
    if (!mov) return
    if (mov === 'saida' && qtd > produto.estoque) { toast.erro(`Só há ${numero(produto.estoque)} em estoque.`); return }
    movimentarEstoque({ produtoId: produto.id, tipo: mov, quantidade: qtd, origem: 'Leitura de QR' })
    toast.sucesso(mov === 'entrada' ? `Entrada de ${numero(qtd)} un. registrada` : `Saída de ${numero(qtd)} un. registrada`)
    setMov(null)
    setQtd(1)
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-painel border border-linha p-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="titulo text-lg leading-snug">{produto.nome}</p>
            <p className="serial mt-0.5 text-xs text-mata-suave">{produto.sku}{serial ? `, serial ${serial}` : ''}</p>
          </div>
          <Selo cor={zerado ? 'vermelho' : baixo ? 'ambar' : 'verde'}>
            {zerado ? 'Sem estoque' : `${numero(produto.estoque)} em estoque`}
          </Selo>
        </div>
        <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
          <div>
            <dt className="text-xs text-mata-suave">Onde está</dt>
            <dd className="flex items-center gap-1"><MapPin size={14} className="text-mata-suave" aria-hidden />{produto.localizacao}</dd>
          </div>
          <div>
            <dt className="text-xs text-mata-suave">Preço de venda</dt>
            <dd className="num">{brl(produto.preco)}</dd>
          </div>
          <div className="col-span-2">
            <dt className="mb-1 text-xs text-mata-suave">Serve em</dt>
            <dd><ChipsModelos ids={produto.modelosCompativeis} /></dd>
          </div>
        </dl>
        {baixo && <p className="mt-3 text-xs text-[#7A5600]">Abaixo do mínimo de {numero(produto.estoqueMinimo)} un.</p>}
      </div>

      {mov ? (
        <div className="anim-entrar flex flex-col gap-3 rounded-painel border border-linha bg-nevoa p-4">
          <p className="text-sm font-medium">{mov === 'entrada' ? 'Quantas unidades entraram?' : 'Quantas unidades saíram?'}</p>
          <div className="flex items-center gap-2">
            <Button variante="secundario" aria-label="Diminuir" className="w-10 px-0" onClick={() => setQtd((q) => Math.max(1, q - 1))}><Minus size={16} aria-hidden /></Button>
            <Input
              type="number" inputMode="numeric" min={1} max={maximo} value={qtd} aria-label="Quantidade"
              onChange={(e) => setQtd(Math.max(1, Math.min(maximo || 1, Math.round(Number(e.target.value) || 1))))}
              className="num w-20 text-center"
            />
            <Button variante="secundario" aria-label="Aumentar" className="w-10 px-0" onClick={() => setQtd((q) => Math.min(maximo || 1, q + 1))}><Plus size={16} aria-hidden /></Button>
            <div className="flex-1" />
            <Button variante="fantasma" onClick={() => { setMov(null); setQtd(1) }}>Cancelar</Button>
            <Button onClick={confirmar}>{mov === 'entrada' ? 'Dar entrada' : 'Dar saída'}</Button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          <Button variante="secundario" icone={<ArrowDownToLine size={16} aria-hidden />} onClick={() => setMov('entrada')}>Dar entrada</Button>
          <Button variante="secundario" icone={<ArrowUpFromLine size={16} aria-hidden />} disabled={zerado} onClick={() => setMov('saida')}>Dar saída</Button>
          <Button className="col-span-2" icone={<FilePlus2 size={16} aria-hidden />} onClick={() => ir(`/orcamentos/novo?add=${encodeURIComponent(produto.id)}`)}>
            Adicionar a um orçamento
          </Button>
          <Button className="col-span-2" variante="fantasma" onClick={() => ir(`/estoque/${produto.id}`)}>Ver peça</Button>
        </div>
      )}
    </div>
  )
}

function ResultadoEquipamento({ equipamento, ir }: { equipamento: Equipamento; ir: (para: string) => void }) {
  const cliente = useStore((s) => s.clientes.find((c) => c.id === equipamento.clienteId))
  const abertas = useStore((s) => s.ordens.filter((o) => o.equipamentoId === equipamento.id && o.status !== 'entregue').length)
  const total = useStore((s) => s.ordens.filter((o) => o.equipamentoId === equipamento.id).length)

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-painel border border-linha p-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="titulo text-lg leading-snug">DJI Agras {nomeModelo(equipamento.modeloId)}{equipamento.apelido ? ` (${equipamento.apelido})` : ''}</p>
            <p className="serial mt-0.5 text-xs text-mata-suave">serial {equipamento.serial}</p>
          </div>
          {abertas > 0 && <Selo cor="azul">{abertas === 1 ? 'Na oficina' : `${abertas} ordens abertas`}</Selo>}
        </div>
        <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
          <div className="col-span-2">
            <dt className="text-xs text-mata-suave">Cliente</dt>
            <dd>{cliente ? `${cliente.nome}, ${cliente.cidade} - ${cliente.uf}` : 'Sem cliente vinculado'}</dd>
          </div>
          <div>
            <dt className="text-xs text-mata-suave">Horas de voo</dt>
            <dd className="num">{numero(equipamento.horasVoo)} h</dd>
          </div>
          <div>
            <dt className="text-xs text-mata-suave">Passagens pela oficina</dt>
            <dd className="num">{numero(total)}</dd>
          </div>
        </dl>
      </div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <Button icone={<Wrench size={16} aria-hidden />} onClick={() => ir(`/os?novo=${encodeURIComponent(equipamento.id)}`)}>Abrir ordem de serviço</Button>
        <Button variante="secundario" icone={<User size={16} aria-hidden />} disabled={!cliente} onClick={() => cliente && ir(`/clientes/${cliente.id}`)}>Ver cliente</Button>
      </div>
    </div>
  )
}
