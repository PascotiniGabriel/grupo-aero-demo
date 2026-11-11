import type { Produto } from '@/types'

export const chaveAleatoria = () => Array.from({ length: 44 }, () => Math.floor(Math.random() * 10)).join('')
export const formatarChave = (c: string) => c.replace(/(\d{4})(?=\d)/g, '$1 ')
export const somarDias = (n: number) => { const d = new Date(); d.setHours(12, 0, 0, 0); d.setDate(d.getDate() + n); return d.toISOString() }

export interface ItemXML { cProd: string; xProd: string; ncm: string; qtd: number; vUn: number }
export interface NotaXML {
  emitente: string; cnpj: string; numero: number; serie: string; chave: string; emissao: string
  pesoKg: number; itens: ItemXML[]
}

const pegar = (el: Element | Document, tag: string) => el.getElementsByTagName(tag)[0]?.textContent?.trim() ?? ''

/** Lê uma NF-e (layout 4.00) e devolve emitente, itens e peso. Lança Error legível se não for uma NF-e. */
export function lerNFe(texto: string): NotaXML {
  const doc = new DOMParser().parseFromString(texto, 'application/xml')
  if (doc.getElementsByTagName('parsererror').length) throw new Error('O arquivo não é um XML válido.')
  const dets = Array.from(doc.getElementsByTagName('det'))
  if (dets.length === 0) throw new Error('Não encontrei itens de produto neste XML. Confira se é uma NF-e.')
  const emit = doc.getElementsByTagName('emit')[0]
  const infNFe = doc.getElementsByTagName('infNFe')[0]
  const chave = (infNFe?.getAttribute('Id') ?? pegar(doc, 'chNFe')).replace(/\D/g, '')
  const vol = doc.getElementsByTagName('vol')
  let pesoKg = 0
  for (const v of Array.from(vol)) pesoKg += Number(pegar(v, 'pesoL') || pegar(v, 'pesoB')) || 0
  return {
    emitente: (emit && pegar(emit, 'xNome')) || 'Fornecedor sem nome',
    cnpj: (emit && pegar(emit, 'CNPJ')) || '',
    numero: Number(pegar(doc, 'nNF')) || 0,
    serie: pegar(doc, 'serie') || '1',
    chave: chave.length === 44 ? chave : chaveAleatoria(),
    emissao: pegar(doc, 'dhEmi') || new Date().toISOString(),
    pesoKg,
    itens: dets.map((d) => {
      const prod = d.getElementsByTagName('prod')[0] ?? d
      return {
        cProd: pegar(prod, 'cProd'), xProd: pegar(prod, 'xProd'), ncm: pegar(prod, 'NCM'),
        qtd: Number(pegar(prod, 'qCom')) || 0, vUn: Number(pegar(prod, 'vUnCom')) || 0,
      }
    }).filter((i) => i.qtd > 0),
  }
}

/** XML de exemplo: fornecedor fictício; 3 itens casam com produtos da store (pelo código do fabricante), 2 são novos. */
export function xmlExemplo(produtos: Produto[]): string {
  const cod = (slug: string, i: number) => produtos.find((p) => p.id === `prd-${slug}`)?.codigoFabricante ?? produtos[i]?.codigoFabricante ?? `YC.DJ.SS000${i}.01`
  const itens: [string, string, string, number, number][] = [
    [cod('hel-t40', 0), 'Helice 62 pol par CW/CCW', '8803.30.00', 20, 302.5],
    [cod('bico-t40', 1), 'Bico centrifugo T40/T50', '8424.89.90', 12, 398],
    [cod('parafuso-helice', 2), 'Parafuso de helice M5 pacote 10', '7318.15.00', 100, 36.4],
    ['NC-FILTRO-040', 'Filtro de linha 40 mesh (novo)', '8421.99.99', 30, 18.9],
    ['NC-SENSOR-NIV', 'Sensor de nivel do tanque (novo)', '9026.10.19', 6, 142],
  ]
  const det = itens.map(([c, n, ncm, q, v], i) => `
    <det nItem="${i + 1}"><prod><cProd>${c}</cProd><xProd>${n}</xProd><NCM>${ncm.replace(/\./g, '')}</NCM><CFOP>5102</CFOP><uCom>UN</uCom><qCom>${q.toFixed(4)}</qCom><vUnCom>${v.toFixed(2)}</vUnCom><vProd>${(q * v).toFixed(2)}</vProd></prod></det>`).join('')
  const total = itens.reduce((s, [, , , q, v]) => s + q * v, 0)
  return `<?xml version="1.0" encoding="UTF-8"?>
<nfeProc xmlns="http://www.portalfiscal.inf.br/nfe" versao="4.00"><NFe><infNFe Id="NFe${'3524110000000000020055001000008821100008821'.padEnd(44, '0').slice(0, 44)}" versao="4.00">
  <ide><nNF>8821</nNF><serie>1</serie><dhEmi>${new Date().toISOString()}</dhEmi></ide>
  <emit><CNPJ>00000000000200</CNPJ><xNome>Componentes Aéreos Brasil Ltda (exemplo)</xNome></emit>${det}
  <total><ICMSTot><vNF>${total.toFixed(2)}</vNF></ICMSTot></total>
  <transp><vol><qVol>4</qVol><esp>CAIXA</esp><pesoL>9.850</pesoL><pesoB>11.200</pesoB></vol></transp>
</infNFe></NFe></nfeProc>`
}
