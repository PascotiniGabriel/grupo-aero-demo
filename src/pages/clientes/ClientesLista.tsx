import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Users } from 'lucide-react'
import type { Cliente } from '@/types'
import { Avatar, Button, CabecalhoPagina, CampoBusca, EstadoVazio, Gaveta, Painel, Select, Tabela, toast, type Coluna } from '@/components/ui'
import { useStore, novoId } from '@/store'
import { nomeModelo } from '@/store/selectors'
import { brl, normalizar, relativo } from '@/lib/format'
import { totalComprado, ultimoAtendimento } from './calc'
import { FormCliente, clienteVazio } from './FormCliente'

export default function ClientesLista() {
  const navegar = useNavigate()
  const clientes = useStore((s) => s.clientes)
  const equipamentos = useStore((s) => s.equipamentos)
  const modelos = useStore((s) => s.modelos)
  const notas = useStore((s) => s.notas)
  const ordens = useStore((s) => s.ordens)
  const orcamentos = useStore((s) => s.orcamentos)
  const salvar = useStore((s) => s.salvar)

  const [busca, setBusca] = useState('')
  const [uf, setUf] = useState('')
  const [novo, setNovo] = useState<Cliente | null>(null)
  const [erros, setErros] = useState<Partial<Record<'nome' | 'documento', string>>>({})

  const ufs = useMemo(() => [...new Set(clientes.map((c) => c.uf))].sort(), [clientes])
  const linhas = useMemo(() => {
    const q = normalizar(busca).trim()
    return clientes
      .filter((c) => (!uf || c.uf === uf) && (!q || normalizar(`${c.nome} ${c.cidade} ${c.documento} ${c.fone}`).includes(q)))
      .map((c) => ({
        c,
        drones: equipamentos.filter((e) => e.clienteId === c.id),
        ultimo: ultimoAtendimento(c.id, { ordens, orcamentos, notas }),
        comprado: totalComprado(c.id, notas),
      }))
  }, [clientes, equipamentos, notas, ordens, orcamentos, busca, uf])

  type Linha = (typeof linhas)[number]
  const colunas: Coluna<Linha>[] = [
    {
      id: 'nome', titulo: 'Cliente', principal: true, valor: (l) => l.c.nome,
      render: (l) => <span className="inline-flex items-center gap-2.5"><Avatar nome={l.c.nome} tamanho={30} /><span className="font-medium">{l.c.nome}</span></span>,
    },
    { id: 'cidade', titulo: 'Cidade', valor: (l) => `${l.c.cidade}/${l.c.uf}`, render: (l) => `${l.c.cidade}/${l.c.uf}` },
    {
      id: 'drones', titulo: 'Drones', valor: (l) => l.drones.length,
      render: (l) => (l.drones.length ? <span>{l.drones.length} · {[...new Set(l.drones.map((e) => nomeModelo(e.modeloId, modelos)))].join(', ')}</span> : <span className="text-mata-suave">Nenhum</span>),
    },
    { id: 'ultimo', titulo: 'Último atendimento', valor: (l) => l.ultimo ?? '', render: (l) => (l.ultimo ? relativo(l.ultimo) : '-') },
    { id: 'comprado', titulo: 'Total comprado', alinhar: 'direita', valor: (l) => l.comprado, render: (l) => <span className="num">{brl(l.comprado)}</span> },
  ]

  const gravar = () => {
    if (!novo) return
    const e: typeof erros = {}
    if (!novo.nome.trim()) e.nome = 'Informe o nome'
    setErros(e)
    if (Object.keys(e).length) return
    salvar('clientes', { ...novo, nome: novo.nome.trim(), ie: novo.tipo === 'PJ' ? novo.ie : undefined })
    toast.sucesso('Cliente cadastrado')
    setNovo(null)
    navegar(`/clientes/${novo.id}`)
  }

  return (
    <>
      <CabecalhoPagina
        titulo="Clientes" descricao="Quem compra, quem tem drone e todo o histórico de atendimento."
        acoes={<Button icone={<Plus size={16} />} onClick={() => { setErros({}); setNovo(clienteVazio(novoId('cli'))) }}>Novo cliente</Button>}
      />
      <div className="mb-3 flex flex-col gap-2 sm:flex-row">
        <CampoBusca valor={busca} aoMudar={setBusca} placeholder="Buscar por nome, cidade ou telefone" className="sm:max-w-sm sm:flex-1" />
        <Select aria-label="Filtrar por estado" value={uf} onChange={(e) => setUf(e.target.value)} className="sm:w-48">
          <option value="">Todos os estados</option>
          {ufs.map((u) => <option key={u}>{u}</option>)}
        </Select>
      </div>
      <Painel semPadding>
        <Tabela
          colunas={colunas} dados={linhas} chave={(l) => l.c.id} aoClicar={(l) => navegar(`/clientes/${l.c.id}`)} ordemInicial={{ coluna: 'nome', direcao: 'asc' }}
          vazio={<EstadoVazio icone={<Users size={32} />} titulo="Nenhum cliente encontrado" texto="Mude a busca ou cadastre um novo cliente." />}
        />
      </Painel>

      <Gaveta
        aberta={!!novo} aoFechar={() => setNovo(null)} titulo="Novo cliente"
        rodape={<><Button variante="secundario" onClick={() => setNovo(null)}>Cancelar</Button><Button onClick={gravar}>Cadastrar cliente</Button></>}
      >
        {novo && <FormCliente valor={novo} aoMudar={(p) => setNovo({ ...novo, ...p })} erros={erros} />}
      </Gaveta>
    </>
  )
}
