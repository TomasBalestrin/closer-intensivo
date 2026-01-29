'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { Button, Card, CardContent, Loading } from '@/components/ui'
import { CheckCircle, Sparkles, ChevronRight, ChevronLeft, Flame } from 'lucide-react'

// 10 Perguntas de Arquétipos (6 opções cada - distribuição equilibrada)
const archetypeQuestions = [
  {
    id: 'q1',
    question: 'O que mais te motiva na vida?',
    options: [
      { value: 'A', label: 'Viver com esperança e acreditar no melhor das pessoas' },
      { value: 'B', label: 'Superar desafios e provar minha força' },
      { value: 'C', label: 'Buscar conhecimento e entender como tudo funciona' },
      { value: 'D', label: 'Explorar o mundo e viver novas experiências' },
      { value: 'E', label: 'Transformar realidades e fazer o impossível acontecer' },
      { value: 'F', label: 'Cuidar e ajudar as pessoas que precisam' },
    ],
  },
  {
    id: 'q2',
    question: 'Como você prefere ser visto pelos outros?',
    options: [
      { value: 'A', label: 'Como alguém com autoridade e presença' },
      { value: 'B', label: 'Como alguém apaixonante e intenso' },
      { value: 'C', label: 'Como alguém autêntico que não segue regras' },
      { value: 'D', label: 'Como alguém divertido e que traz alegria' },
      { value: 'E', label: 'Como alguém simples e acessível' },
      { value: 'F', label: 'Como alguém criativo e original' },
    ],
  },
  {
    id: 'q3',
    question: 'Quando enfrenta um problema difícil, você:',
    options: [
      { value: 'A', label: 'Enfrenta de frente com coragem e determinação' },
      { value: 'B', label: 'Busca uma solução transformadora e inovadora' },
      { value: 'C', label: 'Pensa em como sua decisão afeta os outros' },
      { value: 'D', label: 'Procura criar uma solução única e original' },
      { value: 'E', label: 'Analisa com calma antes de agir' },
      { value: 'F', label: 'Toma controle da situação e organiza tudo' },
    ],
  },
  {
    id: 'q4',
    question: 'Em um grupo, você naturalmente:',
    options: [
      { value: 'A', label: 'Se conecta facilmente com todos de forma simples' },
      { value: 'B', label: 'Busca novas possibilidades e desafia limites' },
      { value: 'C', label: 'Cuida para que todos estejam bem' },
      { value: 'D', label: 'Questiona regras que não fazem sentido' },
      { value: 'E', label: 'Cria conexões intensas e significativas' },
      { value: 'F', label: 'Mantém a paz e harmonia' },
    ],
  },
  {
    id: 'q5',
    question: 'O que te faz sentir mais realizado?',
    options: [
      { value: 'A', label: 'Vencer um grande desafio ou competição' },
      { value: 'B', label: 'Descobrir uma verdade ou entender algo profundo' },
      { value: 'C', label: 'Criar algo único que expressa quem eu sou' },
      { value: 'D', label: 'Fazer as pessoas rirem e se sentirem bem' },
      { value: 'E', label: 'Liderar um projeto ou equipe ao sucesso' },
      { value: 'F', label: 'Ver bondade e beleza no mundo' },
    ],
  },
  {
    id: 'q6',
    question: 'Nos relacionamentos, você valoriza:',
    options: [
      { value: 'A', label: 'Conexão emocional intensa e momentos especiais' },
      { value: 'B', label: 'Autenticidade e conversas simples e verdadeiras' },
      { value: 'C', label: 'Liberdade para ser quem você é' },
      { value: 'D', label: 'Parceiros que desafiam padrões com você' },
      { value: 'E', label: 'Poder cuidar e apoiar seu parceiro' },
      { value: 'F', label: 'Crescimento mútuo e transformação' },
    ],
  },
  {
    id: 'q7',
    question: 'Diante de uma injustiça, você:',
    options: [
      { value: 'A', label: 'Luta ativamente para corrigir o erro' },
      { value: 'B', label: 'Usa humor para expor a hipocrisia' },
      { value: 'C', label: 'Cria formas alternativas de resolver' },
      { value: 'D', label: 'Assume a liderança para mudar as coisas' },
      { value: 'E', label: 'Busca entender todos os lados primeiro' },
      { value: 'F', label: 'Encontra uma forma de transformar a situação' },
    ],
  },
  {
    id: 'q8',
    question: 'Como você lida com mudanças na vida?',
    options: [
      { value: 'A', label: 'Focando em como posso ajudar outros na transição' },
      { value: 'B', label: 'Vendo como uma aventura e oportunidade' },
      { value: 'C', label: 'Deixando-me levar pela emoção e intuição' },
      { value: 'D', label: 'Questionando se a mudança faz sentido' },
      { value: 'E', label: 'Adaptando-me sem drama, seguindo o fluxo' },
      { value: 'F', label: 'Mantendo a fé de que tudo vai dar certo' },
    ],
  },
  {
    id: 'q9',
    question: 'Seu passatempo ideal seria:',
    options: [
      { value: 'A', label: 'Explorar lugares novos ou fazer trilhas' },
      { value: 'B', label: 'Atividades divertidas com amigos e risadas' },
      { value: 'C', label: 'Tempo de qualidade com pessoas próximas' },
      { value: 'D', label: 'Algo que quebre a rotina e desafie regras' },
      { value: 'E', label: 'Experiências românticas ou artísticas' },
      { value: 'F', label: 'Práticas de autoconhecimento e transformação' },
    ],
  },
  {
    id: 'q10',
    question: 'O que você quer deixar como legado?',
    options: [
      { value: 'A', label: 'Ter vencido grandes batalhas e inspirado outros' },
      { value: 'B', label: 'Ter feito diferença na vida das pessoas' },
      { value: 'C', label: 'Conhecimento e sabedoria compartilhados' },
      { value: 'D', label: 'Criações únicas que representam quem eu sou' },
      { value: 'E', label: 'Um império ou organização de sucesso' },
      { value: 'F', label: 'Um mundo mais puro e cheio de esperança' },
    ],
  },
]

