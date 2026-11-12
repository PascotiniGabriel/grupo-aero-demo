import { useRef } from 'react'
import { BookOpen, CheckCircle2, FilePlus2, FileText, Loader2 } from 'lucide-react'
import { Button, Painel, Selo, type CorSelo } from '@/components/ui'
import { dataCurta } from '@/lib/format'
import { toast } from '@/components/ui'
import { useAssistente } from './store'

const COR_TIPO: Record<string, CorSelo> = { Catálogo: 'verde', Manual: 'azul', Preços: 'ambar', Procedimento: 'neutro' }

export function BaseConhecimento() {
  const docs = useAssistente((s) => s.docs)
  const adicionar = useAssistente((s) => s.adicionarDocumento)
  const entrada = useRef<HTMLInputElement>(null)

  function escolher(files: FileList | null) {
    const arq = files?.[0]
    if (!arq) return
    adicionar({ nome: arq.name, tamanhoKb: arq.size / 1024 })
    toast.info('Documento enviado. A IA está lendo o conteúdo.')
    if (entrada.current) entrada.current.value = ''
  }

  const lendo = docs.filter((d) => d.situacao === 'lendo').length

  return (
    <Painel
      titulo={<span className="inline-flex items-center gap-2"><BookOpen size={18} aria-hidden /> Base de conhecimento</span>}
      semPadding
    >
      <div className="space-y-3 p-4">
        <p className="text-sm text-mata-suave">
          Documentos que a IA já leu. Na versão final, ela lê os catálogos e manuais da empresa e responde com base neles.
        </p>
        <input ref={entrada} type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.txt" className="hidden" onChange={(e) => escolher(e.target.files)} />
        <Button variante="secundario" bloco icone={<FilePlus2 size={16} />} onClick={() => entrada.current?.click()}>
          Adicionar documento
        </Button>
        {lendo > 0 && <p className="text-xs text-mata-suave" role="status">A IA está lendo {lendo === 1 ? 'um documento' : `${lendo} documentos`}.</p>}
      </div>
      <ul className="divide-y divide-linha border-t border-linha">
        {docs.map((d) => (
          <li key={d.id} className="flex items-start gap-3 px-4 py-3">
            <FileText size={18} className="mt-0.5 shrink-0 text-mata-suave" aria-hidden />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium leading-snug">{d.nome}</p>
              <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-mata-suave">
                <Selo cor={COR_TIPO[d.tipo]}>{d.tipo}</Selo>
                <span>{d.detalhe}</span>
                <span>· {dataCurta(d.data)}</span>
              </div>
              {d.situacao === 'lendo' ? (
                <div className="mt-2" role="status" aria-live="polite">
                  <div className="h-1.5 overflow-hidden rounded-full bg-linha">
                    <div className="h-full rounded-full bg-ceu transition-[width] duration-300" style={{ width: `${d.progresso}%` }} />
                  </div>
                  <p className="mt-1 flex items-center gap-1.5 text-xs text-ceu"><Loader2 size={12} className="animate-spin" aria-hidden />{d.etapa} ({d.progresso}%)</p>
                </div>
              ) : (
                <p className="mt-1.5 flex items-center gap-1.5 text-xs text-lavoura-texto"><CheckCircle2 size={13} aria-hidden /> Lido e pronto para consulta</p>
              )}
            </div>
          </li>
        ))}
      </ul>
    </Painel>
  )
}
