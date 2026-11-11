import { useMemo, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ArrowLeft, FilePlus2, Eye, FileText, Printer } from 'lucide-react'
import { Button, CabecalhoPagina, CampoBusca, ChipsModelos, EstadoVazio, Painel, Selo, cx } from '@/components/ui'
import { useStore } from '@/store'
import { brl, normalizar, numero, peso } from '@/lib/format'
import type { GrupoDiagrama, Produto } from '@/types'
import { GRUPOS, ORDEM_GRUPOS, ehExclusiva } from '../estoque/comum'
import { Diagrama, NUMERO_GRUPO } from './Diagrama'
import { FolhaCatalogo } from './FolhaCatalogo'

type Selecao = GrupoDiagrama | 'outros'
const ROTULO_OUTROS = 'Outras peças e acessórios'

export default function Catalogo() {
  const { modeloId } = useParams()
  const navegar = useNavigate()
  const [params, setParams] = useSearchParams()
  const modelos = useStore((s) => s.modelos)
  const produtos = useStore((s) => s.produtos)

  const [busca, setBusca] = useState('')
  const [realce, setRealce] = useState<GrupoDiagrama | null>(null)
  const [previa, setPrevia] = useState(false)
  const [ocultarPrecos, setOcultarPrecos] = useState(false)

  const modelo = modelos.find((m) => m.id === modeloId) ?? modelos.find((m) => m.id === 't40') ?? modelos[0]
  const grupoParam = params.get('grupo')
  const selecao: Selecao | null = grupoParam === 'outros' ? 'outros' : ORDEM_GRUPOS.includes(grupoParam as GrupoDiagrama) ? (grupoParam as GrupoDiagrama) : null

  const pecas = useMemo(
    () => produtos
      .filter((p) => p.tipo !== 'drone' && modelo && (p.modelosCompativeis.includes(modelo.id) || p.modelosCompativeis.length === 0))
      .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR')),
    [produtos, modelo],
  )
  const contagem = useMemo(() => {
    const c: Partial<Record<GrupoDiagrama, number>> = {}
    for (const p of pecas) if (p.grupo) c[p.grupo] = (c[p.grupo] ?? 0) + 1
    return c
  }, [pecas])
  const semGrupo = useMemo(() => pecas.filter((p) => !p.grupo), [pecas])

  if (!modelo) return null

  function escolherModelo(id: string) {
    navegar({ pathname: `/catalogo/${id}`, search: grupoParam ? `?grupo=${grupoParam}` : '' })
  }
  function escolherGrupo(g: Selecao | null) {
    const p = new URLSearchParams(params)
    if (g && g !== selecao) p.set('grupo', g); else p.delete('grupo')
    setParams(p, { replace: true })
    setBusca('')
  }
  function irParaGrupo(g: Selecao) {
    const p = new URLSearchParams(params)
    p.set('grupo', g)
    setParams(p, { replace: true })
    setBusca('')
  }

  const q = normalizar(busca.trim())
  const resultados = q ? pecas.filter((p) => normalizar(`${p.nome} ${p.sku} ${p.codigoFabricante}`).includes(q)) : []
  const listaGrupo = selecao === 'outros' ? semGrupo : selecao ? pecas.filter((p) => p.grupo === selecao) : []
  const nomeSelecao = selecao === 'outros' ? ROTULO_OUTROS : selecao ? GRUPOS[selecao] : ''

  if (previa) {
    return (
      <>
        <div className="nao-imprimir mb-4">
          <CabecalhoPagina
            titulo={`Catálogo de peças do ${modelo.nome}`}
            descricao="Pré-visualização do documento que vai para o cliente."
            acoes={
              <>
                <Button variante="secundario" icone={<ArrowLeft size={16} />} onClick={() => setPrevia(false)}>Voltar ao catálogo</Button>
                <Button icone={<Printer size={16} />} onClick={() => window.print()}>Imprimir ou salvar em PDF</Button>
              </>
            }
          />
          <label className="flex min-h-10 cursor-pointer items-center gap-2 text-sm">
            <input type="checkbox" checked={ocultarPrecos} onChange={(e) => setOcultarPrecos(e.target.checked)} className="size-5 accent-lavoura" />
            Ocultar preços no documento
          </label>
        </div>
        <div className="folha-impressao overflow-x-auto rounded-painel border border-linha bg-white">
          <FolhaCatalogo modelo={modelo} pecas={pecas} ocultarPrecos={ocultarPrecos} />
        </div>
      </>
    )
  }

  const linhaPeca = (p: Produto, mostrarGrupo = false) => {
    const exclusiva = ehExclusiva(p)
    const baixo = p.estoque === 0 ? 'vermelho' : p.estoque < p.estoqueMinimo ? 'ambar' : 'verde'
    return (
      <li
        key={p.id}
        onMouseEnter={() => p.grupo && setRealce(p.grupo)} onMouseLeave={() => setRealce(null)}
        className={cx('rounded-campo border border-linha p-3 transition-colors', p.grupo && realce === p.grupo && 'border-ceu bg-ceu-claro/40')}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="font-medium leading-snug">{p.nome}</p>
            <p className="serial text-xs text-mata-suave">{p.sku} · {p.codigoFabricante}</p>
          </div>
          <p className="num shrink-0 font-semibold">{brl(p.preco)}</p>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs">
          <Selo cor={baixo}>{p.estoque === 0 ? 'Sem estoque' : `${numero(p.estoque)} em estoque`}</Selo>
          <span className="num text-mata-suave">{peso(p.pesoG)}</span>
          {exclusiva ? <Selo cor="ambar">Só serve no {modelo.nome}</Selo> : p.modelosCompativeis.length > 1 ? <Selo cor="verde">Compartilhada</Selo> : <Selo>Universal</Selo>}
          {mostrarGrupo && p.grupo && (
            <button type="button" className="min-h-8 text-ceu hover:underline" onClick={() => irParaGrupo(p.grupo!)}>{NUMERO_GRUPO[p.grupo]}. {GRUPOS[p.grupo]}</button>
          )}
        </div>
        {p.modelosCompativeis.length > 1 && <div className="mt-1.5"><ChipsModelos ids={p.modelosCompativeis} /></div>}
        <div className="mt-2.5 flex flex-wrap gap-2">
          <Button tamanho="sm" variante="secundario" icone={<Eye size={15} />} onClick={() => navegar(`/estoque/${p.id}`)}>Ver peça</Button>
          <Button tamanho="sm" variante="secundario" icone={<FilePlus2 size={15} />} onClick={() => navegar(`/orcamentos/novo?add=${p.id}`)}>Adicionar a um orçamento</Button>
        </div>
      </li>
    )
  }

  const chipGrupo = (g: Selecao, rotulo: string, qtd: number, num?: number) => (
    <button
      key={g} type="button" onClick={() => escolherGrupo(g)}
      onMouseEnter={() => g !== 'outros' && setRealce(g)} onMouseLeave={() => setRealce(null)}
      className={cx('flex min-h-11 w-full items-center gap-3 rounded-campo border px-3 text-left transition-colors', selecao === g ? 'border-lavoura bg-lavoura-claro' : 'border-linha bg-papel hover:border-ceu', qtd === 0 && 'opacity-60')}
    >
      {num !== undefined && <span className="num grid size-7 shrink-0 place-items-center rounded-full border border-mata text-sm font-semibold">{num}</span>}
      <span className="flex-1 text-sm font-medium">{rotulo}</span>
      <span className="num text-sm text-mata-suave">{qtd}</span>
    </button>
  )

  return (
    <>
      <CabecalhoPagina
        titulo="Catálogo de peças"
        descricao="Toque numa parte do desenho para ver as peças que servem naquele ponto."
        acoes={<Button icone={<FileText size={16} />} onClick={() => setPrevia(true)}>Gerar catálogo para cliente</Button>}
      />

      <div className="mb-4 flex flex-wrap gap-2" role="group" aria-label="Modelo do drone">
        {modelos.map((m) => (
          <button
            key={m.id} type="button" aria-pressed={m.id === modelo.id} onClick={() => escolherModelo(m.id)}
            className={cx('min-h-10 rounded-full border px-4 text-sm font-medium', m.id === modelo.id ? 'border-lavoura bg-lavoura text-white' : 'border-linha bg-papel hover:border-lavoura')}
          >Agras {m.nome}</button>
        ))}
      </div>

      <div className="grid grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,430px)]">
        <Painel
          titulo={`Vista explodida do Agras ${modelo.nome}`}
          acoes={<span className="text-xs text-mata-suave">{modelo.rotores === 8 ? '8 rotores coaxiais' : '4 rotores'} · tanque de {modelo.tanqueL} L</span>}
        >
          <div className="mx-auto max-w-[640px]">
            <Diagrama
              rotores={modelo.rotores} nomeModelo={modelo.nome} ativo={selecao === 'outros' ? null : selecao} realce={realce}
              contagem={contagem} nomes={GRUPOS} aoSelecionar={(g) => escolherGrupo(g)} aoRealcar={setRealce}
            />
          </div>
          <p className="mt-2 min-h-6 text-center text-sm text-mata-suave" aria-live="polite">
            {realce ? `${NUMERO_GRUPO[realce]}. ${GRUPOS[realce]}: ${contagem[realce] ?? 0} ${(contagem[realce] ?? 0) === 1 ? 'peça' : 'peças'}` : selecao && selecao !== 'outros' ? `Selecionado: ${GRUPOS[selecao]}` : 'Desenho esquemático, fora de escala.'}
          </p>
        </Painel>

        <div className="grid content-start gap-4">
          <Painel>
            <CampoBusca valor={busca} aoMudar={setBusca} placeholder={`Buscar peça do ${modelo.nome} pelo nome`} />
          </Painel>

          {q ? (
            <Painel titulo={`${resultados.length} ${resultados.length === 1 ? 'resultado' : 'resultados'}`}>
              {resultados.length === 0
                ? <EstadoVazio titulo="Nenhuma peça encontrada" texto={`Nada com "${busca}" para o ${modelo.nome}.`} />
                : <ul className="grid gap-2.5">{resultados.map((p) => linhaPeca(p, true))}</ul>}
            </Painel>
          ) : selecao ? (
            <Painel
              titulo={`${selecao !== 'outros' ? `${NUMERO_GRUPO[selecao]}. ` : ''}${nomeSelecao} (${listaGrupo.length})`}
              acoes={<Button tamanho="sm" variante="fantasma" onClick={() => escolherGrupo(null)}>Ver todos os grupos</Button>}
            >
              {listaGrupo.length === 0
                ? <EstadoVazio titulo="Sem peças neste grupo" texto={`Nenhuma peça cadastrada para o ${modelo.nome} neste ponto.`} />
                : <ul className="grid gap-2.5">{listaGrupo.map((p) => linhaPeca(p))}</ul>}
            </Painel>
          ) : (
            <Painel titulo="Grupos de peças">
              <div className="grid gap-2">
                {ORDEM_GRUPOS.map((g) => chipGrupo(g, GRUPOS[g], contagem[g] ?? 0, NUMERO_GRUPO[g]))}
                {chipGrupo('outros', ROTULO_OUTROS, semGrupo.length)}
              </div>
            </Painel>
          )}
        </div>
      </div>
    </>
  )
}
