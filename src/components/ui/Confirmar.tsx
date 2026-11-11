import type { ReactNode } from 'react'
import { Button } from './Button'
import { Modal } from './Modal'

export function Confirmar({ aberto, titulo, texto, rotuloConfirmar = 'Confirmar', perigo, aoConfirmar, aoCancelar }: {
  aberto: boolean; titulo: string; texto?: ReactNode; rotuloConfirmar?: string; perigo?: boolean
  aoConfirmar: () => void; aoCancelar: () => void
}) {
  return (
    <Modal
      aberto={aberto} aoFechar={aoCancelar} titulo={titulo} largura="sm"
      rodape={<>
        <Button variante="secundario" onClick={aoCancelar}>Cancelar</Button>
        <Button variante={perigo ? 'perigo' : 'primario'} onClick={aoConfirmar}>{rotuloConfirmar}</Button>
      </>}
    >
      {texto && <p className="text-sm text-mata-suave">{texto}</p>}
    </Modal>
  )
}
