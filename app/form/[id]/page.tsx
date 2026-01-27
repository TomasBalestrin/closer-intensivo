'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button, Card, CardHeader, CardTitle, CardContent, Loading } from '@/components/ui'
import { CheckCircle, Sparkles } from 'lucide-react'

// 12 Perguntas com opções A, B, C, D que mapeiam para arquétipos E DISC
const questions = [
  {
    id: 'q1',
    question: 'Quando você enfrenta um problema difícil, qual é sua primeira reação?',
    options: [
      { value: 'A', label: 'Busco ajudar todos os envolvidos e garantir que ninguém fique para trás' },
      { value: 'B', label: 'Vejo como uma aventura e uma chance de aprender algo novo' },
      { value: 'C', label: 'Analiso profundamente antes de tomar qualquer decisão' },
      { value: 'D', label: 'Encontro um jeito criativo de transformar a situação em algo positivo' },
    ],
  },
  {
    id: 'q2',
    question: 'O que você mais valoriza em um projeto ou trabalho?',
    options: [
      { value: 'A', label: 'Ter controle e poder para tomar as decisões importantes' },
      { value: 'B', label: 'A oportunidade de superar desafios e provar meu valor' },
      { value: 'C', label: 'Poder cuidar e apoiar as pessoas ao meu redor' },
      { value: 'D', label: 'Liberdade para explorar novas possibilidades' },
    ],
  },
  {
    id: 'q3',
    question: 'Como você costuma reagir em situações de estresse?',
    options: [
      { value: 'A', label: 'Uso o humor para aliviar a tensão' },
      { value: 'B', label: 'Foco em apoiar os outros e manter a harmonia' },
      { value: 'C', label: 'Me concentro em criar soluções práticas' },
      { value: 'D', label: 'Busco entender a situação antes de agir' },
    ],
  },
  {
    id: 'q4',
    question: 'O que mais te motiva na vida?',
    options: [
      { value: 'A', label: 'Buscar conhecimento e entender como as coisas funcionam' },
      { value: 'B', label: 'Manter a esperança e acreditar no melhor das pessoas' },
      { value: 'C', label: 'Conquistar objetivos e superar meus próprios limites' },
      { value: 'D', label: 'Conexões profundas e momentos especiais com pessoas importantes' },
    ],
  },
  {
    id: 'q5',
    question: 'Quando você alcança uma conquista importante, como costuma comemorar?',
    options: [
      { value: 'A', label: 'Refletindo sobre o aprendizado e planejando os próximos passos' },
      { value: 'B', label: 'Compartilhando com quem me ajudou e celebrando em equipe' },
      { value: 'C', label: 'Já pensando em como usar isso para criar algo novo' },
      { value: 'D', label: 'De forma simples, junto com as pessoas do meu dia a dia' },
    ],
  },
  {
    id: 'q6',
    question: 'O que as pessoas mais admiram em você?',
    options: [
      { value: 'A', label: 'Minha coragem para enfrentar desafios de frente' },
      { value: 'B', label: 'Minha capacidade de liderar e organizar' },
      { value: 'C', label: 'Minha leveza e capacidade de ver o lado bom das coisas' },
      { value: 'D', label: 'Minha capacidade de criar conexões verdadeiras' },
    ],
  },
  {
    id: 'q7',
    question: 'Como você prefere passar seu tempo livre?',
    options: [
      { value: 'A', label: 'Criando algo novo - arte, projetos, ideias' },
      { value: 'B', label: 'Cuidando de pessoas ou causas importantes' },
      { value: 'C', label: 'Aprendendo coisas novas - leitura, cursos, pesquisa' },
      { value: 'D', label: 'Explorando lugares novos ou vivendo experiências diferentes' },
    ],
  },
  {
    id: 'q8',
    question: 'Quando você precisa tomar uma decisão importante, como você age?',
    options: [
      { value: 'A', label: 'Ajo rapidamente, confiando no meu instinto e força' },
      { value: 'B', label: 'Pesquiso e analiso todas as informações disponíveis' },
      { value: 'C', label: 'Considero como isso afeta as pessoas próximas a mim' },
      { value: 'D', label: 'Penso em como me sinto e busco o que me traz mais prazer' },
    ],
  },
  {
    id: 'q9',
    question: 'O que te faz sentir mais realizado?',
    options: [
      { value: 'A', label: 'Fazer as pessoas rirem e se sentirem bem' },
      { value: 'B', label: 'Superar obstáculos e alcançar vitórias importantes' },
      { value: 'C', label: 'Ajudar alguém a resolver um problema difícil' },
      { value: 'D', label: 'Descobrir uma verdade ou entender algo profundamente' },
    ],
  },
  {
    id: 'q10',
    question: 'Qual frase mais representa sua visão de mundo?',
    options: [
      { value: 'A', label: 'A vida é sobre conexões e momentos especiais' },
      { value: 'B', label: 'Com determinação, posso conquistar qualquer coisa' },
      { value: 'C', label: 'Cuidar dos outros é o que dá sentido à vida' },
      { value: 'D', label: 'O conhecimento é a chave para entender tudo' },
    ],
  },
  {
    id: 'q11',
    question: 'Como você lida com mudanças e novidades?',
    options: [
      { value: 'A', label: 'Encaro como um desafio a ser vencido' },
      { value: 'B', label: 'Ajudo os outros a se adaptarem e mantenho a união' },
      { value: 'C', label: 'Analiso os prós e contras antes de aceitar' },
      { value: 'D', label: 'Transformo em diversão e aproveito o momento' },
    ],
  },
  {
    id: 'q12',
    question: 'O que você busca em seus relacionamentos?',
    options: [
      { value: 'A', label: 'Liberdade para ser quem eu sou e desafiar padrões' },
      { value: 'B', label: 'Conexão emocional profunda e momentos intensos' },
      { value: 'C', label: 'Harmonia, paz e confiança mútua' },
      { value: 'D', label: 'Conversas inteligentes e crescimento mútuo' },
    ],
  },
]

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
  const [currentStep, setCurrentStep] = useState(0) // 0: questions, 1: open questions, 2: result

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

  const handleNextStep = () => {
    if (Object.keys(answers).length < questions.length) {
      alert('Por favor, responda todas as perguntas.')
      return
    }
    setCurrentStep(1)
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
      setCurrentStep(2)
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

  // Step 1: Open questions
  if (currentStep === 1) {
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
                onClick={() => setCurrentStep(0)}
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

  // Step 0: Multiple choice questions
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

        {/* Progress bar */}
        <div className="mb-6">
          <div className="flex justify-between text-sm text-gray-600 mb-2">
            <span>Progresso</span>
            <span>{Object.keys(answers).length} de {questions.length} perguntas</span>
          </div>
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-purple-600 to-blue-600 transition-all duration-300"
              style={{ width: `${(Object.keys(answers).length / questions.length) * 100}%` }}
            />
          </div>
        </div>

        <div className="space-y-6">
          {questions.map((q, index) => (
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
              onClick={handleNextStep}
              disabled={Object.keys(answers).length < questions.length}
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
