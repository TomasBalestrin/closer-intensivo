// Mapeamento de respostas para DISC (10 perguntas específicas)
// Cada traço D-I-S-C aparece em todas as perguntas
const DISC_MAP: Record<string, Record<string, 'D' | 'I' | 'S' | 'C'>> = {
  qd1: { A: 'D', B: 'S', C: 'C', D: 'I' },
  qd2: { A: 'D', B: 'S', C: 'C', D: 'I' },
  qd3: { A: 'D', B: 'S', C: 'C', D: 'I' },
  qd4: { A: 'D', B: 'S', C: 'C', D: 'I' },
  qd5: { A: 'D', B: 'S', C: 'C', D: 'I' },
  qd6: { A: 'D', B: 'S', C: 'C', D: 'I' },
  qd7: { A: 'D', B: 'S', C: 'C', D: 'I' },
  qd8: { A: 'D', B: 'S', C: 'C', D: 'I' },
  qd9: { A: 'D', B: 'S', C: 'C', D: 'I' },
  qd10: { A: 'D', B: 'S', C: 'C', D: 'I' }
}

// Descrições dos perfis DISC para closers
export const DISC_DESCRIPTIONS: Record<string, {
  name: string
  traits: string[]
  buyingStyle: string
  communication: string
  fears: string[]
  motivators: string[]
}> = {
  D: {
    name: 'Dominância',
    traits: ['Direto', 'Decisivo', 'Competitivo', 'Orientado a resultados'],
    buyingStyle: 'Decide rápido se vê valor. Não gosta de enrolação.',
    communication: 'Seja direto, vá ao ponto, mostre resultados.',
    fears: ['Perder controle', 'Ser passado para trás', 'Parecer fraco'],
    motivators: ['Resultados', 'Eficiência', 'Controle', 'Vitória']
  },
  I: {
    name: 'Influência',
    traits: ['Entusiasta', 'Otimista', 'Sociável', 'Persuasivo'],
    buyingStyle: 'Compra pela emoção e relacionamento. Gosta de se sentir especial.',
    communication: 'Seja animado, conte histórias, faça elogios genuínos.',
    fears: ['Rejeição', 'Não ser ouvido', 'Perder popularidade'],
    motivators: ['Reconhecimento', 'Aprovação social', 'Diversão', 'Novas experiências']
  },
  S: {
    name: 'Estabilidade',
    traits: ['Paciente', 'Leal', 'Previsível', 'Orientado a equipe'],
    buyingStyle: 'Precisa de tempo e segurança. Busca consenso.',
    communication: 'Seja paciente, não pressione, dê garantias.',
    fears: ['Mudanças bruscas', 'Conflito', 'Perder segurança'],
    motivators: ['Segurança', 'Harmonia', 'Estabilidade', 'Ajudar outros']
  },
  C: {
    name: 'Conformidade',
    traits: ['Analítico', 'Preciso', 'Sistemático', 'Cauteloso'],
    buyingStyle: 'Pesquisa muito antes de decidir. Quer dados e provas.',
    communication: 'Seja preciso, traga dados, respeite seu tempo de análise.',
    fears: ['Estar errado', 'Críticas ao trabalho', 'Falta de qualidade'],
    motivators: ['Precisão', 'Qualidade', 'Competência', 'Autonomia']
  }
}

