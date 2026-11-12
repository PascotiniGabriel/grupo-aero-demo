import { useEffect, useState } from 'react'
import { Copy, Crosshair, MapPin, MapPinOff, Navigation, Send, Map as MapaIcone } from 'lucide-react'
import type { Local } from '@/types'
import { Button, Campo, Input, Textarea, Painel, Selo, Select, cx, toast } from '@/components/ui'
import {
  formatarDMS, formatarDecimal, interpretarLocalizacao, linkGoogleMaps, linkWaze, textoCompartilhar, textoDistancia,
  type ResultadoLocal,
} from '@/lib/local'

const LINK_BASE = 'inline-flex h-12 flex-1 min-w-[150px] items-center justify-center gap-2 rounded-campo border px-4 text-sm font-medium transition-colors select-none'

/** Botões grandes: Waze, Google Maps, copiar coordenadas e enviar localização. */
export function BotoesLocal({ local, titulo, compacto }: { local: Local; titulo?: string; compacto?: boolean }) {
  const copiar = async () => {
    try { await navigator.clipboard.writeText(formatarDecimal(local)); toast.sucesso('Coordenadas copiadas') }
    catch { toast.info(`Coordenadas: ${formatarDecimal(local)}`) }
  }
  const enviar = async () => {
    const texto = textoCompartilhar(local, titulo)
    if (typeof navigator.share === 'function') {
      try { await navigator.share({ title: titulo ?? local.descricao, text: texto }); return } catch { /* cancelado: cai no WhatsApp */ }
    }
    window.open(`https://wa.me/?text=${encodeURIComponent(texto)}`, '_blank', 'noopener')
  }
  const alt = compacto ? 'h-11' : ''
  return (
    <div className="flex flex-wrap gap-2">
      <a href={linkWaze(local)} target="_blank" rel="noopener noreferrer" className={cx(LINK_BASE, alt, 'border-transparent bg-lavoura text-white hover:bg-lavoura-escuro')}>
        <Navigation size={18} aria-hidden />Abrir no Waze
      </a>
      <a href={linkGoogleMaps(local)} target="_blank" rel="noopener noreferrer" className={cx(LINK_BASE, alt, 'border-linha bg-papel text-mata hover:bg-nevoa')}>
        <MapaIcone size={18} aria-hidden />Abrir no Google Maps
      </a>
      <button type="button" onClick={copiar} className={cx(LINK_BASE, alt, 'border-linha bg-papel text-mata hover:bg-nevoa')}>
        <Copy size={18} aria-hidden />Copiar coordenadas
      </button>
      <button type="button" onClick={enviar} className={cx(LINK_BASE, alt, 'border-linha bg-papel text-mata hover:bg-nevoa')}>
        <Send size={18} aria-hidden />Enviar localização
      </button>
    </div>
  )
}

function useOnline() {
  const [on, setOn] = useState(() => (typeof navigator === 'undefined' ? true : navigator.onLine))
  useEffect(() => {
    const a = () => setOn(true), b = () => setOn(false)
    window.addEventListener('online', a); window.addEventListener('offline', b)
    return () => { window.removeEventListener('online', a); window.removeEventListener('offline', b) }
  }, [])
  return on
}

