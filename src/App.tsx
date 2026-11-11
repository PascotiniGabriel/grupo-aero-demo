import { lazy } from 'react'
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from '@/components/layout/AppShell'

const Inicio = lazy(() => import('@/pages/inicio/Inicio'))
const Funil = lazy(() => import('@/pages/funil/Funil'))
const OrcamentosLista = lazy(() => import('@/pages/orcamentos/OrcamentosLista'))
const OrcamentoEditor = lazy(() => import('@/pages/orcamentos/OrcamentoEditor'))
const ClientesLista = lazy(() => import('@/pages/clientes/ClientesLista'))
const ClienteDetalhe = lazy(() => import('@/pages/clientes/ClienteDetalhe'))
const Conversas = lazy(() => import('@/pages/conversas/Conversas'))
const OSQuadro = lazy(() => import('@/pages/os/OSQuadro'))
const OSDetalhe = lazy(() => import('@/pages/os/OSDetalhe'))
const RelatoriosLista = lazy(() => import('@/pages/relatorios/RelatoriosLista'))
const RelatorioEditor = lazy(() => import('@/pages/relatorios/RelatorioEditor'))
const EstoqueLista = lazy(() => import('@/pages/estoque/EstoqueLista'))
const ProdutoDetalhe = lazy(() => import('@/pages/estoque/ProdutoDetalhe'))
const Catalogo = lazy(() => import('@/pages/catalogo/Catalogo'))
const Notas = lazy(() => import('@/pages/notas/Notas'))
const Financeiro = lazy(() => import('@/pages/financeiro/Financeiro'))
const Assistente = lazy(() => import('@/pages/assistente/Assistente'))
const Config = lazy(() => import('@/pages/config/Config'))

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route element={<AppShell />}>
          <Route index element={<Inicio />} />
          <Route path="funil" element={<Funil />} />
          <Route path="orcamentos" element={<OrcamentosLista />} />
          <Route path="orcamentos/novo" element={<OrcamentoEditor />} />
          <Route path="orcamentos/:id" element={<OrcamentoEditor />} />
          <Route path="clientes" element={<ClientesLista />} />
          <Route path="clientes/:id" element={<ClienteDetalhe />} />
          <Route path="conversas" element={<Conversas />} />
          <Route path="os" element={<OSQuadro />} />
          <Route path="os/:id" element={<OSDetalhe />} />
          <Route path="relatorios" element={<RelatoriosLista />} />
          <Route path="relatorios/:osId" element={<RelatorioEditor />} />
          <Route path="estoque" element={<EstoqueLista />} />
          <Route path="estoque/:id" element={<ProdutoDetalhe />} />
          <Route path="catalogo" element={<Catalogo />} />
          <Route path="catalogo/:modeloId" element={<Catalogo />} />
          <Route path="notas" element={<Notas />} />
          <Route path="financeiro" element={<Financeiro />} />
          <Route path="assistente" element={<Assistente />} />
          <Route path="config" element={<Config />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </HashRouter>
  )
}