// Combinações de perfis DISC com estratégias específicas
export const DISC_COMBINATIONS: Record<string, {
  profile: string
  description: string
  approachTips: string[]
}> = {
  DI: {
    profile: 'Dominante-Influente',
    description: 'Pessoa dinâmica que quer resultados mas também valoriza relacionamentos. Decide rápido se gostar de você.',
    approachTips: [
      'Comece com rapport rápido, depois vá direto ao ponto',
      'Mostre resultados de outros clientes (prova social)',
      'Deixe ela sentir que está no controle da decisão',
      'Use urgência real, não artificial'
    ]
  },
  DC: {
    profile: 'Dominante-Analítico',
    description: 'Pessoa que quer resultados mas precisa de dados para decidir. Não tolera papo furado.',
    approachTips: [
      'Vá direto aos números e resultados',
      'Tenha dados prontos para qualquer pergunta',
      'Não exagere - será pego na mentira',
      'Respeite o tempo dela, seja eficiente'
    ]
  },
  DS: {
    profile: 'Dominante-Estável',
    description: 'Líder que se preocupa com a equipe. Quer resultados mas considera impacto nos outros.',
    approachTips: [
      'Mostre como beneficia ela E as pessoas ao redor',
      'Dê exemplos de líderes que obtiveram resultados',
      'Ofereça suporte contínuo, não só a venda',
      'Seja consistente e confiável'
    ]
  },
  ID: {
    profile: 'Influente-Dominante',
    description: 'Pessoa carismática que também é competitiva. Quer brilhar e vencer.',
    approachTips: [
      'Faça ela se sentir especial e exclusiva',
      'Mostre como será reconhecida pelos resultados',
      'Use testemunhos de pessoas admiradas',
      'Crie senso de oportunidade única'
    ]
  },
  IS: {
    profile: 'Influente-Estável',
    description: 'Pessoa acolhedora que valoriza relacionamentos profundos. Muito leal quando confia.',
    approachTips: [
      'Invista tempo em construir rapport genuíno',
      'Pergunte sobre família e pessoas importantes',
      'Não pressione - deixe ela processar',
      'Mostre que estará lá para apoiar depois da venda'
    ]
  },
  IC: {
    profile: 'Influente-Analítico',
    description: 'Pessoa social mas que também pesquisa. Quer se sentir bem E ter certeza.',
    approachTips: [
      'Combine histórias emocionais com dados',
      'Deixe ela fazer perguntas detalhadas',
      'Valide as preocupações antes de responder',
      'Dê tempo mas mantenha entusiasmo'
    ]
  },
  SD: {
    profile: 'Estável-Dominante',
    description: 'Pessoa que lidera de forma calma. Quer segurança mas também resultados.',
    approachTips: [
      'Mostre estabilidade e previsibilidade do resultado',
      'Dê garantias concretas',
      'Apresente um plano claro passo a passo',
      'Não pressione, mas mostre resultados possíveis'
    ]
  },
  SI: {
    profile: 'Estável-Influente',
    description: 'Pessoa calorosa e paciente. Compra para ajudar os outros, não só para si.',
    approachTips: [
      'Foque em como ajudará as pessoas que ela ama',
      'Seja genuinamente amigável e presente',
      'Dê muito tempo e não pressione',
      'Ofereça suporte e acompanhamento constante'
    ]
  },
  SC: {
    profile: 'Estável-Analítico',
    description: 'Pessoa muito cuidadosa nas decisões. Precisa de segurança E dados.',
    approachTips: [
      'Seja o mais detalhado e transparente possível',
      'Antecipe todas as objeções com dados',
      'Ofereça garantias estendidas se possível',
      'Dê tempo - pressão só afasta'
    ]
  },
  CD: {
    profile: 'Analítico-Dominante',
    description: 'Pessoa que pesquisa muito mas decide com firmeza. Respeita competência.',
    approachTips: [
      'Demonstre conhecimento técnico profundo',
      'Tenha respostas precisas para tudo',
      'Seja direto após apresentar os dados',
      'Não seja emotivo - seja factual'
    ]
  },
  CI: {
    profile: 'Analítico-Influente',
    description: 'Pessoa que analisa mas também valoriza relacionamento. Quer confiar antes de comprar.',
    approachTips: [
      'Construa credibilidade com dados E rapport',
      'Seja autêntico - ela percebe falsidade',
      'Responda perguntas com paciência e completude',
      'Mostre casos de sucesso detalhados'
    ]
  },
  CS: {
    profile: 'Analítico-Estável',
    description: 'Pessoa muito cautelosa. Precisa de muita segurança para decidir.',
    approachTips: [
      'Seja extremamente paciente e detalhista',
      'Ofereça todas as garantias possíveis',
      'Não use urgência - causa desconfiança',
      'Deixe ela consultar outras pessoas se precisar'
    ]
  }
}

export interface DISCResult {
  profile: string // Ex: 'DI', 'SC'
  primary: 'D' | 'I' | 'S' | 'C'
  secondary: 'D' | 'I' | 'S' | 'C'
  scores: {
    D: number
    I: number
    S: number
    C: number
  }
}

export function calculateDISC(answers: Record<string, string>): DISCResult {
  const scores = { D: 0, I: 0, S: 0, C: 0 }

  Object.entries(answers).forEach(([question, answer]) => {
    // Process DISC questions (qd1-qd10)
    if (question.startsWith('qd') && DISC_MAP[question]) {
      const trait = DISC_MAP[question]?.[answer]
      if (trait) {
        scores[trait]++
      }
    }
  })

  // Normalizar para porcentagem (10 questões = 100%)
  const total = Object.values(scores).reduce((a, b) => a + b, 0) || 1
  const normalized = {
    D: Math.round((scores.D / total) * 100) / 10,
    I: Math.round((scores.I / total) * 100) / 10,
    S: Math.round((scores.S / total) * 100) / 10,
    C: Math.round((scores.C / total) * 100) / 10
  }

  // Encontrar primário e secundário
  const sorted = Object.entries(scores)
    .sort((a, b) => b[1] - a[1]) as [keyof typeof scores, number][]

  const primary = sorted[0][0]
  const secondary = sorted[1][0]

  return {
    profile: `${primary}${secondary}`,
    primary,
    secondary,
    scores: normalized
  }
}

export function getDISCProfileInfo(profile: string) {
  return DISC_COMBINATIONS[profile] || {
    profile: 'Perfil Misto',
    description: 'Perfil equilibrado com características variadas.',
    approachTips: ['Adapte sua abordagem conforme a conversa evolui']
  }
}

export function getDISCTraitInfo(trait: 'D' | 'I' | 'S' | 'C') {
  return DISC_DESCRIPTIONS[trait]
}
