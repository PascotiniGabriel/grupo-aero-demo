import { useState } from 'react'
import { Building2, Plus } from 'lucide-react'
import { Button, Campo, Input, Modal, Painel, Selo, toast } from '@/components/ui'
import { novoId, useStore } from '@/store'
import { EMPRESA_PRINCIPAL_ID } from '@/lib/empresas'

/** Configurações > Empresas do grupo (Gestor). Cadastro de demonstração: use só CNPJ fictício. */
export function AbaEmpresas() {
  const empresas = useStore((s) => s.empresas)
  const usuarios = useStore((s) => s.usuarios)
  const salvar = useStore((s) => s.salvar)
  const [aberta, setAberta] = useState(false)
  const [nome, setNome] = useState('')
  const [curto, setCurto] = useState('')
  const [cnpj, setCnpj] = useState('')
  const [cidade, setCidade] = useState('')
  const [uf, setUf] = useState('')

  function abrir() {
    setNome(''); setCurto(''); setCidade(''); setUf('')
    setCnpj(`00.000.${String(empresas.length).padStart(3, '0')}/0001-00`)
    setAberta(true)
  }
  const valido = nome.trim() && cidade.trim() && uf.trim().length === 2 && cnpj.trim()

  function adicionar() {
    if (!valido) return
    const id = novoId('emp')
    const sigla = (curto.trim() || cidade.trim().slice(0, 2)).toUpperCase().slice(0, 3)
    const todasAntes = empresas.map((e) => e.id)
    salvar('empresas', { id, nome: nome.trim(), nomeCurto: sigla, cnpj: cnpj.trim(), cidade: cidade.trim(), uf: uf.trim().toUpperCase() })
    // Quem via todas as empresas passa a ver também a nova.
    for (const u of usuarios) if (todasAntes.every((x) => u.empresaIds?.includes(x))) salvar('usuarios', { ...u, empresaIds: [...u.empresaIds, id] })
    toast.sucesso(`${nome.trim()} adicionada ao grupo`)
    setAberta(false)
  }

  return (
    <>
      <Painel
        titulo="Empresas do grupo"
        acoes={<Button icone={<Plus size={16} />} onClick={abrir}>Adicionar empresa</Button>}
        semPadding
      >
        <ul className="divide-y divide-linha">
          {empresas.map((e) => (
            <li key={e.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-campo bg-forte text-xs font-semibold text-white" aria-hidden>{e.nomeCurto}</span>
              <div className="min-w-0 flex-1">
                <p className="font-medium">{e.nome}</p>
                <p className="text-sm text-mata-suave">{e.cidade}-{e.uf} · <span className="num">CNPJ {e.cnpj}</span></p>
              </div>
              {e.id === EMPRESA_PRINCIPAL_ID && <Selo cor="verde" icone={<Building2 size={12} />}>Principal</Selo>}
            </li>
          ))}
        </ul>
        <p className="border-t border-linha px-4 py-3 text-sm text-mata-suave">Clientes e catálogo de peças são do grupo. Estoque, orçamentos, ordens, notas e financeiro são separados por empresa.</p>
      </Painel>

      <Modal
        aberto={aberta} aoFechar={() => setAberta(false)} titulo="Adicionar empresa" largura="sm"
        rodape={<><Button variante="secundario" onClick={() => setAberta(false)}>Cancelar</Button><Button onClick={adicionar} disabled={!valido}>Adicionar empresa</Button></>}
      >
        <div className="grid gap-4">
          <Campo rotulo="Nome da empresa" obrigatorio><Input value={nome} onChange={(e) => setNome(e.target.value)} autoFocus /></Campo>
          <div className="grid grid-cols-2 gap-3">
            <Campo rotulo="CNPJ (fictício)"><Input value={cnpj} inputMode="numeric" onChange={(e) => setCnpj(e.target.value)} /></Campo>
            <Campo rotulo="Sigla (2 letras)"><Input value={curto} maxLength={3} onChange={(e) => setCurto(e.target.value)} placeholder="Ex.: LU" /></Campo>
          </div>
          <div className="grid grid-cols-[1fr_88px] gap-3">
            <Campo rotulo="Cidade" obrigatorio><Input value={cidade} onChange={(e) => setCidade(e.target.value)} /></Campo>
            <Campo rotulo="UF" obrigatorio><Input value={uf} maxLength={2} onChange={(e) => setUf(e.target.value)} /></Campo>
          </div>
          <p className="text-sm text-mata-suave">Na demonstração a empresa nova começa sem estoque e sem registros.</p>
        </div>
      </Modal>
    </>
  )
}
