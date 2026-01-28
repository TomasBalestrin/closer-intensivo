// Mapeamento de respostas para arquétipos (10 perguntas × 6 opções)
// Cada arquétipo aparece 5 vezes para distribuição equilibrada
const ARCHETYPE_MAP: Record<string, Record<string, string>> = {
  q1: { A: 'Inocente', B: 'Herói', C: 'Sábio', D: 'Explorador', E: 'Mago', F: 'Cuidador' },
  q2: { A: 'Governante', B: 'Amante', C: 'Rebelde', D: 'Bobo da Corte', E: 'Cara Comum', F: 'Criador' },
  q3: { A: 'Herói', B: 'Mago', C: 'Cuidador', D: 'Criador', E: 'Sábio', F: 'Governante' },
  q4: { A: 'Cara Comum', B: 'Explorador', C: 'Cuidador', D: 'Rebelde', E: 'Amante', F: 'Inocente' },
  q5: { A: 'Herói', B: 'Sábio', C: 'Criador', D: 'Bobo da Corte', E: 'Governante', F: 'Inocente' },
  q6: { A: 'Amante', B: 'Cara Comum', C: 'Explorador', D: 'Rebelde', E: 'Cuidador', F: 'Mago' },
  q7: { A: 'Herói', B: 'Bobo da Corte', C: 'Criador', D: 'Governante', E: 'Sábio', F: 'Mago' },
  q8: { A: 'Cuidador', B: 'Explorador', C: 'Amante', D: 'Rebelde', E: 'Cara Comum', F: 'Inocente' },
  q9: { A: 'Explorador', B: 'Bobo da Corte', C: 'Cara Comum', D: 'Rebelde', E: 'Amante', F: 'Mago' },
  q10: { A: 'Herói', B: 'Cuidador', C: 'Sábio', D: 'Criador', E: 'Governante', F: 'Inocente' }
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

// Combinações de arquétipos com descrições personalizadas
const ARCHETYPE_COMBINATIONS: Record<string, string> = {
  'Herói-Criador': 'Você combina a coragem de enfrentar desafios com a criatividade para encontrar soluções únicas. É alguém que não só sonha, mas faz acontecer do seu jeito.',
  'Herói-Sábio': 'Sua força está em agir com sabedoria. Você enfrenta desafios de forma estratégica, usando conhecimento como sua maior arma.',
  'Herói-Cuidador': 'Você une força com compaixão. Luta pelos outros e protege quem precisa, sendo uma presença inspiradora e acolhedora.',
  'Herói-Explorador': 'Aventura e coragem definem você. Busca novos horizontes com determinação, desbravando caminhos inexplorados.',
  'Herói-Mago': 'Você é um agente de transformação. Sua coragem combinada com visão permite que você mude realidades.',
  'Herói-Governante': 'Líder nato que vai à frente. Você não só dá direção, mas também entra em campo e faz acontecer.',
  'Herói-Amante': 'Você luta pelo que ama com paixão. Sua força vem do coração e inspira outros a também lutarem.',
  'Herói-Rebelde': 'Revolucionário corajoso. Você desafia o sistema e tem força para bancar suas convicções.',
  'Herói-Inocente': 'Idealista que age. Você acredita no bem e tem coragem de lutar por um mundo melhor.',
  'Herói-Cara Comum': 'Herói do dia a dia. Você inspira por ser alguém real que supera desafios como qualquer pessoa.',
  'Herói-Bobo da Corte': 'Você enfrenta desafios com leveza. Usa o humor como força para superar obstáculos.',

  'Cuidador-Sábio': 'Você une empatia com conhecimento profundo. As pessoas confiam em você porque além de se importar, você realmente entende.',
  'Cuidador-Criador': 'Sua criatividade serve para ajudar os outros. Você encontra formas únicas de cuidar e apoiar quem está ao seu redor.',
  'Cuidador-Inocente': 'Você cuida com pureza de coração. Sua bondade genuína toca as pessoas e cria conexões verdadeiras.',
  'Cuidador-Mago': 'Você transforma vidas através do cuidado. Sua presença cura e renova as pessoas ao seu redor.',
  'Cuidador-Governante': 'Líder que cuida. Você organiza e direciona, mas sempre pensando no bem-estar de todos.',
  'Cuidador-Amante': 'Amor em ação. Você demonstra afeto através de cuidados práticos e atenção genuína.',
  'Cuidador-Explorador': 'Você cuida expandindo horizontes. Leva as pessoas para novas experiências de forma segura.',
  'Cuidador-Rebelde': 'Protetor dos marginalizados. Você desafia sistemas que prejudicam quem precisa de cuidado.',
  'Cuidador-Cara Comum': 'Cuidador acessível. Você está sempre presente de forma simples e genuína.',
  'Cuidador-Bobo da Corte': 'Você cuida trazendo alegria. Usa o humor para aliviar dores e fazer sorrir.',

  'Sábio-Criador': 'Conhecimento e criatividade se unem em você. Usa o que aprende para criar soluções inovadoras e originais.',
  'Sábio-Governante': 'Lidera com sabedoria e estratégia. Suas decisões são embasadas e inspiram confiança nos outros.',
  'Sábio-Explorador': 'Busca conhecimento em todas as direções. Sua curiosidade intelectual te leva a descobertas únicas.',
  'Sábio-Mago': 'Você entende os mistérios da transformação. Seu conhecimento permite que você mude realidades.',
  'Sábio-Amante': 'Você ama com profundidade intelectual. Busca conexões que também estimulem a mente.',
  'Sábio-Rebelde': 'Pensador revolucionário. Você questiona verdades estabelecidas com embasamento.',
  'Sábio-Inocente': 'Você busca conhecimento com pureza. Quer entender o mundo para torná-lo melhor.',
  'Sábio-Cara Comum': 'Sabedoria acessível. Você compartilha conhecimento de forma que todos entendam.',
  'Sábio-Bobo da Corte': 'Usa o humor para ensinar verdades. Suas piadas carregam sabedoria profunda.',

  'Criador-Rebelde': 'Você cria quebrando padrões. Sua originalidade desafia o convencional e abre novos caminhos.',
  'Criador-Amante': 'Cria com paixão e sensibilidade. Suas obras tocam o coração das pessoas e expressam emoções profundas.',
  'Criador-Mago': 'Artista transformador. Suas criações não só expressam, mas mudam a realidade.',
  'Criador-Governante': 'Você cria estruturas e sistemas. Sua criatividade se manifesta em organização e liderança.',
  'Criador-Explorador': 'Você cria a partir de experiências. Suas aventuras alimentam sua expressão artística.',
  'Criador-Inocente': 'Cria com pureza e esperança. Suas obras refletem a beleza que você vê no mundo.',
  'Criador-Cara Comum': 'Criador acessível. Você faz arte que conecta com pessoas comuns.',
  'Criador-Bobo da Corte': 'Artista bem-humorado. Usa a criatividade para fazer as pessoas rirem e pensarem.',

  'Explorador-Rebelde': 'Liberdade é sua essência. Você questiona limites e busca experiências que expandem horizontes.',
  'Explorador-Amante': 'Vive intensamente cada momento. Busca experiências que toquem o coração e criem memórias.',
  'Explorador-Mago': 'Cada jornada é transformação. Suas aventuras mudam você e as pessoas ao redor.',
  'Explorador-Governante': 'Líder de expedições. Você guia outros em jornadas de descoberta.',
  'Explorador-Inocente': 'Explora com olhos de criança. Cada descoberta é uma maravilha nova.',
  'Explorador-Cara Comum': 'Aventureiro acessível. Você mostra que qualquer pessoa pode explorar.',
  'Explorador-Bobo da Corte': 'Encontra alegria em cada aventura. Sua espontaneidade transforma jornadas em diversão.',

  'Amante-Inocente': 'Ama com pureza e entrega. Sua capacidade de conexão emocional é genuína e inspiradora.',
  'Amante-Mago': 'Seu amor transforma. Você tem o poder de curar e renovar através de conexões profundas.',
  'Amante-Governante': 'Lidera pelo coração. Suas conexões emocionais inspiram lealdade e comprometimento.',
  'Amante-Rebelde': 'Amor revolucionário. Você desafia convenções em nome do que sente.',
  'Amante-Cara Comum': 'Amor simples e verdadeiro. Suas conexões são genuínas e sem pretensão.',
  'Amante-Bobo da Corte': 'Amor alegre. Você conecta através da risada e da leveza.',

  'Governante-Mago': 'Líder transformador. Você organiza mudanças e direciona transformações.',
  'Governante-Rebelde': 'Líder revolucionário. Você desafia o sistema de dentro para mudá-lo.',
  'Governante-Inocente': 'Lidera com esperança. Você acredita em um mundo melhor e organiza para alcançá-lo.',
  'Governante-Cara Comum': 'Líder acessível. Você organiza sem se colocar acima dos outros.',
  'Governante-Bobo da Corte': 'Lidera com leveza. Usa o humor para manter a harmonia e motivar.',

  'Rebelde-Mago': 'Revolucionário transformador. Você não só questiona, mas muda a realidade.',
  'Rebelde-Inocente': 'Rebelde idealista. Você questiona porque acredita que pode ser melhor.',
  'Rebelde-Cara Comum': 'Rebelde do povo. Você desafia em nome das pessoas comuns.',
  'Rebelde-Bobo da Corte': 'Rebelde bem-humorado. Usa o humor para subverter e questionar.',

  'Mago-Inocente': 'Transformador esperançoso. Você acredita na magia de um mundo melhor.',
  'Mago-Cara Comum': 'Mago acessível. Você mostra que qualquer pessoa pode transformar realidades.',
  'Mago-Bobo da Corte': 'Mago bem-humorado. Suas transformações vêm com leveza e alegria.',

  'Inocente-Cara Comum': 'Bondade simples. Você é genuíno, acessível e acredita no melhor das pessoas.',
  'Inocente-Bobo da Corte': 'Alegria pura. Você traz leveza e esperança por onde passa.',

  'Cara Comum-Bobo da Corte': 'Amigo de todos. Você conecta através do humor e da simplicidade.',
}

export interface ArchetypeResult {
  primary: string
  secondary: string
  scores: Record<string, number>
}

export function calculateArchetypes(answers: Record<string, string>): ArchetypeResult {
  const scores: Record<string, number> = {}

  Object.entries(answers).forEach(([question, answer]) => {
    // Only process archetype questions (q1-q10)
    if (question.startsWith('q') && !question.startsWith('qd') && ARCHETYPE_MAP[question]) {
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
    secondary: sorted[1]?.[0] || 'Sábio',
    scores,
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
