import { useState } from 'react'
import { MapPin, Pencil, Plus, Trash2 } from 'lucide-react'
import { useStore } from '@/store'
import { Button, Confirmar, EstadoVazio, Gaveta, Painel, toast } from '@/components/ui'
import { BotoesLocal, DadosLocal, EditorLocal } from '@/pages/os/LocalUI'
import type { Cliente, Local } from '@/types'

/** Seção "Locais" do cliente: sede e fazendas, com Waze, Google Maps e cópia das coordenadas. */
export function LocaisCliente({ cliente }: { cliente: Cliente }) {
  const salvar = useStore((s) => s.salvar)
  const locais = cliente.locais ?? []
  const [edicao, setEdicao] = useState<{ indice: number; local?: Local } | null>(null)
  const [remover, setRemover] = useState<number | null>(null)

  const gravar = () => {
    if (!edicao?.local) { toast.erro('Cole ou escolha uma localização antes de salvar.'); return }
    const novo = { ...edicao.local, atualizadoEm: new Date().toISOString(), origem: edicao.local.origem ?? 'cadastro' }
    const lista = edicao.indice < 0 ? [...locais, novo] : locais.map((l, i) => (i === edicao.indice ? novo : l))
    salvar('clientes', { ...cliente, locais: lista })
    setEdicao(null); toast.sucesso('Local salvo')
  }
  const apagar = () => {
    if (remover === null) return
    salvar('clientes', { ...cliente, locais: locais.filter((_, i) => i !== remover) })
    setRemover(null); toast.sucesso('Local removido')
  }

  return (
    <Painel
      titulo={`Locais${locais.length ? ` (${locais.length})` : ''}`}
      acoes={<Button tamanho="sm" variante="secundario" icone={<Plus size={16} />} onClick={() => setEdicao({ indice: -1 })}>Adicionar local</Button>}
    >
      {locais.length === 0 ? (
        <EstadoVazio icone={<MapPin size={28} />} titulo="Nenhum local cadastrado" texto="Cole a localização que o cliente mandou pelo WhatsApp para o técnico chegar na lavoura." />
      ) : (
        <ul className="flex flex-col gap-3">
          {locais.map((l, i) => (
            <li key={i} className="space-y-3 rounded-painel border border-linha p-3">
              <DadosLocal local={l} />
              <BotoesLocal local={l} titulo={`${cliente.nome}, ${l.descricao}`} compacto />
              <div className="flex gap-2">
                <Button tamanho="sm" variante="fantasma" icone={<Pencil size={16} />} onClick={() => setEdicao({ indice: i, local: l })}>Editar</Button>
                <Button tamanho="sm" variante="fantasma" icone={<Trash2 size={16} />} onClick={() => setRemover(i)}>Remover</Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Gaveta
        aberta={!!edicao} aoFechar={() => setEdicao(null)} titulo={edicao && edicao.indice >= 0 ? 'Editar local' : 'Adicionar local'} largura="md"
        rodape={<><Button variante="secundario" onClick={() => setEdicao(null)}>Cancelar</Button><Button onClick={gravar}>Salvar local</Button></>}
      >
        {edicao && <EditorLocal valor={edicao.local} aoMudar={(l) => setEdicao({ ...edicao, local: l })} />}
      </Gaveta>
      <Confirmar aberto={remover !== null} titulo="Remover este local?" texto="As OS que já usam esse ponto continuam com a cópia delas." rotuloConfirmar="Remover" perigo aoCancelar={() => setRemover(null)} aoConfirmar={apagar} />
    </Painel>
  )
}
