// Mapeamento de respostas para arquétipos
const ARCHETYPE_MAP: Record<string, Record<string, string>> = {
  q1: { A: 'Cuidador', B: 'Explorador', C: 'Sábio', D: 'Bobo da Corte' },
  q2: { A: 'Governante', B: 'Herói', C: 'Cuidador', D: 'Explorador' },
  q3: { A: 'Bobo da Corte', B: 'Cuidador', C: 'Criador', D: 'Sábio' },
  q4: { A: 'Sábio', B: 'Inocente', C: 'Herói', D: 'Amante' },
  q5: { A: 'Sábio', B: 'Herói', C: 'Criador', D: 'Cara Comum' },
  q6: { A: 'Herói', B: 'Governante', C: 'Inocente', D: 'Amante' },
  q7: { A: 'Criador', B: 'Cuidador', C: 'Sábio', D: 'Explorador' },
  q8: { A: 'Herói', B: 'Sábio', C: 'Cara Comum', D: 'Amante' },
  q9: { A: 'Bobo da Corte', B: 'Herói', C: 'Cuidador', D: 'Sábio' },
  q10: { A: 'Amante', B: 'Herói', C: 'Cuidador', D: 'Sábio' },
  q11: { A: 'Herói', B: 'Cuidador', C: 'Sábio', D: 'Bobo da Corte' },
  q12: { A: 'Rebelde', B: 'Amante', C: 'Inocente', D: 'Sábio' }
}

// Descrições positivas dos arquétipos (visíveis para participante)
export const ARCHETYPE_DESCRIPTIONS: Record<string, { description: string; icon: string }> = {
  'Inocente': {
    description: 'Você enxerga o mundo com otimismo e acredita genuinamente no bem. Sua pureza de intenções inspira as pessoas ao seu redor.',
    icon: '🌟'
  },
  'Cara Comum': {
    description: 'Você valoriza conexões autênticas e pertencimento. As pessoas se sentem à vontade com você porque é genuíno e acessível.',
    icon: '🤝'
  },
  'Herói': {
    description: 'Você tem coragem para enfrentar desafios e determinação para vencer. Não desiste fácil e inspira outros com sua força.',
    icon: '⚔️'
  },
  'Cuidador': {
    description: 'Você tem um coração generoso e se realiza ajudando os outros. Sua empatia e cuidado fazem diferença na vida das pessoas.',
    icon: '💝'
  },
  'Explorador': {
    description: 'Você busca liberdade e novas experiências. Sua curiosidade te leva a descobrir caminhos que outros nem imaginam.',
    icon: '🧭'
  },
  'Rebelde': {
    description: 'Você questiona o status quo e não tem medo de ser diferente. Sua autenticidade abre portas para mudanças necessárias.',
    icon: '🔥'
  },
  'Amante': {
    description: 'Você valoriza conexões profundas e momentos especiais. Sua paixão pela vida contagia quem está perto.',
    icon: '❤️'
  },
  'Criador': {
    description: 'Você tem visão artística e necessidade de expressar sua originalidade. Suas criações deixam sua marca única no mundo.',
    icon: '🎨'
  },
  'Bobo da Corte': {
    description: 'Você traz leveza e alegria por onde passa. Seu humor e espontaneidade tornam a vida mais divertida para todos.',
    icon: '🎭'
  },
  'Sábio': {
    description: 'Você busca entender o mundo em profundidade. Seu conhecimento e reflexão trazem clareza para situações complexas.',
    icon: '📚'
  },
  'Mago': {
    description: 'Você acredita em transformação e faz acontecer. Sua visão de possibilidades transforma sonhos em realidade.',
    icon: '✨'
  },
  'Governante': {
    description: 'Você tem presença natural e capacidade de organizar o caos. Sua liderança traz ordem e direção.',
    icon: '👑'
  }
}

