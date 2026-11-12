import { useEffect, useState } from 'react'
import QRCode from 'qrcode'
import { cx } from '@/components/ui'

/** Etiqueta com QR de um texto (SKU, serial) e legenda. Pode ser impressa. */
export function EtiquetaQR({ texto, legenda, sublegenda, tamanho = 132, className }: {
  texto: string; legenda?: string; sublegenda?: string; tamanho?: number; className?: string
}) {
  const [url, setUrl] = useState('')

  useEffect(() => {
    let vivo = true
    QRCode.toDataURL(texto || ' ', { margin: 1, width: tamanho * 3, errorCorrectionLevel: 'M', color: { dark: '#10231C', light: '#FFFFFF' } })
      .then((u) => { if (vivo) setUrl(u) })
      .catch(() => { if (vivo) setUrl('') })
    return () => { vivo = false }
  }, [texto, tamanho])

  return (
    <figure className={cx('folha-claro inline-flex flex-col items-center gap-1.5 rounded-painel border border-linha bg-white p-3 text-center', className)} style={{ width: tamanho + 26 }}>
      {url
        ? <img src={url} alt={`QR code de ${texto}`} width={tamanho} height={tamanho} className="block" />
        : <div style={{ width: tamanho, height: tamanho }} className="bg-nevoa" aria-hidden />}
      <figcaption className="w-full">
        {legenda && <p className="truncate text-xs font-semibold leading-tight text-mata" title={legenda}>{legenda}</p>}
        <p className="serial truncate text-[11px] leading-tight text-mata-suave">{sublegenda ?? texto}</p>
      </figcaption>
    </figure>
  )
}
