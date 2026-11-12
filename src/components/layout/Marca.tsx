import type { CSSProperties } from 'react'
import { cx } from '@/components/ui'

const BASE = import.meta.env.BASE_URL
const LOGO = `${BASE}marca/logo.png`
const SIMBOLO = `${BASE}marca/simbolo.png`
const NOME = 'Aerobrasil Drones'

/** Imagem preta com fundo transparente pintada na cor do texto (currentColor) por máscara. */
function Mascara({ url, className, style, rotulo }: { url: string; className?: string; style?: CSSProperties; rotulo?: string }) {
  return (
    <span
      role={rotulo ? 'img' : undefined} aria-label={rotulo} aria-hidden={rotulo ? undefined : true}
      className={cx('inline-block shrink-0', className)}
      style={{
        backgroundColor: 'currentColor',
        WebkitMaskImage: `url(${url})`, maskImage: `url(${url})`,
        WebkitMaskRepeat: 'no-repeat', maskRepeat: 'no-repeat',
        WebkitMaskPosition: 'center', maskPosition: 'center',
        WebkitMaskSize: 'contain', maskSize: 'contain',
        WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact',
        ...style,
      }}
    />
  )
}

/** Só o símbolo, na cor do texto ao redor. */
export function SimboloMarca({ tamanho = 30, className, rotulo }: { tamanho?: number; className?: string; rotulo?: string }) {
  return <Mascara url={SIMBOLO} className={className} style={{ width: tamanho, height: tamanho }} rotulo={rotulo} />
}

/** Logo completa na cor do texto ao redor (`clara` = branca, para a barra escura). */
export function Marca({ clara, largura = 150, className }: { clara?: boolean; largura?: number; className?: string }) {
  return (
    <Mascara
      url={LOGO} rotulo={NOME}
      className={cx(clara ? 'text-white' : 'text-mata', className)}
      style={{ width: largura, aspectRatio: '1200 / 726' }}
    />
  )
}

/** Versão do cabeçalho do celular: símbolo e nome. */
export function MarcaCompacta({ className }: { className?: string }) {
  return (
    <span className={cx('inline-flex items-center gap-1 text-mata', className)} role="img" aria-label={NOME}>
      <SimboloMarca tamanho={36} />
      <span aria-hidden className="titulo text-[17px] tracking-tight" style={{ fontStretch: '118%' }}>Aerobrasil</span>
    </span>
  )
}

/** Logo em <img> (preta): para documentos impressos, onde fundo e máscara podem ser descartados. */
export function LogoDocumento({ altura = 56, className }: { altura?: number; className?: string }) {
  return <img src={LOGO} alt={NOME} style={{ height: altura, width: 'auto' }} className={cx('block', className)} />
}
