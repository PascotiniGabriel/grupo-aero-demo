import type { Local } from '../types'

type Ponto = { lat: number; lng: number }

/** Base da empresa (Barra da Estiva - BA, coordenada aproximada da cidade). */
export const BASE_EMPRESA: Local = {
  lat: -13.6236, lng: -41.3256, descricao: 'Base Grupo AERO, Barra da Estiva - BA', origem: 'cadastro',
}

export interface ResultadoLocal {
  ok: boolean
  lat?: number
  lng?: number
  fonte: 'google' | 'waze' | 'osm' | 'decimal' | 'dms' | 'link_curto' | 'nenhuma'
  /** Nome do lugar, quando a mensagem do WhatsApp traz um. */
  descricao?: string
  /** Link encontrado na mensagem (guardado mesmo quando não dá para ler as coordenadas). */
  link?: string
  mensagem?: string
}

const valido = (lat: number, lng: number) =>
  Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180 && !(lat === 0 && lng === 0)

const num = (s: string) => parseFloat(s.replace(',', '.'))

function dePar(a: string, b: string): Ponto | null {
  const lat = num(a), lng = num(b)
  return valido(lat, lng) ? { lat, lng } : null
}

const NUM = '(-?\\d{1,3}(?:[.,]\\d+)?)'
const PAR = `${NUM}\\s*[,;]?\\s*${NUM}`

/** Coordenadas dentro de uma URL (já decodificada). */
function dePonto(url: string): { p: Ponto; fonte: ResultadoLocal['fonte'] } | null {
  const u = decodeURIComponent(url.replace(/\+/g, ' '))
  const host = /waze\.com/i.test(u) ? 'waze' : /openstreetmap\.org/i.test(u) ? 'osm' : 'google'
  const tentativas: RegExp[] = [
    /!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/,
    /@(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)/,
    /[?&](?:q|query|ll|destination|daddr|center|sll|viewpoint)=(?:loc:)?(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)/i,
    /[?&]to=ll\.(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)/i,
    /[?&]mlat=(-?\d+(?:\.\d+)?)&mlon=(-?\d+(?:\.\d+)?)/i,
    /#map=\d+\/(-?\d+(?:\.\d+)?)\/(-?\d+(?:\.\d+)?)/,
  ]
  for (const re of tentativas) {
    const m = u.match(re)
    if (m) { const p = dePar(m[1], m[2]); if (p) return { p, fonte: host } }
  }
  return null
}

