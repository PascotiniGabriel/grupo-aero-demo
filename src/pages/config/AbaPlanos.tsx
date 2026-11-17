import { useEffect, useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { Button, Campo, IconButton, Input, Painel, toast } from '@/components/ui'
import { useStore, novoId } from '@/store'
import type { PlanoSuporte } from '@/types'

const num = (v: string) => Math.max(0, Number(v.replace(',', '.')) || 0)

/** Planos de suporte vendidos ao cliente (limites do agente de IA e da equipe). Só grava ao clicar em Salvar. */
export function AbaPlanos() {
  const empresa = useStore((s) => s.empresa)
  const clientes = useStore((s) => s.clientes)
  const salvarEmpresa = useStore((s) => s.salvarEmpresa)
  const planos = empresa.planosSuporte ?? []
  const [rascunho, setRascunho] = useState<PlanoSuporte[]>(planos)
  const chave = JSON.stringify(planos)
  useEffect(() => { setRascunho(planos) }, [chave]) // eslint-disable-line react-hooks/exhaustive-deps
  const alterado = JSON.stringify(rascunho) !== chave
  const mudar = (id: string, p: Partial<PlanoSuporte>) => setRascunho((l) => l.map((x) => (x.id === id ? { ...x, ...p } : x)))
  const emUso = (id: string) => clientes.filter((c) => c.suporte?.planoId === id).length

  function salvar() {
    if (rascunho.some((p) => !p.nome.trim())) { toast.erro('Todo plano precisa de um nome'); return }
    salvarEmpresa({ ...empresa, planosSuporte: rascunho.map((p) => ({ ...p, nome: p.nome.trim(), atendimento: p.atendimento.trim(), incluso: p.incluso?.trim() || undefined })) })
    toast.sucesso('Planos de suporte salvos')
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-mata-suave">Cada cliente com plano ativo usa o agente de IA no celular até o limite de perguntas do mês. Quando passa, ele pode chamar a equipe (até o limite de atendimentos) ou conhecer um plano maior.</p>
      {rascunho.map((p) => (
        <Painel key={p.id} titulo={p.nome || 'Novo plano'} acoes={
          <IconButton icone={<Trash2 size={16} />} aria-label={`Remover plano ${p.nome}`} disabled={emUso(p.id) > 0} title={emUso(p.id) > 0 ? 'Há clientes neste plano' : undefined}
            onClick={() => setRascunho((l) => l.filter((x) => x.id !== p.id))} />
        }>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Campo rotulo="Nome"><Input value={p.nome} onChange={(e) => mudar(p.id, { nome: e.target.value })} /></Campo>
            <Campo rotulo="Preço por mês (R$)"><Input inputMode="decimal" className="num" value={String(p.precoMensal)} onChange={(e) => mudar(p.id, { precoMensal: num(e.target.value) })} /></Campo>
            <Campo rotulo="Perguntas à IA por mês"><Input inputMode="numeric" className="num" value={String(p.perguntasIAMes)} onChange={(e) => mudar(p.id, { perguntasIAMes: Math.round(num(e.target.value)) })} /></Campo>
            <Campo rotulo="Atendimentos da equipe por mês"><Input inputMode="numeric" className="num" value={String(p.chamadosEquipeMes)} onChange={(e) => mudar(p.id, { chamadosEquipeMes: Math.round(num(e.target.value)) })} /></Campo>
            <div className="sm:col-span-2"><Campo rotulo="Atendimento"><Input value={p.atendimento} onChange={(e) => mudar(p.id, { atendimento: e.target.value })} placeholder="Ex.: Horário comercial" /></Campo></div>
            <div className="sm:col-span-2"><Campo rotulo="O que está incluso"><Input value={p.incluso ?? ''} onChange={(e) => mudar(p.id, { incluso: e.target.value })} placeholder="Ex.: Grátis por 12 meses na compra do drone" /></Campo></div>
          </div>
          <p className="mt-2 text-xs text-mata-suave">{emUso(p.id)} {emUso(p.id) === 1 ? 'cliente usa' : 'clientes usam'} este plano.</p>
        </Painel>
      ))}
      <div className="flex flex-wrap gap-2">
        <Button variante="secundario" icone={<Plus size={16} />} onClick={() => setRascunho((l) => [...l, { id: novoId('plano'), nome: '', precoMensal: 0, perguntasIAMes: 30, chamadosEquipeMes: 2, atendimento: 'Horário comercial' }])}>Adicionar plano</Button>
        <Button disabled={!alterado} onClick={salvar}>Salvar planos</Button>
      </div>
    </div>
  )
}
