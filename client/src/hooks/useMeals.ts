import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  apiFetch,
  apiUpload,
  chatApi,
  nutritionChatApi,
  type MealLog,
  type DayHistory,
  type AnalysisResult,
  type SaveMealBody,
  type UserSettings,
  type ChatApiMessage,
  type NutritionChatMessage,
} from '../api'

export function useMeals(date: string) {
  return useQuery({
    queryKey: ['meals', date],
    queryFn: () => apiFetch<MealLog[]>(`/meals?date=${date}`),
    enabled: !!date,
    staleTime: 60_000,
  })
}

export function useMealHistory(from: string, to: string) {
  return useQuery({
    queryKey: ['meal-history', from, to],
    queryFn: () => apiFetch<DayHistory[]>(`/meals/history?from=${from}&to=${to}`),
    enabled: !!from && !!to,
    staleTime: 60_000,
  })
}

export function useAnalyseMeal() {
  return useMutation({
    mutationFn: (file: File) => {
      const form = new FormData()
      form.append('image', file)
      return apiUpload<AnalysisResult>('/meals/analyse', form)
    },
  })
}

export function useSaveMeal() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: SaveMealBody) =>
      apiFetch<MealLog>('/meals', { method: 'POST', body: JSON.stringify(body) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['meals'] })
      qc.invalidateQueries({ queryKey: ['meal-history'] })
    },
  })
}

export function useUpdateMeal() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...body }: Partial<SaveMealBody> & { id: number }) =>
      apiFetch<MealLog>(`/meals/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['meals'] })
      qc.invalidateQueries({ queryKey: ['meal-history'] })
    },
  })
}

export function useDeleteMeal() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) =>
      apiFetch<void>(`/meals/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['meals'] })
      qc.invalidateQueries({ queryKey: ['meal-history'] })
    },
  })
}

export function useChat() {
  return useMutation({
    mutationFn: (messages: ChatApiMessage[]) => chatApi(messages),
  })
}

export function useNutritionChat() {
  return useMutation({
    mutationFn: (messages: NutritionChatMessage[]) => nutritionChatApi(messages),
  })
}

export function useSettings() {
  return useQuery({
    queryKey: ['settings'],
    queryFn: () => apiFetch<UserSettings>('/settings'),
    staleTime: 5 * 60_000,
  })
}

export function useSaveSettings() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: Omit<UserSettings, 'user_id'>) =>
      apiFetch<UserSettings>('/settings', { method: 'PUT', body: JSON.stringify(body) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['settings'] })
    },
  })
}