// 10 Perguntas DISC (4 opções cada - A=D, B=S, C=C, D=I)
const discQuestions = [
  {
    id: 'qd1',
    question: 'No trabalho, você prefere:',
    options: [
      { value: 'A', label: 'Tomar decisões rápidas e ir direto ao ponto' },
      { value: 'B', label: 'Manter um ritmo estável e previsível' },
      { value: 'C', label: 'Analisar dados antes de qualquer decisão' },
      { value: 'D', label: 'Trabalhar em equipe e motivar os outros' },
    ],
  },
  {
    id: 'qd2',
    question: 'Quando alguém discorda de você:',
    options: [
      { value: 'A', label: 'Defendo minha posição com firmeza' },
      { value: 'B', label: 'Busco entender o ponto de vista da pessoa' },
      { value: 'C', label: 'Peço dados e fatos para embasar a discussão' },
      { value: 'D', label: 'Tento convencer usando charme e entusiasmo' },
    ],
  },
  {
    id: 'qd3',
    question: 'Em uma reunião, você costuma:',
    options: [
      { value: 'A', label: 'Ir direto aos pontos importantes, sem enrolação' },
      { value: 'B', label: 'Ouvir mais e falar quando necessário' },
      { value: 'C', label: 'Trazer dados e análises detalhadas' },
      { value: 'D', label: 'Energizar o ambiente e engajar as pessoas' },
    ],
  },
  {
    id: 'qd4',
    question: 'Sob pressão, você:',
    options: [
      { value: 'A', label: 'Fica mais direto e exigente' },
      { value: 'B', label: 'Busca estabilidade e evita conflitos' },
      { value: 'C', label: 'Se apega a processos e detalhes' },
      { value: 'D', label: 'Procura apoio e compartilha sentimentos' },
    ],
  },
  {
    id: 'qd5',
    question: 'Para você, sucesso significa:',
    options: [
      { value: 'A', label: 'Alcançar resultados e vencer desafios' },
      { value: 'B', label: 'Ter segurança e relacionamentos estáveis' },
      { value: 'C', label: 'Fazer um trabalho perfeito e bem feito' },
      { value: 'D', label: 'Ser reconhecido e admirado pelos outros' },
    ],
  },
  {
    id: 'qd6',
    question: 'Ao iniciar um projeto novo, você:',
    options: [
      { value: 'A', label: 'Quer começar logo e ver resultados rápidos' },
      { value: 'B', label: 'Prefere um plano claro e passo a passo' },
      { value: 'C', label: 'Pesquisa muito antes de começar' },
      { value: 'D', label: 'Fica animado e quer envolver todo mundo' },
    ],
  },
  {
    id: 'qd7',
    question: 'O que mais te incomoda no trabalho?',
    options: [
      { value: 'A', label: 'Lentidão e falta de resultados' },
      { value: 'B', label: 'Mudanças bruscas e falta de harmonia' },
      { value: 'C', label: 'Erros, imprecisões e falta de qualidade' },
      { value: 'D', label: 'Falta de reconhecimento e ambiente negativo' },
    ],
  },
  {
    id: 'qd8',
    question: 'Você prefere ser lembrado como alguém:',
    options: [
      { value: 'A', label: 'Que entrega resultados e resolve problemas' },
      { value: 'B', label: 'Confiável e que mantém a equipe unida' },
      { value: 'C', label: 'Competente e que faz tudo com excelência' },
      { value: 'D', label: 'Carismático e que inspira os outros' },
    ],
  },
  {
    id: 'qd9',
    question: 'Quando precisa convencer alguém, você:',
    options: [
      { value: 'A', label: 'Vai direto ao ponto e mostra os benefícios práticos' },
      { value: 'B', label: 'Constrói confiança e dá tempo para a pessoa pensar' },
      { value: 'C', label: 'Apresenta dados, provas e argumentos lógicos' },
      { value: 'D', label: 'Usa histórias, entusiasmo e conexão pessoal' },
    ],
  },
  {
    id: 'qd10',
    question: 'Seu maior medo no trabalho é:',
    options: [
      { value: 'A', label: 'Perder o controle ou parecer fraco' },
      { value: 'B', label: 'Conflitos ou mudanças inesperadas' },
      { value: 'C', label: 'Cometer erros ou parecer incompetente' },
      { value: 'D', label: 'Ser rejeitado ou ficar isolado' },
    ],
  },
]

