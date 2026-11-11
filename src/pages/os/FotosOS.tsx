import { useRef, useState } from 'react'
import { Camera, ImagePlus, Trash2 } from 'lucide-react'
import { useStore } from '@/store'
import { Button, EstadoVazio, IconButton, Modal, Select, cx, toast } from '@/components/ui'
import { reduzirImagem } from '@/lib/fotos'
import { novoId } from '@/store'
import type { FotoOS } from '@/types'

export const FASES: { id: FotoOS['fase']; rotulo: string; dica: string; cor: string }[] = [
  { id: 'chegada', rotulo: 'Chegada', dica: 'Como o drone chegou', cor: 'text-ceu' },
  { id: 'dano', rotulo: 'Danos', dica: 'Peças danificadas', cor: 'text-barro' },
  { id: 'saida', rotulo: 'Saída', dica: 'Como o drone vai sair', cor: 'text-lavoura' },
]

/** Hook: adiciona várias fotos de uma vez a uma fase da OS. */
export function useAdicionarFotos(osId: string) {
  const salvar = useStore((s) => s.salvar)
  const [enviando, setEnviando] = useState(false)
  async function adicionar(arquivos: File[], fase: FotoOS['fase']) {
    const imagens = arquivos.filter((f) => f.type.startsWith('image/'))
    if (!imagens.length) { toast.erro('Escolha arquivos de imagem.'); return }
    setEnviando(true)
    try {
      const novas: FotoOS[] = []
      for (const f of imagens) {
        try { novas.push({ id: novoId('foto'), fase, url: await reduzirImagem(f), legenda: '' }) } catch { /* pula a que falhou */ }
      }
      const os = useStore.getState().ordens.find((o) => o.id === osId)
      if (!os || !novas.length) { toast.erro('Não foi possível ler as fotos.'); return }
      salvar('ordens', { ...os, fotos: [...os.fotos, ...novas] })
      toast.sucesso(novas.length === 1 ? 'Foto adicionada' : `${novas.length} fotos adicionadas`)
    } finally { setEnviando(false) }
  }
  return { adicionar, enviando }
}

function BotoesAdicionar({ osId, fase, tamanho = 'md' }: { osId: string; fase: FotoOS['fase']; tamanho?: 'sm' | 'md' }) {
  const { adicionar, enviando } = useAdicionarFotos(osId)
  const galeria = useRef<HTMLInputElement>(null)
  const camera = useRef<HTMLInputElement>(null)
  const ler = (e: React.ChangeEvent<HTMLInputElement>) => { const fs = Array.from(e.target.files ?? []); e.target.value = ''; if (fs.length) void adicionar(fs, fase) }
  return (
    <div className="flex gap-2">
      <input ref={galeria} type="file" accept="image/*" multiple hidden onChange={ler} />
      <input ref={camera} type="file" accept="image/*" capture="environment" hidden onChange={ler} />
      <Button variante="secundario" tamanho={tamanho} icone={<ImagePlus size={16} />} loading={enviando} onClick={() => galeria.current?.click()}>Adicionar fotos</Button>
      <Button variante="secundario" tamanho={tamanho} icone={<Camera size={16} />} onClick={() => camera.current?.click()} aria-label={`Tirar foto de ${fase}`}>Câmera</Button>
    </div>
  )
}

export function GerenciadorFotos({ osId, fases = ['chegada', 'dano', 'saida'], compacto }: { osId: string; fases?: FotoOS['fase'][]; compacto?: boolean }) {
  const ordens = useStore((s) => s.ordens)
  const salvar = useStore((s) => s.salvar)
  const os = ordens.find((o) => o.id === osId)
  const [ampliada, setAmpliada] = useState<FotoOS | null>(null)
  if (!os) return null

  const atualizar = (id: string, parcial: Partial<FotoOS>) =>
    salvar('ordens', { ...os, fotos: os.fotos.map((f) => (f.id === id ? { ...f, ...parcial } : f)) })
  const remover = (id: string) => { salvar('ordens', { ...os, fotos: os.fotos.filter((f) => f.id !== id) }); toast.info('Foto removida') }

  return (
    <div className={compacto ? 'space-y-4' : 'space-y-6'}>
      {FASES.filter((f) => fases.includes(f.id)).map((fase) => {
        const fotos = os.fotos.filter((f) => f.fase === fase.id)
        return (
          <section key={fase.id} aria-label={`Fotos de ${fase.rotulo}`}>
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className={cx('text-base', fase.cor)}>{fase.rotulo} <span className="num text-sm text-mata-suave">({fotos.length})</span></h3>
                {!compacto && <p className="text-sm text-mata-suave">{fase.dica}</p>}
              </div>
              <BotoesAdicionar osId={osId} fase={fase.id} />
            </div>
            {fotos.length === 0 && compacto ? (
              <p className="rounded-campo border border-dashed border-linha px-3 py-2 text-sm text-mata-suave">Nenhuma foto. {fase.dica}.</p>
            ) : fotos.length === 0 ? (
              <EstadoVazio titulo="Nenhuma foto ainda" texto="Adicione várias de uma vez, como no WhatsApp." />
            ) : (
              <ul className={cx('grid gap-3', compacto ? 'grid-cols-2' : 'grid-cols-2 lg:grid-cols-3 xl:grid-cols-4')}>
                {fotos.map((f) => (
                  <li key={f.id} className="overflow-hidden rounded-painel border border-linha bg-papel">
                    <button type="button" onClick={() => setAmpliada(f)} className="block aspect-[4/3] w-full bg-nevoa" aria-label="Ampliar foto">
                      <img src={f.url} alt={f.legenda || `Foto de ${fase.rotulo.toLowerCase()}`} className="h-full w-full object-cover" loading="lazy" />
                    </button>
                    <div className="space-y-2 p-2">
                      <input
                        defaultValue={f.legenda} placeholder="Legenda (ex.: braço 3 trincado)" aria-label="Legenda da foto"
                        onBlur={(e) => { if (e.target.value !== f.legenda) atualizar(f.id, { legenda: e.target.value }) }}
                        className="h-10 w-full rounded-campo border border-linha bg-papel px-2 text-sm outline-none focus:border-lavoura"
                      />
                      <div className="flex items-center gap-1">
                        <Select value={f.fase} aria-label="Mover para o grupo" onChange={(e) => atualizar(f.id, { fase: e.target.value as FotoOS['fase'] })} className="h-10 flex-1 px-2 text-xs">
                          {FASES.map((x) => <option key={x.id} value={x.id}>{x.rotulo}</option>)}
                        </Select>
                        <IconButton icone={<Trash2 size={16} />} aria-label="Remover foto" onClick={() => remover(f.id)} />
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )
      })}
      <Modal aberto={!!ampliada} aoFechar={() => setAmpliada(null)} titulo={ampliada?.legenda || 'Foto'} largura="lg">
        {ampliada && <img src={ampliada.url} alt={ampliada.legenda || 'Foto ampliada'} className="mx-auto max-h-[70vh] w-auto rounded-campo" />}
      </Modal>
    </div>
  )
}