function deDMS(texto: string): Ponto | null {
  const re = /(\d{1,3})\s*[°º]\s*(\d{1,2})\s*['′’]\s*(\d{1,2}(?:[.,]\d+)?)\s*(?:["″”]|'')?\s*([NSLEOW])\b/gi
  const achados: { letra: string; valor: number }[] = []
  let m: RegExpExecArray | null
  while ((m = re.exec(texto))) {
    const v = num(m[1]) + num(m[2]) / 60 + num(m[3]) / 3600
    const letra = m[4].toUpperCase()
    achados.push({ letra, valor: letra === 'S' || letra === 'W' || letra === 'O' ? -v : v })
  }
  const lat = achados.find((a) => a.letra === 'N' || a.letra === 'S')
  const lng = achados.find((a) => a.letra !== 'N' && a.letra !== 'S')
  if (!lat || !lng) return null
  return valido(lat.valor, lng.valor) ? { lat: lat.valor, lng: lng.valor } : null
}

function deDecimal(texto: string): Ponto | null {
  // Só números com parte decimal, para não confundir com telefone, data ou hora.
  const re = new RegExp(`${NUM.replace('(?:[.,]\\d+)?', '[.,]\\d+')}`, 'g')
  const toks = texto.match(re)
  if (!toks || toks.length < 2) return null
  return dePar(toks[0], toks[1])
}

/** Nome do lugar numa mensagem de localização compartilhada (primeira linha de texto que não é link nem coordenada). */
function descricaoDe(texto: string): string | undefined {
  const linhas = texto.split(/\r?\n/).map((l) => l.replace(/^[\s📍*_~-]+|[\s*_~]+$/gu, '').trim()).filter(Boolean)
  for (const l of linhas) {
    if (/https?:\/\/|goo\.gl|waze\.com/i.test(l)) {
      const resto = l.replace(/(https?:\/\/|maps\.app\.goo\.gl|goo\.gl\/maps)\S*/gi, '').replace(/^(localiza[cç][aã]o|local|link|ver no mapa)\s*:?\s*/i, '').trim()
      if (resto.length > 2 && !/^\W*$/.test(resto)) return resto.slice(0, 80)
      continue
    }
    if (/^-?\d{1,3}[.,]\d+\s*[,;\s]\s*-?\d{1,3}[.,]\d+$/.test(l)) continue
    if (/^\d{1,3}\s*[°º]/.test(l)) continue
    if (/^(localiza[cç][aã]o( ao vivo| compartilhada| atual)?|minha localiza[cç][aã]o|aqui|segue|ó|olha)\s*:?$/i.test(l)) continue
    const sem = l.replace(/^(localiza[cç][aã]o|local)\s*:\s*/i, '').trim()
    if (sem.length > 2) return sem.slice(0, 80)
  }
  return undefined
}

/**
 * Lê a localização que o cliente mandou: link do Google Maps/Waze/OpenStreetMap, coordenadas decimais,
 * graus-minutos-segundos ou mensagem de localização compartilhada do WhatsApp. Funciona offline.
 */
export function interpretarLocalizacao(texto: string): ResultadoLocal {
  const t = (texto ?? '').trim()
  if (!t) return { ok: false, fonte: 'nenhuma', mensagem: 'Cole aqui a localização que o cliente mandou pelo WhatsApp.' }

  const urls = t.match(/(?:https?:\/\/|(?:maps\.app\.)?goo\.gl\/|maps\.app\.goo\.gl\/)[^\s<>"']+/gi) ?? []
  let curto: string | undefined
  for (const url of urls) {
    const r = dePonto(url)
    if (r) return { ok: true, lat: r.p.lat, lng: r.p.lng, fonte: r.fonte, descricao: descricaoDe(t), link: url }
    if (/maps\.app\.goo\.gl|goo\.gl\/maps|g\.co\/kgs/i.test(url)) curto = curto ?? url
  }
  const sobra = t.replace(/https?:\/\/\S+/gi, ' ')
  const dms = deDMS(sobra)
  if (dms) return { ok: true, ...dms, fonte: 'dms', descricao: descricaoDe(t) }
  const dec = deDecimal(sobra)
  if (dec) return { ok: true, ...dec, fonte: 'decimal', descricao: descricaoDe(t) }
  if (curto) {
    return {
      ok: false, fonte: 'link_curto', link: curto,
      mensagem: 'Esse é um link encurtado do Google Maps e não dá para ler sem internet. Abra o link, copie as coordenadas (aparecem ao tocar no ponto) e cole aqui.',
    }
  }
  return { ok: false, fonte: 'nenhuma', mensagem: 'Não encontrei coordenadas. Cole o link do mapa ou coordenadas como -13.6213, -41.3305.' }
}

export const linkGoogleMaps = (l: Ponto) => `https://www.google.com/maps/search/?api=1&query=${l.lat},${l.lng}`
export const linkWaze = (l: Ponto) => `https://waze.com/ul?ll=${l.lat},${l.lng}&navigate=yes`
export const linkRotaGoogle = (l: Ponto) => `https://www.google.com/maps/dir/?api=1&destination=${l.lat},${l.lng}&travelmode=driving&dir_action=navigate`

/** "-13.62130, -41.33050" */
export const formatarDecimal = (l: Ponto) => `${l.lat.toFixed(5)}, ${l.lng.toFixed(5)}`

/** `13°37'16.7"S 41°19'49.8"W` */
export function formatarDMS(l: Ponto): string {
  const um = (v: number, pos: string, neg: string) => {
    const a = Math.abs(v)
    let g = Math.floor(a)
    let m = Math.floor((a - g) * 60)
    let s = Math.round(((a - g) * 60 - m) * 600) / 10
    if (s >= 60) { s = 0; m += 1 }
    if (m >= 60) { m = 0; g += 1 }
    return `${g}°${m}'${s.toFixed(1)}"${v >= 0 ? pos : neg}`
  }
  return `${um(l.lat, 'N', 'S')} ${um(l.lng, 'L', 'W')}`
}

/** Distância em linha reta (haversine), em km. */
export function distanciaKm(a: Ponto, b: Ponto): number {
  const R = 6371
  const rad = (x: number) => (x * Math.PI) / 180
  const dLat = rad(b.lat - a.lat), dLng = rad(b.lng - a.lng)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}

export function textoDistancia(l: Ponto): string {
  const km = distanciaKm(BASE_EMPRESA, l)
  return `~ ${km < 10 ? km.toFixed(1).replace('.', ',') : Math.round(km).toLocaleString('pt-BR')} km em linha reta da base`
}

/** Texto para enviar ao técnico/cliente por WhatsApp. */
export function textoCompartilhar(l: Local, titulo?: string): string {
  return [
    titulo ?? l.descricao,
    l.referencia,
    formatarDecimal(l),
    `Google Maps: ${linkGoogleMaps(l)}`,
    `Waze: ${linkWaze(l)}`,
  ].filter(Boolean).join('\n')
}
