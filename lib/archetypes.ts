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
export const ARCHETYPE_DESCRIPTIONS: Record<string, { description: string; icon: string; motto: string; traits: string[]; strengths: string[]; detailedDescription: string }> = {
  'Inocente': {
    description: 'Você enxerga o mundo com otimismo e acredita genuinamente no bem. Sua pureza de intenções inspira as pessoas ao seu redor.',
    icon: '🌟',
    motto: '"Acredito que tudo pode dar certo."',
    traits: ['Otimista', 'Confiante', 'Esperançoso', 'Autêntico'],
    strengths: ['Fé inabalável no potencial humano', 'Capacidade de ver o lado bom de tudo', 'Transmite paz e confiança', 'Inspira os outros a acreditarem'],
    detailedDescription: 'O Inocente é aquele que mantém a fé mesmo diante das adversidades. Você possui um dom natural de enxergar beleza e potencial onde outros veem problemas. Sua presença transmite segurança e esperança, criando um ambiente onde as pessoas se sentem livres para sonhar. Você não é ingênuo — é corajoso o suficiente para acreditar que o mundo pode ser melhor, e essa crença genuína se torna contagiante.'
  },
  'Cara Comum': {
    description: 'Você valoriza conexões autênticas e pertencimento. As pessoas se sentem à vontade com você porque é genuíno e acessível.',
    icon: '🤝',
    motto: '"Somos todos iguais e cada um importa."',
    traits: ['Acessível', 'Empático', 'Realista', 'Solidário'],
    strengths: ['Conexão genuína com pessoas de todos os tipos', 'Cria ambientes de inclusão e pertencimento', 'Humildade que gera confiança', 'Força na simplicidade'],
    detailedDescription: 'O Cara Comum possui o poder da conexão verdadeira. Você não precisa de títulos ou status para influenciar — sua autenticidade é sua maior força. As pessoas confiam em você porque sentem que é real, sem máscaras ou pretensões. Essa capacidade de se conectar com qualquer pessoa, independente de quem seja, é uma habilidade rara e extremamente valiosa. Você constrói pontes onde outros constroem muros.'
  },
  'Herói': {
    description: 'Você tem coragem para enfrentar desafios e determinação para vencer. Não desiste fácil e inspira outros com sua força.',
    icon: '⚔️',
    motto: '"Onde há um desafio, há uma oportunidade de crescer."',
    traits: ['Corajoso', 'Determinado', 'Disciplinado', 'Resiliente'],
    strengths: ['Não recua diante de desafios', 'Capacidade de inspirar outros pela ação', 'Resiliência acima da média', 'Mentalidade de crescimento constante'],
    detailedDescription: 'O Herói é movido pela superação. Você não foge dos problemas — vai de frente, com coragem e determinação. Sua maior força não é nunca cair, mas sim levantar toda vez. As pessoas ao seu redor se sentem mais fortes só por estarem perto de você, porque sua energia de luta é contagiante. Você prova que limites são apenas pontos de partida para quem tem garra suficiente.'
  },
  'Cuidador': {
    description: 'Você tem um coração generoso e se realiza ajudando os outros. Sua empatia e cuidado fazem diferença na vida das pessoas.',
    icon: '💝',
    motto: '"Cuidar dos outros é minha forma de mudar o mundo."',
    traits: ['Generoso', 'Empático', 'Protetor', 'Altruísta'],
    strengths: ['Empatia profunda e genuína', 'Capacidade de prever necessidades dos outros', 'Cria laços de confiança duradouros', 'Força que vem do amor ao próximo'],
    detailedDescription: 'O Cuidador encontra sua realização no bem-estar dos outros. Você tem uma sensibilidade especial para perceber quando alguém precisa de apoio — muitas vezes antes mesmo da pessoa perceber. Essa capacidade de acolher e nutrir relações é o alicerce de equipes fortes e famílias unidas. Sua generosidade não é fraqueza; é sua maior demonstração de força. Você entende que cuidar dos outros é uma forma poderosa de construir um legado.'
  },
  'Explorador': {
    description: 'Você busca liberdade e novas experiências. Sua curiosidade te leva a descobrir caminhos que outros nem imaginam.',
    icon: '🧭',
    motto: '"A vida começa onde a zona de conforto termina."',
    traits: ['Aventureiro', 'Curioso', 'Independente', 'Adaptável'],
    strengths: ['Capacidade de se reinventar constantemente', 'Encontra oportunidades onde outros veem o desconhecido', 'Adaptação rápida a novas situações', 'Coragem para trilhar caminhos próprios'],
    detailedDescription: 'O Explorador é movido pela descoberta. Você sente que a vida é grande demais para ser vivida de forma pequena. Onde outros veem risco, você vê possibilidade. Sua inquietude não é nervosismo — é a energia de quem sabe que sempre há algo novo para aprender e conquistar. Você inspira as pessoas ao seu redor a também saírem da rotina e ousarem viver com mais intensidade e propósito.'
  },
  'Rebelde': {
    description: 'Você questiona o status quo e não tem medo de ser diferente. Sua autenticidade abre portas para mudanças necessárias.',
    icon: '🔥',
    motto: '"Regras existem para serem questionadas."',
    traits: ['Autêntico', 'Destemido', 'Visionário', 'Disruptivo'],
    strengths: ['Coragem de pensar diferente', 'Capacidade de desafiar o que não funciona', 'Autenticidade inabalável', 'Motor de mudanças necessárias'],
    detailedDescription: 'O Rebelde é o catalisador de mudanças. Você não aceita as coisas simplesmente porque "sempre foi assim". Essa capacidade de questionar é o que move a evolução. Enquanto outros seguem o fluxo, você tem a coragem de dizer "isso pode ser melhor" — e mais importante, tem a energia para fazer diferente. Sua autenticidade é magnética e inspira outros a também serem verdadeiros consigo mesmos.'
  },
  'Amante': {
    description: 'Você valoriza conexões profundas e momentos especiais. Sua paixão pela vida contagia quem está perto.',
    icon: '❤️',
    motto: '"Viver com paixão é viver de verdade."',
    traits: ['Apaixonado', 'Sensível', 'Comprometido', 'Envolvente'],
    strengths: ['Capacidade de criar conexões emocionais profundas', 'Presença magnética e envolvente', 'Valoriza a beleza em tudo', 'Compromisso intenso com o que ama'],
    detailedDescription: 'O Amante vive com intensidade e propósito. Você não faz nada pela metade — quando se envolve, é de corpo e alma. Essa paixão se reflete em tudo: nos relacionamentos, no trabalho, nos sonhos. As pessoas são naturalmente atraídas pela sua energia porque você vive de forma autêntica e intensa. Sua capacidade de se conectar emocionalmente é um dom raro que transforma encontros comuns em momentos memoráveis.'
  },
  'Criador': {
    description: 'Você tem visão artística e necessidade de expressar sua originalidade. Suas criações deixam sua marca única no mundo.',
    icon: '🎨',
    motto: '"Se posso imaginar, posso criar."',
    traits: ['Criativo', 'Original', 'Visionário', 'Expressivo'],
    strengths: ['Imaginação sem limites', 'Capacidade de transformar ideias em realidade', 'Visão única do mundo', 'Expressão autêntica que inspira'],
    detailedDescription: 'O Criador transforma o invisível em visível. Você possui uma mente que não para de gerar ideias, soluções e possibilidades. Onde outros veem o que é, você enxerga o que poderia ser. Essa capacidade de imaginar e materializar é o que move a inovação e o progresso. Sua originalidade não é apenas sobre arte — é sobre uma forma única de ver e moldar o mundo ao seu redor, deixando sua marca em tudo que toca.'
  },
  'Bobo da Corte': {
    description: 'Você traz leveza e alegria por onde passa. Seu humor e espontaneidade tornam a vida mais divertida para todos.',
    icon: '🎭',
    motto: '"A vida é muito importante para ser levada a sério."',
    traits: ['Divertido', 'Espontâneo', 'Perspicaz', 'Carismático'],
    strengths: ['Transforma ambientes com sua energia', 'Capacidade de aliviar tensões', 'Inteligência disfarçada de humor', 'Conecta pessoas através da alegria'],
    detailedDescription: 'O Bobo da Corte é muito mais do que humor — é inteligência emocional em sua forma mais pura. Você tem o dom de ler ambientes e pessoas, usando a leveza para desarmar conflitos, aproximar pessoas e trazer perspectiva. Historicamente, o Bobo da Corte era o único que podia dizer verdades ao rei. Assim é você: usa o humor para comunicar o que precisa ser dito, tornando verdades difíceis mais fáceis de aceitar. Sua alegria é contagiante e transformadora.'
  },
  'Sábio': {
    description: 'Você busca entender o mundo em profundidade. Seu conhecimento e reflexão trazem clareza para situações complexas.',
    icon: '📚',
    motto: '"O conhecimento é a chave que abre todas as portas."',
    traits: ['Analítico', 'Reflexivo', 'Objetivo', 'Estratégico'],
    strengths: ['Pensamento profundo e estratégico', 'Capacidade de simplificar o complexo', 'Visão clara em momentos de confusão', 'Confiança baseada em conhecimento'],
    detailedDescription: 'O Sábio busca a verdade acima de tudo. Você tem uma mente que não se contenta com respostas superficiais — precisa entender o porquê das coisas. Essa profundidade de pensamento te permite enxergar padrões e soluções que outros não percebem. As pessoas recorrem a você quando precisam de clareza, porque sua capacidade de analisar e sintetizar informações traz luz a situações complexas. Seu conhecimento não é apenas teórico — é sabedoria aplicada.'
  },
  'Mago': {
    description: 'Você acredita em transformação e faz acontecer. Sua visão de possibilidades transforma sonhos em realidade.',
    icon: '✨',
    motto: '"Toda realidade pode ser transformada."',
    traits: ['Transformador', 'Intuitivo', 'Visionário', 'Carismático'],
    strengths: ['Capacidade de transformar realidades', 'Visão além do óbvio', 'Intuição apurada para oportunidades', 'Poder de catalisar mudanças'],
    detailedDescription: 'O Mago é o agente de transformação. Você enxerga possibilidades onde outros veem impossibilidades. Sua maior força é a capacidade de pegar uma situação aparentemente travada e encontrar a chave que muda tudo. As pessoas se sentem renovadas perto de você porque sua energia transmite a mensagem de que é possível mudar, crescer e evoluir. Você não aceita o destino como ele é — você o recria.'
  },
  'Governante': {
    description: 'Você tem presença natural e capacidade de organizar o caos. Sua liderança traz ordem e direção.',
    icon: '👑',
    motto: '"Liderar é servir com excelência."',
    traits: ['Líder', 'Organizado', 'Responsável', 'Confiável'],
    strengths: ['Presença de comando natural', 'Capacidade de organizar caos em ordem', 'Visão estratégica de longo prazo', 'Inspira confiança e segurança'],
    detailedDescription: 'O Governante é o pilar que sustenta. Você tem uma presença natural que faz as pessoas confiarem na sua direção. Não é sobre controle — é sobre responsabilidade. Você assume o que precisa ser feito e organiza o caminho para que todos cheguem onde precisam. Sua liderança não vem do título, mas da sua capacidade de criar ordem, dar direção e manter todos alinhados com um propósito maior.'
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
    icon: '✨',
    motto: '',
    traits: [],
    strengths: [],
    detailedDescription: ''
  }
}