/** Pré-visualização OpenStreetMap, só com internet. */
export function MapaPrevia({ local, altura = 180 }: { local: Local; altura?: number }) {
  const online = useOnline()
  if (!online) {
    return (
      <div style={{ height: altura }} className="flex flex-col items-center justify-center gap-1 rounded-campo border border-dashed border-linha bg-nevoa px-4 text-center text-sm text-mata-suave">
        <MapPinOff size={22} aria-hidden />
        <p>Mapa indisponível sem internet. As coordenadas e os botões funcionam.</p>
      </div>
    )
  }
  const d = 0.012
  const bbox = `${local.lng - d},${local.lat - d},${local.lng + d},${local.lat + d}`
  const src = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${local.lat},${local.lng}`
  return <iframe title={`Mapa de ${local.descricao}`} src={src} loading="lazy" style={{ height: altura }} className="w-full rounded-campo border border-linha" />
}

/** Dados do local: descrição, referência, coordenadas (decimal e GMS), distância da base. */
export function DadosLocal({ local }: { local: Local }) {
  return (
    <div className="space-y-1.5 text-sm">
      <p className="font-medium">{local.descricao}</p>
      {local.referencia && <p className="flex gap-1.5 text-mata-suave"><MapPin size={16} className="mt-0.5 shrink-0" aria-hidden />{local.referencia}</p>}
      <p className="serial text-sm">{formatarDecimal(local)}</p>
      <p className="serial text-xs text-mata-suave">{formatarDMS(local)}</p>
      <p className="text-xs text-mata-suave">{textoDistancia(local)}</p>
    </div>
  )
}

/** Cartão "Local do atendimento" do detalhe da OS e dos compromissos. */
export function CartaoLocal({ local, titulo = 'Local do atendimento', acoes, aoEditar, semMapa }: {
  local?: Local; titulo?: string; acoes?: React.ReactNode; aoEditar?: () => void; semMapa?: boolean
}) {
  return (
    <Painel titulo={titulo} acoes={<>{acoes}{aoEditar && <Button tamanho="sm" variante="secundario" onClick={aoEditar}>{local ? 'Editar local' : 'Definir local'}</Button>}</>}>
      {local ? (
        <div className="space-y-3">
          <div className="grid gap-3 md:grid-cols-[1fr_1fr]">
            <DadosLocal local={local} />
            {!semMapa && <MapaPrevia local={local} />}
          </div>
          <BotoesLocal local={local} />
        </div>
      ) : (
        <p className="text-sm text-mata-suave">Nenhum local definido. Cole a localização que o cliente mandou pelo WhatsApp.</p>
      )}
    </Painel>
  )
}

/**
 * Editor de local: colar do WhatsApp (com confirmação), escolher um dos locais do cliente,
 * usar a localização atual e ajustar descrição e referência.
 */
export function EditorLocal({ valor, aoMudar, locaisCliente = [] }: {
  valor?: Local; aoMudar: (l: Local | undefined) => void; locaisCliente?: Local[]
}) {
  const [colado, setColado] = useState('')
  const [res, setRes] = useState<ResultadoLocal | null>(null)
  const [buscando, setBuscando] = useState(false)

  const interpretar = (t: string) => { setColado(t); setRes(t.trim() ? interpretarLocalizacao(t) : null) }
  const confirmar = () => {
    if (!res?.ok || res.lat === undefined || res.lng === undefined) return
    aoMudar({
      lat: res.lat, lng: res.lng, descricao: res.descricao ?? valor?.descricao ?? 'Local informado pelo cliente',
      referencia: valor?.referencia, origem: 'whatsapp', atualizadoEm: new Date().toISOString(),
    })
    setColado(''); setRes(null); toast.sucesso('Localização registrada')
  }
  const usarAtual = () => {
    if (!navigator.geolocation) { toast.erro('Este aparelho não informa a localização.'); return }
    setBuscando(true)
    navigator.geolocation.getCurrentPosition(
      (p) => {
        setBuscando(false)
        aoMudar({
          lat: +p.coords.latitude.toFixed(6), lng: +p.coords.longitude.toFixed(6),
          descricao: valor?.descricao || 'Ponto registrado pelo técnico', referencia: valor?.referencia,
          origem: 'tecnico', atualizadoEm: new Date().toISOString(),
        })
        toast.sucesso('Localização atual registrada')
      },
      () => { setBuscando(false); toast.erro('Não consegui pegar a localização. Verifique a permissão do navegador.') },
      { enableHighAccuracy: true, timeout: 20000 },
    )
  }

  return (
    <div className="space-y-4">
      {locaisCliente.length > 0 && (
        <Campo rotulo="Locais cadastrados do cliente">
          <Select
            value="" aria-label="Escolher um local do cliente"
            onChange={(e) => { const l = locaisCliente[Number(e.target.value)]; if (l) aoMudar({ ...l }) }}
          >
            <option value="">Escolher um local do cliente</option>
            {locaisCliente.map((l, i) => <option key={i} value={i}>{l.descricao}</option>)}
          </Select>
        </Campo>
      )}

      <Campo rotulo="Colar localização do WhatsApp" ajuda="Aceita link do Google Maps ou Waze, coordenadas (-13.6213, -41.3305) e graus-minutos-segundos.">
        <Textarea rows={3} value={colado} onChange={(e) => interpretar(e.target.value)} placeholder="Cole aqui a mensagem do cliente" />
      </Campo>
      {res && (
        <div role="status" className={cx('rounded-campo border p-3 text-sm', res.ok ? 'border-lavoura/40 bg-lavoura-claro' : 'border-ambar/50 bg-ambar-claro')}>
          {res.ok && res.lat !== undefined && res.lng !== undefined ? (
            <div className="space-y-2">
              <p className="font-medium">Encontrei este ponto{res.descricao ? `: ${res.descricao}` : ''}</p>
              <p className="serial">{formatarDecimal({ lat: res.lat, lng: res.lng })}</p>
              <p className="serial text-xs">{formatarDMS({ lat: res.lat, lng: res.lng })} · {textoDistancia({ lat: res.lat, lng: res.lng })}</p>
              <Button tamanho="sm" onClick={confirmar}>Usar esta localização</Button>
            </div>
          ) : (
            <div className="space-y-1">
              <p>{res.mensagem}</p>
              {res.link && <a className="break-all text-ceu hover:underline" href={res.link} target="_blank" rel="noopener noreferrer">{res.link}</a>}
            </div>
          )}
        </div>
      )}

      <Button variante="secundario" bloco icone={<Crosshair size={18} />} loading={buscando} onClick={usarAtual}>Usar minha localização atual</Button>

      {valor && (
        <div className="space-y-3 rounded-painel border border-linha p-3">
          <div className="flex flex-wrap items-center gap-2">
            <Selo cor="verde">Local definido</Selo>
            <span className="serial text-xs">{formatarDecimal(valor)}</span>
            <Button tamanho="sm" variante="fantasma" className="ml-auto" onClick={() => aoMudar(undefined)}>Limpar</Button>
          </div>
          <Campo rotulo="Descrição"><Input value={valor.descricao} onChange={(e) => aoMudar({ ...valor, descricao: e.target.value })} /></Campo>
          <Campo rotulo="Referência para chegar">
            <Input value={valor.referencia ?? ''} onChange={(e) => aoMudar({ ...valor, referencia: e.target.value })} placeholder="Ex.: depois da porteira azul, 3 km de estrada de chão" />
          </Campo>
        </div>
      )}
    </div>
  )
}
