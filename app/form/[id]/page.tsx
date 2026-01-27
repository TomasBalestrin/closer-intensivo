'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button, Card, CardHeader, CardTitle, CardContent, Loading } from '@/components/ui'
import { CheckCircle } from 'lucide-react'

const questions = [
  {
    id: 'q1',
    question: 'Como você costuma tomar decisões importantes?',
    options: [
      { value: 'D', label: 'Tomo decisões rápidas e decisivas, focando nos resultados' },
      { value: 'I', label: 'Converso com várias pessoas e considero o impacto social' },
      { value: 'S', label: 'Analiso cuidadosamente e busco consenso antes de decidir' },
      { value: 'C', label: 'Pesquiso todos os dados disponíveis antes de tomar uma decisão' },
    ],
  },
  {
    id: 'q2',
    question: 'O que te motiva mais em um negócio?',
    options: [
      { value: 'D', label: 'Desafios, conquistas e crescimento rápido' },
      { value: 'I', label: 'Reconhecimento, networking e impacto nas pessoas' },
      { value: 'S', label: 'Estabilidade, segurança e bom relacionamento com a equipe' },
      { value: 'C', label: 'Qualidade, precisão e processos bem definidos' },
    ],
  },
  {
    id: 'q3',
    question: 'Como você lida com desafios e problemas?',
    options: [
      { value: 'D', label: 'Enfrento de frente e busco soluções imediatas' },
      { value: 'I', label: 'Mobilizo pessoas e busco soluções criativas em grupo' },
      { value: 'S', label: 'Analiso a situação com calma e busco soluções graduais' },
      { value: 'C', label: 'Pesquiso as causas e desenvolvo um plano detalhado' },
    ],
  },
  {
    id: 'q4',
    question: 'Você prefere trabalhar sozinho ou em equipe?',
    options: [
      { value: 'D', label: 'Prefiro liderar a equipe e delegar tarefas' },
      { value: 'I', label: 'Adoro trabalhar em equipe e colaborar com todos' },
      { value: 'S', label: 'Gosto de trabalhar em equipe com funções bem definidas' },
      { value: 'C', label: 'Prefiro trabalhar sozinho para garantir a qualidade' },
    ],
  },
  {
    id: 'q5',
    question: 'O que é mais importante para você: resultados rápidos ou relacionamentos duradouros?',
    options: [
      { value: 'D', label: 'Resultados rápidos e metas atingidas' },
      { value: 'I', label: 'Relacionamentos e experiências compartilhadas' },
      { value: 'S', label: 'Um equilíbrio entre resultados e relacionamentos' },
      { value: 'C', label: 'Qualidade do trabalho independente do tempo' },
    ],
  },
  {
    id: 'q6',
    question: 'Como você se comporta sob pressão?',
    options: [
      { value: 'D', label: 'Fico mais focado e determinado a resolver' },
      { value: 'I', label: 'Busco apoio de outras pessoas e compartilho a carga' },
      { value: 'S', label: 'Fico mais quieto e trabalho metodicamente' },
      { value: 'C', label: 'Me concentro nos detalhes e sigo os procedimentos' },
    ],
  },
  {
    id: 'q7',
    question: 'Você é mais detalhista ou focado no quadro geral?',
    options: [
      { value: 'D', label: 'Focado no quadro geral e nos objetivos finais' },
      { value: 'I', label: 'Vejo o quadro geral mas me empolgo com os detalhes interessantes' },
      { value: 'S', label: 'Gosto de entender tanto o quadro geral quanto os detalhes' },
      { value: 'C', label: 'Sou muito detalhista e analítico' },
    ],
  },
  {
    id: 'q8',
    question: 'Como você prefere se comunicar?',
    options: [
      { value: 'D', label: 'De forma direta, objetiva e focada em resultados' },
      { value: 'I', label: 'De forma entusiasmada, expressiva e com histórias' },
      { value: 'S', label: 'De forma calma, paciente e ouvindo os outros' },
      { value: 'C', label: 'De forma precisa, lógica e baseada em fatos' },
    ],
  },
]

export default function FormPage() {
  const params = useParams()
  const supabase = createClient()
  const [form, setForm] = useState<any>(null)
  const [participant, setParticipant] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [answers, setAnswers] = useState<Record<string, string>>({})

  useEffect(() => {
    fetchData()
  }, [params.id])

  const fetchData = async () => {
    setLoading(true)

    const { data: formData, error: formError } = await supabase
      .from('disc_forms')
      .select('*, participant:participants(*)')
      .eq('id', params.id)
      .single()

    if (formError || !formData) {
      setLoading(false)
      return
    }

    setForm(formData)
    setParticipant(formData.participant)

    if (formData.completed_at) {
      setSubmitted(true)
    }

    setLoading(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (Object.keys(answers).length < questions.length) {
      alert('Por favor, responda todas as perguntas.')
      return
    }

    setSubmitting(true)

    try {
      // Calculate DISC profile
      const scores = { D: 0, I: 0, S: 0, C: 0 }
      Object.values(answers).forEach((answer) => {
        scores[answer as keyof typeof scores]++
      })

      const dominantProfile = Object.entries(scores).reduce((a, b) =>
        a[1] > b[1] ? a : b
      )[0]

      // Save responses first
      await supabase
        .from('disc_forms')
        .update({
          answers: answers,
          profile_result: dominantProfile,
          completed_at: new Date().toISOString(),
        })
        .eq('id', params.id)

      // Call API to analyze with Claude
      const response = await fetch('/api/forms/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          formId: params.id,
          responses: answers,
          participant,
          discProfile: dominantProfile,
        }),
      })

      if (!response.ok) {
        console.error('Analysis API error')
      }

      setSubmitted(true)
    } catch (error) {
      console.error('Submit error:', error)
      alert('Erro ao enviar formulário. Tente novamente.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loading size="lg" />
      </div>
    )
  }

  if (!form) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="max-w-md">
          <CardContent className="text-center py-8">
            <p className="text-gray-500">Formulário não encontrado ou link inválido.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <Card className="max-w-md w-full">
          <CardContent className="text-center py-12">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Obrigado, {participant?.name}!
            </h2>
            <p className="text-gray-600">
              Suas respostas foram enviadas com sucesso. Nossa equipe irá analisar seu perfil em breve.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <Card className="mb-6">
          <CardHeader className="text-center">
            <div className="h-12 w-12 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-xl font-bold text-white">BE</span>
            </div>
            <CardTitle className="text-xl">Bethel Events</CardTitle>
            <p className="text-gray-500 mt-2">
              Olá {participant?.name}, responda as perguntas abaixo para identificarmos seu perfil comportamental.
            </p>
          </CardHeader>
        </Card>

        <form onSubmit={handleSubmit} className="space-y-6">
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
                      className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                        answers[q.id] === option.value
                          ? 'border-blue-500 bg-blue-50'
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
                        className="mt-1"
                      />
                      <span className="text-gray-700">{option.label}</span>
                    </label>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}

          <div className="flex justify-center">
            <Button
              type="submit"
              size="lg"
              loading={submitting}
              disabled={Object.keys(answers).length < questions.length}
            >
              Enviar Respostas
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
