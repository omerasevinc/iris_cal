import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { useMeals, useSettings, useDeleteMeal } from '../hooks/useMeals'
import { MacroRing } from '../components/MacroRing'
import { MealCard } from '../components/MealCard'
import { BottomNav } from '../components/BottomNav'
import { getStoredUser } from '../api'

function todayISO() {
  return new Date().toISOString().substring(0, 10)
}

function offsetDate(iso: string, days: number): string {
  const d = new Date(iso)
  d.setDate(d.getDate() + days)
  return d.toISOString().substring(0, 10)
}

function prettyDate(iso: string) {
  const d = new Date(iso + 'T00:00:00')
  const today = todayISO()
  if (iso === today) return 'Today'
  const yesterday = offsetDate(today, -1)
  if (iso === yesterday) return 'Yesterday'
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' })
}

export function Dashboard() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [date, setDate] = useState(() => searchParams.get('date') ?? todayISO())
  const { currentUser, availableUsers, switchUser } = useAuth()

  const { data: meals = [], isLoading: mealsLoading } = useMeals(date)
  const { data: settings } = useSettings()
  const deleteMeal = useDeleteMeal()

  const totals = meals.reduce(
    (acc, m) => ({
      kcal: acc.kcal + m.total_kcal,
      protein: acc.protein + m.total_protein_g,
      fat: acc.fat + m.total_fat_g,
      carbs: acc.carbs + m.total_carbs_g,
    }),
    { kcal: 0, protein: 0, fat: 0, carbs: 0 }
  )

  const targets = {
    kcal: settings?.kcal_target ?? 2000,
    protein: settings?.protein_target ?? 150,
    fat: settings?.fat_target ?? 70,
    carbs: settings?.carbs_target ?? 250,
  }

  // Other logged-in users for the switcher pill
  const otherUsers = availableUsers.filter((u) => u.id !== currentUser?.id)
  const allPillUsers = currentUser ? [currentUser, ...otherUsers] : otherUsers

  function handleSwitch(userId: number) {
    if (userId !== currentUser?.id) switchUser(userId)
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-4 pt-12 pb-4">
        {/* User switcher */}
        {allPillUsers.length > 1 && (
          <div className="flex gap-2 mb-3 flex-wrap">
            {allPillUsers.map((u) => {
              const storedUser = getStoredUser(u.id)
              const label = storedUser?.name ?? u.name
              const isActive = u.id === currentUser?.id
              return (
                <button
                  key={u.id}
                  onClick={() => handleSwitch(u.id)}
                  className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-teal-600 text-white'
                      : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                  }`}
                >
                  {label}
                </button>
              )
            })}
          </div>
        )}

        {/* Date picker */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => setDate((d) => offsetDate(d, -1))}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
          >
            <ChevronLeft size={20} />
          </button>
          <h2 className="font-semibold text-gray-900 text-lg">{prettyDate(date)}</h2>
          <button
            onClick={() => setDate((d) => offsetDate(d, 1))}
            disabled={date >= todayISO()}
            className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-30 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
          >
            <ChevronRight size={20} />
          </button>
        </div>
      </div>

      <div className="px-4 pt-5 max-w-lg mx-auto">
        {/* Macro rings */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-white rounded-xl shadow-sm p-4 flex items-center justify-center">
            <MacroRing
              label="Calories"
              current={totals.kcal}
              target={targets.kcal}
              unit="kcal"
              color="#0d9488"
            />
          </div>
          <div className="bg-white rounded-xl shadow-sm p-4 flex items-center justify-center">
            <MacroRing
              label="Protein"
              current={totals.protein}
              target={targets.protein}
              unit="g"
              color="#3b82f6"
            />
          </div>
          <div className="bg-white rounded-xl shadow-sm p-4 flex items-center justify-center">
            <MacroRing
              label="Fat"
              current={totals.fat}
              target={targets.fat}
              unit="g"
              color="#eab308"
            />
          </div>
          <div className="bg-white rounded-xl shadow-sm p-4 flex items-center justify-center">
            <MacroRing
              label="Carbs"
              current={totals.carbs}
              target={targets.carbs}
              unit="g"
              color="#f97316"
            />
          </div>
        </div>

        {/* Meal list */}
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
          Meals
        </h3>

        {mealsLoading ? (
          <div className="text-center py-8 text-gray-400">Loading…</div>
        ) : meals.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <p className="text-lg">No meals logged</p>
            <p className="text-sm mt-1">Tap + to log your first meal</p>
          </div>
        ) : (
          <div className="space-y-3">
            {meals.map((meal) => (
              <MealCard
                key={meal.id}
                meal={meal}
                onDelete={(id) => deleteMeal.mutate(id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* FAB */}
      <button
        onClick={() => navigate('/log')}
        className="fixed bottom-20 right-4 w-14 h-14 bg-teal-600 text-white rounded-full shadow-lg flex items-center justify-center hover:bg-teal-700 transition-colors z-30"
        aria-label="Log meal"
      >
        <Plus size={26} />
      </button>

      <BottomNav />
    </div>
  )
}