// Combinações de arquétipos
const ARCHETYPE_COMBINATIONS: Record<string, string> = {
  'Herói-Criador': 'Você combina a coragem de enfrentar desafios com a criatividade para encontrar soluções únicas. É alguém que não só sonha, mas faz acontecer do seu jeito.',
  'Herói-Sábio': 'Sua força está em agir com sabedoria. Você enfrenta desafios de forma estratégica, usando conhecimento como sua maior arma.',
  'Herói-Cuidador': 'Você une força com compaixão. Luta pelos outros e protege quem precisa, sendo uma presença inspiradora e acolhedora.',
  'Herói-Explorador': 'Aventura e coragem definem você. Busca novos horizontes com determinação, desbravando caminhos inexplorados.',
  'Cuidador-Sábio': 'Você une empatia com conhecimento profundo. As pessoas confiam em você porque além de se importar, você realmente entende.',
  'Cuidador-Criador': 'Sua criatividade serve para ajudar os outros. Você encontra formas únicas de cuidar e apoiar quem está ao seu redor.',
  'Cuidador-Inocente': 'Você cuida com pureza de coração. Sua bondade genuína toca as pessoas e cria conexões verdadeiras.',
  'Sábio-Criador': 'Conhecimento e criatividade se unem em você. Usa o que aprende para criar soluções inovadoras e originais.',
  'Sábio-Governante': 'Lidera com sabedoria e estratégia. Suas decisões são embasadas e inspiram confiança nos outros.',
  'Sábio-Explorador': 'Busca conhecimento em todas as direções. Sua curiosidade intelectual te leva a descobertas únicas.',
  'Criador-Rebelde': 'Você cria quebrando padrões. Sua originalidade desafia o convencional e abre novos caminhos.',
  'Criador-Amante': 'Cria com paixão e sensibilidade. Suas obras tocam o coração das pessoas e expressam emoções profundas.',
  'Explorador-Rebelde': 'Liberdade é sua essência. Você questiona limites e busca experiências que expandem horizontes.',
  'Explorador-Amante': 'Vive intensamente cada momento. Busca experiências que toquem o coração e criem memórias.',
  'Amante-Inocente': 'Ama com pureza e entrega. Sua capacidade de conexão emocional é genuína e inspiradora.',
  'Governante-Herói': 'Lidera na linha de frente. Você não só dá direção, mas também entra em campo e faz acontecer.',
  'Bobo da Corte-Criador': 'Usa humor e criatividade para expressar verdades. Sua leveza traz insights através do riso.',
  'Bobo da Corte-Explorador': 'Encontra alegria em cada aventura. Sua espontaneidade transforma jornadas em diversão.',
}

export interface ArchetypeResult {
  primary: string
  secondary: string
}

export function calculateArchetypes(answers: Record<string, string>): ArchetypeResult {
  const scores: Record<string, number> = {}

  Object.entries(answers).forEach(([question, answer]) => {
    if (question.startsWith('q') && ARCHETYPE_MAP[question]) {
      const archetype = ARCHETYPE_MAP[question]?.[answer]
      if (archetype) {
        scores[archetype] = (scores[archetype] || 0) + 1
      }
    }
  })

  const sorted = Object.entries(scores)
    .sort((a, b) => b[1] - a[1])

  return {
    primary: sorted[0]?.[0] || 'Herói',
    secondary: sorted[1]?.[0] || 'Sábio'
  }
}

export function getCombinedDescription(primary: string, secondary: string): string {
  const key = `${primary}-${secondary}`
  const reverseKey = `${secondary}-${primary}`

  return ARCHETYPE_COMBINATIONS[key] ||
    ARCHETYPE_COMBINATIONS[reverseKey] ||
    `Você combina a essência do ${primary} com traços do ${secondary}, criando uma personalidade única e poderosa.`
}

export function getArchetypeInfo(archetype: string) {
  return ARCHETYPE_DESCRIPTIONS[archetype] || {
    description: 'Uma personalidade única e especial.',
    icon: '✨'
  }
}