// Perguntas abertas
const openQuestions = [
  {
    id: 'challenge',
    question: 'Qual é o maior desafio que você está enfrentando agora?',
    placeholder: 'Conte-nos sobre seu principal desafio atual no seu negócio ou vida pessoal...'
  },
  {
    id: 'desired_change',
    question: 'Se pudesse mudar uma coisa na sua situação atual, o que seria?',
    placeholder: 'Descreva a mudança que você mais deseja ver acontecer...'
  }
]

// Total de perguntas por seção
const ARCHETYPE_COUNT = archetypeQuestions.length
const DISC_COUNT = discQuestions.length
const OPEN_COUNT = openQuestions.length
const TOTAL_QUESTIONS = ARCHETYPE_COUNT + DISC_COUNT + OPEN_COUNT

interface ArchetypeResult {
  primary: string
  secondary: string
  primaryIcon: string
  secondaryIcon: string
  primaryDescription: string
  secondaryDescription: string
  combinedDescription: string
}

export default function FormPage() {
  const params = useParams()
  const [participant, setParticipant] = useState<any>(null)
  const [formId, setFormId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [openAnswers, setOpenAnswers] = useState<Record<string, string>>({})
  const [archetypeResult, setArchetypeResult] = useState<ArchetypeResult | null>(null)
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [showIntro, setShowIntro] = useState(true)

  useEffect(() => {
    fetchData()
  }, [params.id])

  const fetchData = async () => {
    setLoading(true)

    try {
      const response = await fetch(`/api/forms/${params.id}`)

      if (!response.ok) {
        setLoading(false)
        return
      }

      const data = await response.json()

      if (!data.found) {
        setLoading(false)
        return
      }

      setParticipant(data.participant)
      if (data.form?.id) {
        setFormId(data.form.id)
      }

      if (data.isCompleted) {
        setSubmitted(true)
        if (data.participant.primary_archetype) {
          setArchetypeResult({
            primary: data.participant.primary_archetype,
            secondary: data.participant.secondary_archetype,
            primaryIcon: getArchetypeIcon(data.participant.primary_archetype),
            secondaryIcon: getArchetypeIcon(data.participant.secondary_archetype),
            primaryDescription: '',
            secondaryDescription: '',
            combinedDescription: data.participant.archetype_description || ''
          })
        }
      }
    } catch (error) {
      console.error('Error loading form:', error)
    }

    setLoading(false)
  }

  const getArchetypeIcon = (archetype: string): string => {
    const icons: Record<string, string> = {
      'Inocente': '🌟',
      'Cara Comum': '🤝',
      'Herói': '⚔️',
      'Cuidador': '💝',
      'Explorador': '🧭',
      'Rebelde': '🔥',
      'Amante': '❤️',
      'Criador': '🎨',
      'Bobo da Corte': '🎭',
      'Sábio': '📚',
      'Mago': '✨',
      'Governante': '👑'
    }
    return icons[archetype] || '✨'
  }

  // Get current question data
  const getCurrentQuestionData = () => {
    if (currentQuestion < ARCHETYPE_COUNT) {
      return {
        type: 'archetype',
        data: archetypeQuestions[currentQuestion],
        section: 'Descobrindo seu Arquétipo',
        sectionColor: 'from-purple-600 to-indigo-600'
      }
    } else if (currentQuestion < ARCHETYPE_COUNT + DISC_COUNT) {
      const discIndex = currentQuestion - ARCHETYPE_COUNT
      return {
        type: 'disc',
        data: discQuestions[discIndex],
        section: 'Seu Perfil Comportamental',
        sectionColor: 'from-blue-600 to-cyan-600'
      }
    } else {
      const openIndex = currentQuestion - ARCHETYPE_COUNT - DISC_COUNT
      return {
        type: 'open',
        data: openQuestions[openIndex],
        section: 'Últimas Perguntas',
        sectionColor: 'from-amber-500 to-orange-500'
      }
    }
  }

  const handleSelectOption = (questionId: string, value: string) => {
    setAnswers({ ...answers, [questionId]: value })

    // Auto-advance after selection with delay
    setTimeout(() => {
      handleNext()
    }, 400)
  }

  const handleNext = () => {
    if (currentQuestion < TOTAL_QUESTIONS - 1) {
      setIsTransitioning(true)
      setTimeout(() => {
        setCurrentQuestion(currentQuestion + 1)
        setIsTransitioning(false)
      }, 200)
    }
  }

  const handlePrev = () => {
    if (currentQuestion > 0) {
      setIsTransitioning(true)
      setTimeout(() => {
        setCurrentQuestion(currentQuestion - 1)
        setIsTransitioning(false)
      }, 200)
    }
  }

  const handleSubmit = async () => {
    if (!openAnswers.challenge || !openAnswers.desired_change) {
      return
    }

    setSubmitting(true)

    try {
      const response = await fetch('/api/forms/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          participantId: participant.id,
          formId: formId || params.id,
          answers,
          challengeAnswer: openAnswers.challenge,
          desiredChangeAnswer: openAnswers.desired_change,
        }),
      })

      if (!response.ok) {
        throw new Error('Analysis API error')
      }

      const result = await response.json()

      if (result.archetypes) {
        setArchetypeResult(result.archetypes)
      }

      setSubmitted(true)
    } catch (error) {
      console.error('Submit error:', error)
      alert('Erro ao enviar formulário. Tente novamente.')
    } finally {
      setSubmitting(false)
    }
  }

  // Check if current question is answered
  const isCurrentAnswered = () => {
    const { type, data } = getCurrentQuestionData()
    if (type === 'open') {
      return !!openAnswers[data.id]
    }
    return !!answers[data.id]
  }

  // Calculate progress
  const progress = ((currentQuestion + 1) / TOTAL_QUESTIONS) * 100

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
        <Loading size="lg" />
      </div>
    )
  }

  if (!participant) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 px-4">
        <Card className="max-w-md bg-white/10 backdrop-blur-lg border-white/20">
          <CardContent className="text-center py-12">
            <p className="text-white/80">Formulário não encontrado ou link inválido.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Result Screen
  if (submitted && archetypeResult) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 py-8 px-4">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-8 animate-fade-in">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-r from-amber-400 to-orange-500 mb-6 shadow-2xl shadow-amber-500/30">
              <Sparkles className="h-10 w-10 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">
              Parabéns, {participant?.name?.split(' ')[0]}!
            </h1>
            <p className="text-white/70">
              Descobrimos seu arquétipo de personalidade
            </p>
          </div>

          {/* Primary Archetype */}
          <Card className="mb-6 bg-white/10 backdrop-blur-lg border-white/20 overflow-hidden">
            <div className="bg-gradient-to-r from-purple-600 to-indigo-600 p-6 text-center">
              <div className="text-7xl mb-4">{archetypeResult.primaryIcon}</div>
              <p className="text-purple-200 text-sm mb-1">Seu arquétipo principal é</p>
              <h2 className="text-3xl font-bold text-white">
                {archetypeResult.primary}
              </h2>
            </div>
          </Card>

          {/* Secondary Archetype */}
          <Card className="mb-6 bg-white/10 backdrop-blur-lg border-white/20">
            <CardContent className="p-6 text-center">
              <div className="text-5xl mb-3">{archetypeResult.secondaryIcon}</div>
              <p className="text-white/60 text-sm mb-1">Com traços de</p>
              <p className="text-xl font-semibold text-white">
                {archetypeResult.secondary}
              </p>
            </CardContent>
          </Card>

          {/* Combined Description */}
          <Card className="bg-white/10 backdrop-blur-lg border-white/20">
            <CardContent className="p-6">
              <h3 className="font-semibold text-white mb-3">O que isso significa:</h3>
              <p className="text-white/80 leading-relaxed">
                {archetypeResult.combinedDescription}
              </p>
              <div className="mt-6 pt-4 border-t border-white/10 text-center">
                <div className="inline-flex items-center gap-2 text-green-400 text-sm">
                  <CheckCircle className="h-4 w-4" />
                  Suas respostas foram salvas com sucesso
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  // Simple thank you if submitted without result
  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 px-4">
        <Card className="max-w-md bg-white/10 backdrop-blur-lg border-white/20">
          <CardContent className="text-center py-12">
            <CheckCircle className="h-16 w-16 text-green-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-white mb-2">
              Obrigado, {participant?.name?.split(' ')[0]}!
            </h2>
            <p className="text-white/70">
              Suas respostas foram enviadas com sucesso.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Intro Screen
  if (showIntro) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 px-4">
        <div className="max-w-md w-full text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-r from-amber-400 to-orange-500 mb-8 shadow-2xl shadow-amber-500/30">
            <Flame className="h-10 w-10 text-white" />
          </div>

          <h1 className="text-3xl font-bold text-white mb-4">
            Olá, {participant?.name?.split(' ')[0]}! 👋
          </h1>

          <p className="text-white/70 mb-8 text-lg leading-relaxed">
            Vamos descobrir seu <span className="text-purple-400 font-semibold">arquétipo de personalidade</span>.
            São apenas algumas perguntas rápidas sobre quem você é.
          </p>

          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 mb-8 text-left">
            <div className="flex items-center gap-3 text-white/80 mb-3">
              <div className="w-8 h-8 rounded-full bg-purple-500/30 flex items-center justify-center text-sm">⏱️</div>
              <span>Leva cerca de <strong className="text-white">3-5 minutos</strong></span>
            </div>
            <div className="flex items-center gap-3 text-white/80 mb-3">
              <div className="w-8 h-8 rounded-full bg-purple-500/30 flex items-center justify-center text-sm">🎯</div>
              <span>Responda com <strong className="text-white">sinceridade</strong></span>
            </div>
            <div className="flex items-center gap-3 text-white/80">
              <div className="w-8 h-8 rounded-full bg-purple-500/30 flex items-center justify-center text-sm">✨</div>
              <span>Não existem respostas <strong className="text-white">certas ou erradas</strong></span>
            </div>
          </div>

          <Button
            size="lg"
            onClick={() => setShowIntro(false)}
            className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-semibold py-4 rounded-xl shadow-lg shadow-purple-500/30 transition-all hover:scale-[1.02]"
          >
            Começar
            <ChevronRight className="ml-2 h-5 w-5" />
          </Button>
        </div>
      </div>
    )
  }

  // Question Screen
  const { type, data, section, sectionColor } = getCurrentQuestionData()
  const isLastQuestion = currentQuestion === TOTAL_QUESTIONS - 1

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Progress Bar */}
      <div className="fixed top-0 left-0 right-0 z-50">
        <div className="h-1 bg-white/10">
          <div
            className={`h-full bg-gradient-to-r ${sectionColor} transition-all duration-500 ease-out`}
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Header */}
      <div className="pt-8 pb-4 px-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <button
            onClick={handlePrev}
            disabled={currentQuestion === 0}
            className="p-2 rounded-full bg-white/10 text-white/70 hover:bg-white/20 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>

          <div className="text-center">
            <p className={`text-sm font-medium bg-gradient-to-r ${sectionColor} bg-clip-text text-transparent`}>
              {section}
            </p>
            <p className="text-white/50 text-xs mt-1">
              {currentQuestion + 1} de {TOTAL_QUESTIONS}
            </p>
          </div>

          <div className="w-9" /> {/* Spacer for alignment */}
        </div>
      </div>

      {/* Question Content */}
      <div className="px-4 pb-8">
        <div className={`max-w-2xl mx-auto transition-all duration-200 ${isTransitioning ? 'opacity-0 translate-x-4' : 'opacity-100 translate-x-0'}`}>

          {/* Question */}
          <div className="mb-8">
            <h2 className="text-2xl md:text-3xl font-bold text-white text-center leading-tight">
              {data.question}
            </h2>
          </div>

          {/* Options for multiple choice */}
          {type !== 'open' && 'options' in data && (
            <div className="space-y-3">
              {data.options.map((option, index) => {
                const isSelected = answers[data.id] === option.value
                const letters = ['A', 'B', 'C', 'D', 'E', 'F']

                return (
                  <button
                    key={option.value}
                    onClick={() => handleSelectOption(data.id, option.value)}
                    className={`w-full p-4 rounded-xl text-left transition-all duration-200 flex items-start gap-4 group ${
                      isSelected
                        ? `bg-gradient-to-r ${sectionColor} text-white shadow-lg`
                        : 'bg-white/10 backdrop-blur-sm text-white/90 hover:bg-white/20 border border-white/10 hover:border-white/30'
                    }`}
                  >
                    <span className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold transition-colors ${
                      isSelected
                        ? 'bg-white/30 text-white'
                        : 'bg-white/10 text-white/70 group-hover:bg-white/20'
                    }`}>
                      {letters[index]}
                    </span>
                    <span className="flex-1 pt-1">{option.label}</span>
                    {isSelected && (
                      <CheckCircle className="h-5 w-5 flex-shrink-0 mt-1" />
                    )}
                  </button>
                )
              })}
            </div>
          )}

          {/* Open question */}
          {type === 'open' && (
            <div className="space-y-4">
              <textarea
                value={openAnswers[data.id] || ''}
                onChange={(e) => setOpenAnswers({ ...openAnswers, [data.id]: e.target.value })}
                placeholder={'placeholder' in data ? data.placeholder : ''}
                className="w-full p-4 rounded-xl bg-white/10 backdrop-blur-sm border border-white/20 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none min-h-[150px]"
                rows={5}
              />

              {isLastQuestion ? (
                <Button
                  size="lg"
                  onClick={handleSubmit}
                  loading={submitting}
                  disabled={!openAnswers.challenge || !openAnswers.desired_change}
                  className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-semibold py-4 rounded-xl shadow-lg shadow-amber-500/30 transition-all hover:scale-[1.02] disabled:opacity-50 disabled:hover:scale-100"
                >
                  <Sparkles className="mr-2 h-5 w-5" />
                  Descobrir meu Arquétipo
                </Button>
              ) : (
                <Button
                  size="lg"
                  onClick={handleNext}
                  disabled={!openAnswers[data.id]}
                  className={`w-full bg-gradient-to-r ${sectionColor} hover:opacity-90 text-white font-semibold py-4 rounded-xl shadow-lg transition-all hover:scale-[1.02] disabled:opacity-50 disabled:hover:scale-100`}
                >
                  Continuar
                  <ChevronRight className="ml-2 h-5 w-5" />
                </Button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Navigation hint for mobile */}
      <div className="fixed bottom-6 left-0 right-0 text-center pointer-events-none">
        <p className="text-white/30 text-xs">
          {type !== 'open' ? 'Toque para selecionar' : ''}
        </p>
      </div>
    </div>
  )
}
