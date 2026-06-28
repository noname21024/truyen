import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

function decodeJwtPayload(token: string) {
  try {
    const base64Payload = token.split('.')[1]
    const json = atob(base64Payload.replace(/-/g, '+').replace(/_/g, '/'))
    return JSON.parse(json)
  } catch {
    return null
  }
}

export default function AuthCallbackPage() {
  const navigate = useNavigate()

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const token = params.get('token')
    const error = params.get('auth_error')

    if (error || !token) {
      navigate('/', { replace: true })
      return
    }

    const payload = decodeJwtPayload(token)
    if (!payload) {
      navigate('/', { replace: true })
      return
    }

    localStorage.setItem('auth_token', token)
    localStorage.setItem('user', JSON.stringify({
      id: payload.user_id,
      name: payload.name,
      avatar: payload.avatar_url,
      provider: payload.provider,
    }))

    navigate('/', { replace: true })
  }, [navigate])

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <div className="flex flex-col items-center gap-3 text-on-surface-variant">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-sm">Đang đăng nhập...</p>
      </div>
    </div>
  )
}
