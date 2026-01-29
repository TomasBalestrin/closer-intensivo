'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import { Button, Input, Card, CardContent, CardHeader, CardTitle } from '@/components/ui'

export default function LoginPage() {
  const router = useRouter()
  const supabase = createClient()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (authError) {
        if (authError.message?.includes('Invalid login credentials')) {
          setError('Email ou senha inválidos. Verifique suas credenciais.')
        } else if (authError.message?.includes('Email not confirmed')) {
          setError('Email não confirmado. Contate o administrador.')
        } else if (authError.message?.includes('too many requests')) {
          setError('Muitas tentativas de login. Aguarde alguns minutos e tente novamente.')
        } else {
          setError(`Erro de autenticação: ${authError.message}`)
        }
        setLoading(false)
        return
      }

      if (data.user) {
        // Get user role
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('role')
          .eq('id', data.user.id)
          .single()

        if (userError || !userData) {
          setError('Usuário autenticado mas não encontrado no sistema. Contate o administrador.')
          setLoading(false)
          return
        }

        if (userData.role === 'admin') {
          router.push('/admin/dashboard')
        } else {
          router.push('/closer/dashboard')
        }
        router.refresh()
      }
    } catch (err) {
      setError('Ocorreu um erro ao fazer login. Tente novamente.')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4">
            <div className="h-20 w-20 relative mx-auto">
              <Image
                src="/images/logo.png"
                alt="Bethel Events"
                fill
                className="object-contain"
              />
            </div>
          </div>
          <CardTitle className="text-2xl">Bethel Events</CardTitle>
          <p className="text-gray-500 mt-2">Sistema de Acompanhamento de Vendas</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}
            <Input
              id="email"
              type="email"
              label="Email"
              placeholder="seu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <Input
              id="password"
              type="password"
              label="Senha"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <Button type="submit" className="w-full" loading={loading}>
              Entrar
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
