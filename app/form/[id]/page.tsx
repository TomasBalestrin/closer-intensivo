'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button, Card, CardHeader, CardTitle, CardContent, Loading } from '@/components/ui'
import { CheckCircle, Sparkles } from 'lucide-react'

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

// All questions combined
const allQuestions = [...archetypeQuestions, ...discQuestions]

// Perguntas abertas
const openQuestions = [
  {
    id: 'challenge',
    question: 'Qual é o maior desafio que você está enfrentando agora no seu negócio/vida?',
    placeholder: 'Conte-nos sobre seu principal desafio atual...'
  },
  {
    id: 'desired_change',
    question: 'Se você pudesse mudar uma coisa na sua situação atual, o que seria?',
    placeholder: 'Descreva a mudança que você deseja...'
  }
]

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
  const supabase = createClient()
  const [participant, setParticipant] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [openAnswers, setOpenAnswers] = useState<Record<string, string>>({})
  const [archetypeResult, setArchetypeResult] = useState<ArchetypeResult | null>(null)
  const [currentStep, setCurrentStep] = useState(0) // 0: archetype questions, 1: disc questions, 2: open questions, 3: result

  useEffect(() => {
    fetchData()
  }, [params.id])

  const fetchData = async () => {
    setLoading(true)

    // Try to fetch from disc_forms first (for existing links)
    const { data: formData } = await supabase
      .from('disc_forms')
      .select('*, participant:participants(*)')
      .eq('id', params.id)
      .single()

    if (formData?.participant) {
      setParticipant(formData.participant)
      if (formData.completed_at || formData.participant.form_completed_at) {
        setSubmitted(true)
        // If we have archetype data, show it
        if (formData.participant.primary_archetype) {
          setArchetypeResult({
            primary: formData.participant.primary_archetype,
            secondary: formData.participant.secondary_archetype,
            primaryIcon: getArchetypeIcon(formData.participant.primary_archetype),
            secondaryIcon: getArchetypeIcon(formData.participant.secondary_archetype),
            primaryDescription: '',
            secondaryDescription: '',
            combinedDescription: formData.participant.archetype_description || ''
          })
        }
      }
      setLoading(false)
      return
    }

    // If not found in disc_forms, try direct participant lookup
    const { data: participantData } = await supabase
      .from('participants')
      .select('*')
      .eq('id', params.id)
      .single()

    if (participantData) {
      setParticipant(participantData)
      if (participantData.form_completed_at) {
        setSubmitted(true)
        if (participantData.primary_archetype) {
          setArchetypeResult({
            primary: participantData.primary_archetype,
            secondary: participantData.secondary_archetype,
            primaryIcon: getArchetypeIcon(participantData.primary_archetype),
            secondaryIcon: getArchetypeIcon(participantData.secondary_archetype),
            primaryDescription: '',
            secondaryDescription: '',
            combinedDescription: participantData.archetype_description || ''
          })
        }
      }
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

  const getAnsweredCount = (questionSet: 'archetype' | 'disc') => {
    const prefix = questionSet === 'archetype' ? 'q' : 'qd'
    return Object.keys(answers).filter(key =>
      questionSet === 'archetype'
        ? key.startsWith('q') && !key.startsWith('qd')
        : key.startsWith('qd')
    ).length
  }

  const handleNextToDisc = () => {
    if (getAnsweredCount('archetype') < archetypeQuestions.length) {
      alert('Por favor, responda todas as perguntas desta seção.')
      return
    }
    setCurrentStep(1)
    window.scrollTo(0, 0)
  }

  const handleNextToOpen = () => {
    if (getAnsweredCount('disc') < discQuestions.length) {
      alert('Por favor, responda todas as perguntas desta seção.')
      return
    }
    setCurrentStep(2)
    window.scrollTo(0, 0)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!openAnswers.challenge || !openAnswers.desired_change) {
      alert('Por favor, responda as duas perguntas.')
      return
    }

    setSubmitting(true)

    try {
      // Call API to analyze
      const response = await fetch('/api/forms/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          participantId: participant.id,
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
      setCurrentStep(3)
    } catch (error) {
      console.error('Submit error:', error)
      alert('Erro ao enviar formulário. Tente novamente.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-blue-50">
        <Loading size="lg" />
      </div>
    )
  }

  if (!participant) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-blue-50">
        <Card className="max-w-md">
          <CardContent className="text-center py-8">
            <p className="text-gray-500">Formulário não encontrado ou link inválido.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Show archetype result
  if (submitted && archetypeResult) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 py-8 px-4">
        <div className="max-w-2xl mx-auto">
          <Card className="overflow-hidden">
            <div className="bg-gradient-to-r from-purple-600 to-blue-600 p-8 text-center text-white">
              <Sparkles className="h-12 w-12 mx-auto mb-4" />
              <h1 className="text-2xl font-bold mb-2">
                Parabéns, {participant?.name}!
              </h1>
              <p className="text-purple-100">
                Descobrimos seus arquétipos de personalidade
              </p>
            </div>

            <CardContent className="p-8">
              {/* Primary Archetype */}
              <div className="text-center mb-8">
                <div className="text-6xl mb-4">{archetypeResult.primaryIcon}</div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  Seu arquétipo principal é
                </h2>
                <p className="text-3xl font-bold text-purple-600 mb-4">
                  {archetypeResult.primary}
                </p>
              </div>

              {/* Secondary Archetype */}
              <div className="bg-gray-50 rounded-lg p-6 mb-8 text-center">
                <div className="text-4xl mb-2">{archetypeResult.secondaryIcon}</div>
                <p className="text-gray-600 mb-1">Com traços de</p>
                <p className="text-xl font-semibold text-gray-800">
                  {archetypeResult.secondary}
                </p>
              </div>

              {/* Combined Description */}
              <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg p-6">
                <h3 className="font-semibold text-gray-900 mb-3">O que isso significa:</h3>
                <p className="text-gray-700 leading-relaxed">
                  {archetypeResult.combinedDescription}
                </p>
              </div>

              <div className="mt-8 text-center text-sm text-gray-500">
                <CheckCircle className="h-5 w-5 inline-block text-green-500 mr-2" />
                Suas respostas foram salvas com sucesso
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  // Show simple thank you if submitted without archetype data
  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-blue-50 px-4">
        <Card className="max-w-md w-full">
          <CardContent className="text-center py-12">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Obrigado, {participant?.name}!
            </h2>
            <p className="text-gray-600">
              Suas respostas foram enviadas com sucesso.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Step 2: Open questions
  if (currentStep === 2) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 py-8 px-4">
        <div className="max-w-2xl mx-auto">
          <Card className="mb-6">
            <CardHeader className="text-center">
              <div className="h-12 w-12 bg-gradient-to-r from-purple-600 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-xl font-bold text-white">BE</span>
              </div>
              <CardTitle className="text-xl">Quase lá!</CardTitle>
              <p className="text-gray-500 mt-2">
                Responda essas duas últimas perguntas para completar seu perfil, {participant?.name}.
              </p>
            </CardHeader>
          </Card>

          {/* Progress indicator */}
          <div className="mb-6">
            <div className="flex justify-between text-sm text-gray-600 mb-2">
              <span>Etapa 3 de 3</span>
              <span>Perguntas abertas</span>
            </div>
            <div className="flex gap-2">
              <div className="flex-1 h-2 bg-purple-600 rounded-full" />
              <div className="flex-1 h-2 bg-purple-600 rounded-full" />
              <div className="flex-1 h-2 bg-purple-600 rounded-full" />
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {openQuestions.map((q) => (
              <Card key={q.id}>
                <CardContent className="pt-6">
                  <h3 className="font-medium text-gray-900 mb-4">
                    {q.question}
                  </h3>
                  <textarea
                    value={openAnswers[q.id] || ''}
                    onChange={(e) => setOpenAnswers({ ...openAnswers, [q.id]: e.target.value })}
                    placeholder={q.placeholder}
                    className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                    rows={4}
                  />
                </CardContent>
              </Card>
            ))}

            <div className="flex gap-4 justify-center">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setCurrentStep(1)}
              >
                Voltar
              </Button>
              <Button
                type="submit"
                size="lg"
                loading={submitting}
                disabled={!openAnswers.challenge || !openAnswers.desired_change}
                className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
              >
                Descobrir meu Arquétipo
              </Button>
            </div>
          </form>
        </div>
      </div>
    )
  }

  // Step 1: DISC questions
  if (currentStep === 1) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 py-8 px-4">
        <div className="max-w-2xl mx-auto">
          <Card className="mb-6">
            <CardHeader className="text-center">
              <div className="h-12 w-12 bg-gradient-to-r from-purple-600 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-xl font-bold text-white">BE</span>
              </div>
              <CardTitle className="text-xl">Perfil Comportamental</CardTitle>
              <p className="text-gray-500 mt-2">
                Agora, {participant?.name}, responda sobre como você age no dia a dia.
              </p>
            </CardHeader>
          </Card>

          {/* Progress indicator */}
          <div className="mb-6">
            <div className="flex justify-between text-sm text-gray-600 mb-2">
              <span>Etapa 2 de 3</span>
              <span>{getAnsweredCount('disc')} de {discQuestions.length} perguntas</span>
            </div>
            <div className="flex gap-2">
              <div className="flex-1 h-2 bg-purple-600 rounded-full" />
              <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-purple-600 transition-all duration-300"
                  style={{ width: `${(getAnsweredCount('disc') / discQuestions.length) * 100}%` }}
                />
              </div>
              <div className="flex-1 h-2 bg-gray-200 rounded-full" />
            </div>
          </div>

          <div className="space-y-6">
            {discQuestions.map((q, index) => (
              <Card key={q.id}>
                <CardContent className="pt-6">
                  <h3 className="font-medium text-gray-900 mb-4">
                    {index + 1}. {q.question}
                  </h3>
                  <div className="space-y-3">
                    {q.options.map((option) => (
                      <label
                        key={option.value}
                        className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                          answers[q.id] === option.value
                            ? 'border-purple-500 bg-purple-50 shadow-sm'
                            : 'border-gray-200 hover:bg-gray-50'
                        }`}
                      >
                        <input
                          type="radio"
                          name={q.id}
                          value={option.value}
                          checked={answers[q.id] === option.value}
                          onChange={(e) =>
                            setAnswers({ ...answers, [q.id]: e.target.value })
                          }
                          className="mt-1 text-purple-600 focus:ring-purple-500"
                        />
                        <span className="text-gray-700">{option.label}</span>
                      </label>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}

            <div className="flex gap-4 justify-center pb-8">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setCurrentStep(0)}
              >
                Voltar
              </Button>
              <Button
                type="button"
                size="lg"
                onClick={handleNextToOpen}
                disabled={getAnsweredCount('disc') < discQuestions.length}
                className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
              >
                Continuar
              </Button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Step 0: Archetype questions
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <Card className="mb-6">
          <CardHeader className="text-center">
            <div className="h-12 w-12 bg-gradient-to-r from-purple-600 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-xl font-bold text-white">BE</span>
            </div>
            <CardTitle className="text-xl">Descubra seu Arquétipo</CardTitle>
            <p className="text-gray-500 mt-2">
              Olá {participant?.name}, responda as perguntas abaixo para descobrir seu arquétipo de personalidade.
            </p>
          </CardHeader>
        </Card>

        {/* Progress indicator */}
        <div className="mb-6">
          <div className="flex justify-between text-sm text-gray-600 mb-2">
            <span>Etapa 1 de 3</span>
            <span>{getAnsweredCount('archetype')} de {archetypeQuestions.length} perguntas</span>
          </div>
          <div className="flex gap-2">
            <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-purple-600 transition-all duration-300"
                style={{ width: `${(getAnsweredCount('archetype') / archetypeQuestions.length) * 100}%` }}
              />
            </div>
            <div className="flex-1 h-2 bg-gray-200 rounded-full" />
            <div className="flex-1 h-2 bg-gray-200 rounded-full" />
          </div>
        </div>

        <div className="space-y-6">
          {archetypeQuestions.map((q, index) => (
            <Card key={q.id}>
              <CardContent className="pt-6">
                <h3 className="font-medium text-gray-900 mb-4">
                  {index + 1}. {q.question}
                </h3>
                <div className="space-y-3">
                  {q.options.map((option) => (
                    <label
                      key={option.value}
                      className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                        answers[q.id] === option.value
                          ? 'border-purple-500 bg-purple-50 shadow-sm'
                          : 'border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      <input
                        type="radio"
                        name={q.id}
                        value={option.value}
                        checked={answers[q.id] === option.value}
                        onChange={(e) =>
                          setAnswers({ ...answers, [q.id]: e.target.value })
                        }
                        className="mt-1 text-purple-600 focus:ring-purple-500"
                      />
                      <span className="text-gray-700">{option.label}</span>
                    </label>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}

          <div className="flex justify-center pb-8">
            <Button
              type="button"
              size="lg"
              onClick={handleNextToDisc}
              disabled={getAnsweredCount('archetype') < archetypeQuestions.length}
              className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
            >
              Continuar
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
