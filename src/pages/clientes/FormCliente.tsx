import type { Cliente } from '@/types'
import { Campo, Input, Select, Textarea } from '@/components/ui'
import { UFS } from './calc'

export function clienteVazio(id: string): Cliente {
  return { id, nome: '', tipo: 'PJ', documento: '', ie: '', cidade: '', uf: 'BA', endereco: '', cep: '', fone: '', email: '', desde: new Date().toISOString(), observacao: '' }
}

/** Formulário de dados do cliente (PF ou PJ), controlado. */
export function FormCliente({ valor, aoMudar, erros }: { valor: Cliente; aoMudar: (p: Partial<Cliente>) => void; erros?: Partial<Record<'nome' | 'documento', string>> }) {
  const pj = valor.tipo === 'PJ'
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <Campo rotulo="Tipo de cliente">
        <Select value={valor.tipo} onChange={(e) => aoMudar({ tipo: e.target.value as 'PF' | 'PJ' })}>
          <option value="PJ">Empresa (CNPJ)</option><option value="PF">Pessoa física (CPF)</option>
        </Select>
      </Campo>
      <Campo rotulo={pj ? 'CNPJ' : 'CPF'} erro={erros?.documento}>
        <Input value={valor.documento} inputMode="numeric" onChange={(e) => aoMudar({ documento: e.target.value })} placeholder={pj ? '00.000.000/0000-00' : '000.000.000-00'} />
      </Campo>
      <Campo rotulo={pj ? 'Razão social ou nome da fazenda' : 'Nome completo'} obrigatorio erro={erros?.nome} className="sm:col-span-2">
        <Input value={valor.nome} onChange={(e) => aoMudar({ nome: e.target.value })} />
      </Campo>
      {pj && <Campo rotulo="Inscrição estadual"><Input value={valor.ie ?? ''} onChange={(e) => aoMudar({ ie: e.target.value })} /></Campo>}
      <Campo rotulo="Telefone"><Input value={valor.fone} inputMode="tel" onChange={(e) => aoMudar({ fone: e.target.value })} placeholder="(77) 90000-0000" /></Campo>
      <Campo rotulo="E-mail" className={pj ? '' : 'sm:col-span-1'}><Input type="email" value={valor.email} onChange={(e) => aoMudar({ email: e.target.value })} placeholder="contato@exemplo.com.br" /></Campo>
      <Campo rotulo="Endereço" className="sm:col-span-2"><Input value={valor.endereco} onChange={(e) => aoMudar({ endereco: e.target.value })} /></Campo>
      <Campo rotulo="Cidade"><Input value={valor.cidade} onChange={(e) => aoMudar({ cidade: e.target.value })} /></Campo>
      <div className="grid grid-cols-[96px_1fr] gap-3">
        <Campo rotulo="Estado"><Select value={valor.uf} onChange={(e) => aoMudar({ uf: e.target.value })}>{UFS.map((u) => <option key={u}>{u}</option>)}</Select></Campo>
        <Campo rotulo="CEP"><Input value={valor.cep} inputMode="numeric" onChange={(e) => aoMudar({ cep: e.target.value })} placeholder="00000-000" /></Campo>
      </div>
      <Campo rotulo="Observações" className="sm:col-span-2"><Textarea rows={2} value={valor.observacao ?? ''} onChange={(e) => aoMudar({ observacao: e.target.value })} /></Campo>
    </div>
  )
}
