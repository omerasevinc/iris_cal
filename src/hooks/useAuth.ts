import { useState, useCallback } from 'react'
import { useMutation } from '@tanstack/react-query'
import {
  apiFetch,
  type AuthUser,
  type LoginResponse,
  getActiveUserId,
  setActiveUserId,
  getStoredUser,
  setStoredToken,
  setStoredUser,
  clearStoredUser,
  getAllStoredUsers,
} from '../api'

function readCurrentUser(): AuthUser | null {
  const id = getActiveUserId()
  return id ? getStoredUser(id) : null
}

export function useAuth() {
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(readCurrentUser)
  const [availableUsers, setAvailableUsers] = useState<AuthUser[]>(getAllStoredUsers)

  const refresh = useCallback(() => {
    setCurrentUser(readCurrentUser())
    setAvailableUsers(getAllStoredUsers())
  }, [])

  const loginMutation = useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) =>
      apiFetch<LoginResponse>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      }),
    onSuccess: ({ token, user }) => {
      setStoredToken(user.id, token)
      setStoredUser(user)
      setActiveUserId(user.id)
      refresh()
    },
  })

  const logout = useCallback(() => {
    const id = getActiveUserId()
    if (id) clearStoredUser(id)
    localStorage.removeItem('auth_active_user_id')
    refresh()
  }, [refresh])

  const switchUser = useCallback(
    (userId: number) => {
      setActiveUserId(userId)
      refresh()
    },
    [refresh]
  )

  return {
    currentUser,
    availableUsers,
    login: (email: string, password: string) => loginMutation.mutateAsync({ email, password }),
    loginIsPending: loginMutation.isPending,
    loginError: loginMutation.error?.message ?? null,
    logout,
    switchUser,
  }
}
