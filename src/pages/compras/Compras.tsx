import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AlertTriangle, Pencil, Plus, Trash2, Truck } from 'lucide-react'
import type { Fornecedor } from '@/types'
import { Abas, Button, Campo, CabecalhoPagina, Confirmar, EstadoVazio, IconButton, Input, Modal, Painel, Selo, toast } from '@/components/ui'
import { brl } from '@/lib/format'
import { useStore } from '@/store'
import { SeloEmpresa, empresaPadraoParaNovo, estoqueDe, useFiltroEmpresa } from '@/lib/empresas'
import { COR_STATUS, ROTULO_STATUS, melhorResposta, novoId, totalDe } from './calculo'

const CATEGORIAS = ['Propulsão', 'Pulverização', 'Estrutura', 'Eletrônica', 'Energia', 'Sensores', 'Acessórios', 'Drones']
const VAZIO: Fornecedor = { id: '', nome: '', cidade: '', contato: '', fone: '', email: '', categorias: [], prazoMedioDias: 7 }

export default function Compras() {
  const [aba, setAba] = useState('cotacoes')
  const todasCotacoes = useStore((s) => s.cotacoes)
  const { ids, filtrar } = useFiltroEmpresa()
  const cotacoes = useMemo(() => filtrar(todasCotacoes), [todasCotacoes, filtrar])
  const fornecedores = useStore((s) => s.fornecedores)
  const produtos = useStore((s) => s.produtos)
  const ordens = useStore((s) => s.ordens)
  const salvar = useStore((s) => s.salvar)
  const remover = useStore((s) => s.remover)
  const nav = useNavigate()
  const [edit, setEdit] = useState<Fornecedor | null>(null)
  const [apagar, setApagar] = useState<Fornecedor | null>(null)

  const lista = useMemo(() => [...cotacoes].sort((a, b) => b.numero - a.numero), [cotacoes])
  const abaixo = useMemo(() => produtos.filter((p) => p.tipo !== 'drone' && estoqueDe(p, ids) < p.estoqueMinimo), [produtos, ids])

  function cotarAbaixoDoMinimo() {
    const numero = Math.max(0, ...todasCotacoes.map((c) => c.numero)) + 1
    const cats = new Set(abaixo.map((p) => p.categoria as string))
    const id = novoId('cot')
    salvar('cotacoes', {
      id, numero, titulo: 'Reposição de peças abaixo do mínimo', criadaEm: new Date().toISOString(), status: 'rascunho',
      itens: abaixo.map((p) => ({ produtoId: p.id, descricao: p.nome, quantidade: Math.max(1, p.estoqueMinimo * 2 - estoqueDe(p, ids)) })),
      empresaId: empresaPadraoParaNovo(),
      fornecedorIds: fornecedores.filter((f) => f.categorias.some((c) => cats.has(c))).map((f) => f.id), respostas: [],
    })
    toast.sucesso('Cotação criada com as peças abaixo do mínimo')
    nav(`/compras/${id}`)
  }

  function gravarFornecedor() {
    if (!edit) return
    if (!edit.nome.trim()) { toast.erro('Informe o nome do fornecedor'); return }
    salvar('fornecedores', { ...edit, id: edit.id || novoId('for') })
    toast.sucesso('Fornecedor salvo')
    setEdit(null)
  }

  return (
    <div>
      <CabecalhoPagina
        titulo="Compras" descricao="Monte listas de peças, peça preço aos fornecedores e compare as respostas."
        acoes={aba === 'cotacoes'
          ? <Button icone={<Plus size={16} />} onClick={() => nav('/compras/nova')}>Nova cotação</Button>
          : <Button icone={<Plus size={16} />} onClick={() => setEdit({ ...VAZIO })}>Novo fornecedor</Button>}
      />
      <Abas className="mb-4" ativa={aba} aoMudar={setAba} abas={[{ id: 'cotacoes', rotulo: 'Cotações', contagem: cotacoes.length }, { id: 'fornecedores', rotulo: 'Fornecedores', contagem: fornecedores.length }]} />

      {aba === 'cotacoes' && (
        <div className="flex flex-col gap-3">
          {abaixo.length > 0 && (
            <div className="flex flex-col gap-2 rounded-painel border border-linha bg-ambar-claro p-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="flex items-center gap-2 text-sm text-ambar-texto"><AlertTriangle size={16} aria-hidden />{abaixo.length} {abaixo.length === 1 ? 'peça está' : 'peças estão'} abaixo do estoque mínimo.</p>
              <Button variante="secundario" onClick={cotarAbaixoDoMinimo}>Peças abaixo do mínimo</Button>
            </div>
          )}
          <Painel semPadding>
            {lista.length === 0 ? <EstadoVazio titulo="Nenhuma cotação ainda" texto="Crie a primeira para pedir preço aos fornecedores." /> : (
              <ul>
                {lista.map((c) => {
                  const os = ordens.find((o) => o.id === c.osId)
                  const melhor = melhorResposta(c)
                  return (
                    <li key={c.id} className="border-b border-linha last:border-b-0">
                      <Link to={`/compras/${c.id}`} className="flex min-h-14 flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3 hover:bg-nevoa">
                        <span className="num w-10 shrink-0 text-sm text-mata-suave">#{c.numero}</span>
                        <span className="min-w-0 flex-1 basis-48">
                          <span className="block truncate font-medium">{c.titulo} <SeloEmpresa empresaId={c.empresaId} className="ml-1 align-middle" /></span>
                          <span className="text-xs text-mata-suave">{os ? `Para a OS ${os.numero} · ` : ''}{c.itens.length} {c.itens.length === 1 ? 'item' : 'itens'} · {c.fornecedorIds.length} fornecedores</span>
                        </span>
                        {melhor && <span className="num text-sm">Melhor: <strong>{brl(totalDe(c, melhor))}</strong></span>}
                        <Selo cor={COR_STATUS[c.status]}>{ROTULO_STATUS[c.status]}</Selo>
                      </Link>
                    </li>
                  )
                })}
              </ul>
            )}
          </Painel>
        </div>
      )}

      {aba === 'fornecedores' && (
        <Painel semPadding>
          {fornecedores.length === 0 ? <EstadoVazio icone={<Truck size={32} />} titulo="Nenhum fornecedor cadastrado" /> : (
            <ul>
              {fornecedores.map((f) => (
                <li key={f.id} className="flex items-center gap-2 border-b border-linha px-4 py-3 last:border-b-0">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{f.nome}</p>
                    <p className="text-xs text-mata-suave">{f.cidade} · {f.contato} · {f.fone}</p>
                    <p className="mt-1 flex flex-wrap items-center gap-1">{f.categorias.map((c) => <Selo key={c}>{c}</Selo>)}<span className="num ml-1 text-xs text-mata-suave">prazo médio {f.prazoMedioDias} dias</span></p>
                  </div>
                  <IconButton aria-label={`Editar ${f.nome}`} icone={<Pencil size={16} />} onClick={() => setEdit({ ...f })} />
                  <IconButton aria-label={`Excluir ${f.nome}`} icone={<Trash2 size={16} />} onClick={() => setApagar(f)} />
                </li>
              ))}
            </ul>
          )}
        </Painel>
      )}

      <Modal
        aberto={!!edit} aoFechar={() => setEdit(null)} titulo={edit?.id ? 'Editar fornecedor' : 'Novo fornecedor'}
        rodape={<><Button variante="secundario" onClick={() => setEdit(null)}>Cancelar</Button><Button onClick={gravarFornecedor}>Salvar fornecedor</Button></>}
      >
        {edit && (
          <div className="grid gap-3 sm:grid-cols-2">
            <Campo rotulo="Nome" obrigatorio className="sm:col-span-2"><Input value={edit.nome} onChange={(e) => setEdit({ ...edit, nome: e.target.value })} /></Campo>
            <Campo rotulo="Cidade"><Input value={edit.cidade} onChange={(e) => setEdit({ ...edit, cidade: e.target.value })} /></Campo>
            <Campo rotulo="Contato"><Input value={edit.contato} onChange={(e) => setEdit({ ...edit, contato: e.target.value })} /></Campo>
            <Campo rotulo="Telefone"><Input inputMode="tel" placeholder="(77) 90000-0000" value={edit.fone} onChange={(e) => setEdit({ ...edit, fone: e.target.value })} /></Campo>
            <Campo rotulo="E-mail"><Input type="email" value={edit.email} onChange={(e) => setEdit({ ...edit, email: e.target.value })} /></Campo>
            <Campo rotulo="Prazo médio (dias)"><Input type="number" min={0} value={edit.prazoMedioDias} onChange={(e) => setEdit({ ...edit, prazoMedioDias: Number(e.target.value) })} /></Campo>
            <div className="sm:col-span-2">
              <p className="mb-1.5 text-sm font-medium">Categorias</p>
              <div className="flex flex-wrap gap-2">
                {CATEGORIAS.map((c) => {
                  const on = edit.categorias.includes(c)
                  return (
                    <button key={c} type="button" aria-pressed={on} onClick={() => setEdit({ ...edit, categorias: on ? edit.categorias.filter((x) => x !== c) : [...edit.categorias, c] })}
                      className={`min-h-10 rounded-campo border px-3 text-sm ${on ? 'border-lavoura bg-lavoura-claro text-lavoura-texto' : 'border-linha bg-papel text-mata-suave'}`}>{c}</button>
                  )
                })}
              </div>
            </div>
          </div>
        )}
      </Modal>
      <Confirmar aberto={!!apagar} titulo="Excluir fornecedor?" texto={`${apagar?.nome} sai da lista. Cotações antigas continuam salvas.`} rotuloConfirmar="Excluir" perigo
        aoConfirmar={() => { if (apagar) remover('fornecedores', apagar.id); setApagar(null) }} aoCancelar={() => setApagar(null)} />
    </div>
  )
}
