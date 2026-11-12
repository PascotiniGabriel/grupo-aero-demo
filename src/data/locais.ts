import type { Local } from '@/types'
import { diasAtras } from './util'

// Coordenadas fictícias, plausíveis para a região (Barra da Estiva, Ibicoara e Mucugê - BA, oeste baiano, Cruz Alta - RS).
// Não correspondem a endereço de nenhuma pessoa.
const L = (lat: number, lng: number, descricao: string, referencia: string, origem: Local['origem'], dias: number): Local => ({
  lat, lng, descricao, referencia, origem, atualizadoEm: diasAtras(dias),
})

/** Locais de atendimento por cliente (zona rural). */
export const LOCAIS_CLIENTES: Record<string, Local[]> = {
  'cli-01': [
    L(-13.5412, -41.4120, 'Sede da Fazenda Santa Luzia', 'Porteira azul à direita, 3 km de estrada de chão depois do posto da serra', 'cadastro', 400),
    L(-13.4875, -41.2987, 'Talhões baixos (T25)', 'Entrar na segunda estrada de terra após a ponte de madeira', 'whatsapp', 120),
  ],
  'cli-02': [
    L(-13.3560, -41.3340, 'Sede da Agropecuária Vale do Paramirim', 'Depois do açude grande, estrada sem placa, 5 km', 'whatsapp', 90),
    L(-13.3902, -41.2215, 'Pivô norte', 'Cerca de arame com mourão pintado de branco; sem sinal de celular', 'tecnico', 30),
  ],
  'cli-03': [
    L(-12.9410, -41.4350, 'Sede dos Cafés Serra Azul', 'Subir a serra pela estrada de pedra, galpão de secagem na curva', 'cadastro', 500),
    L(-13.0233, -41.3102, 'Lavoura de café do vale', 'Estrada de chão que sai da BA-142, 7 km, atravessa um riacho', 'whatsapp', 60),
  ],
  'cli-04': [L(-13.7050, -41.2700, 'Sítio do José Carlos', 'Casa branca depois da igrejinha do povoado, 2 km de chão', 'whatsapp', 45)],
  'cli-05': [
    L(-12.2230, -45.9120, 'Base operacional Aerolavoura', 'Estrada vicinal, galpão cinza com antena na frente', 'cadastro', 300),
    L(-12.3341, -45.6203, 'Lavoura de soja, fazenda parceira', 'Porteira de ferro, 9 km de estrada de chão após o silo', 'whatsapp', 14),
  ],
  'cli-06': [
    L(-28.5120, -53.7340, 'Sede da Fazenda Três Coxilhas', 'Linha Três Coxilhas, porteira com roda de carroça, 2 km de chão', 'cadastro', 400),
    L(-28.7015, -53.4410, 'Lavoura de soja da coxilha alta', 'Depois da capela, segunda estrada à esquerda', 'whatsapp', 20),
  ],
  'cli-08': [L(-29.1530, -53.8210, 'Lavouras associadas da cooperativa', 'Estrada municipal, placa da cooperativa na entrada', 'cadastro', 200)],
  'cli-09': [L(-29.0210, -53.9120, 'Granja Boa Esperança', 'Km 21 da estrada municipal, aviário à direita', 'cadastro', 150)],
  'cli-14': [L(-13.3920, -41.2650, 'Sítio em Água de Rega', 'Casa de pedra à esquerda, estrada de chão sem asfalto', 'whatsapp', 25)],
}

/** OS atendidas em campo: id da OS -> [cliente, índice do local]. */
export const OS_CAMPO: Record<string, [string, number]> = {
  'os-1033': ['cli-06', 1],
  'os-1034': ['cli-03', 1],
  'os-1035': ['cli-05', 1],
  'os-1039': ['cli-01', 0],
  'os-1040': ['cli-02', 0],
}
