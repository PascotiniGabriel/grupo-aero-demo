import type { FotoOS } from '@/types'

const FUNDO: Record<FotoOS['fase'], { bg: string; fg: string }> = {
  chegada: { bg: '#E4F0FA', fg: '#1E78C8' },
  dano: { bg: '#FBE7E4', fg: '#C8402F' },
  saida: { bg: '#E3F3EA', fg: '#1F8A4C' },
}

function esc(t: string) {
  return t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

/** Foto fictícia 4:3 (data URI SVG) para dados de demonstração. */
export function fotoPlaceholder(legenda: string, fase: FotoOS['fase']): string {
  const { bg, fg } = FUNDO[fase]
  const rotulo = fase === 'chegada' ? 'Chegada' : fase === 'dano' ? 'Dano' : 'Saída'
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="480" viewBox="0 0 640 480">` +
    `<rect width="640" height="480" fill="${bg}"/>` +
    `<g fill="none" stroke="${fg}" stroke-width="6" stroke-linecap="round" stroke-linejoin="round" opacity=".85">` +
    `<rect x="260" y="170" width="120" height="84" rx="12"/><circle cx="320" cy="212" r="24"/><path d="M290 170l8-16h44l8 16"/></g>` +
    `<text x="320" y="310" text-anchor="middle" font-family="Archivo, Arial, sans-serif" font-size="22" fill="${fg}" font-weight="600">${rotulo}</text>` +
    `<text x="320" y="345" text-anchor="middle" font-family="Archivo, Arial, sans-serif" font-size="20" fill="#4B5F56">${esc(legenda.slice(0, 48))}</text>` +
    `</svg>`
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
}

/** Reduz uma imagem enviada pelo usuário (canvas → JPEG dataURL, qualidade 0.8). */
export function reduzirImagem(file: File, maxLado = 1100): Promise<string> {
  return new Promise((resolve, reject) => {
    const leitor = new FileReader()
    leitor.onerror = () => reject(new Error('Não foi possível ler a imagem.'))
    leitor.onload = () => {
      const img = new Image()
      img.onerror = () => reject(new Error('Arquivo de imagem inválido.'))
      img.onload = () => {
        const escala = Math.min(1, maxLado / Math.max(img.width, img.height))
        const canvas = document.createElement('canvas')
        canvas.width = Math.round(img.width * escala)
        canvas.height = Math.round(img.height * escala)
        const ctx = canvas.getContext('2d')
        if (!ctx) return reject(new Error('Canvas indisponível.'))
        ctx.fillStyle = '#fff'
        ctx.fillRect(0, 0, canvas.width, canvas.height)
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
        resolve(canvas.toDataURL('image/jpeg', 0.8))
      }
      img.src = String(leitor.result)
    }
    leitor.readAsDataURL(file)
  })
}
