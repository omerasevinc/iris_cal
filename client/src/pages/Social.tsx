import { useState } from 'react'
import { ChevronDown, ChevronUp, UtensilsCrossed } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { useSocialToday } from '../hooks/useMeals'
import { BottomNav } from '../components/BottomNav'
import type { UserTodaySummary, SocialMeal } from '../api'

function pct(val: number, target: number) {
  return Math.min(100, target > 0 ? Math.round((val / target) * 100) : 0)
}

function MacroBar({ label, value, target, color }: { label: string; value: number; target: number; color: string }) {
  const p = pct(value, target)
  return (
    <div>
      <div className="flex justify-between text-xs text-gray-500 mb-1">
        <span>{label}</span>
        <span>{value}<span className="text-gray-400"> / {target}g</span></span>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${p}%`, backgroundColor: color }} />
      </div>
    </div>
  )
}

function MealRow({ meal }: { meal: SocialMeal }) {
  const time = new Date(meal.logged_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  return (
    <div className="py-3 border-b border-gray-50 last:border-0">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-800 truncate">{meal.meal_name}</p>
          <p className="text-xs text-gray-400 mt-0.5">{time}</p>
          <div className="flex flex-wrap gap-x-3 mt-1">
            {meal.items.map((item, i) => (
              <span key={i} className="text-xs text-gray-500">
                {item.name}{item.weight_g > 0 ? ` · ${item.weight_g}g` : ''}
              </span>
            ))}
          </div>
        </div>
        <div className="text-right shrink-0">
          <p className="text-sm font-semibold text-gray-800">{Math.round(meal.total_kcal)} kcal</p>
          <p className="text-xs text-gray-400">
            P{Math.round(meal.total_protein_g)} F{Math.round(meal.total_fat_g)} C{Math.round(meal.total_carbs_g)}
          </p>
        </div>
      </div>
    </div>
  )
}

function UserCard({ summary, isMe }: { summary: UserTodaySummary; isMe: boolean }) {
  const [expanded, setExpanded] = useState(false)
  const kcalPct = pct(summary.total_kcal, summary.kcal_target)
  const accentColor = isMe ? '#0d9488' : '#6366f1'

  return (
    <div className={`bg-white rounded-2xl shadow-sm overflow-hidden ${isMe ? 'ring-2 ring-teal-400' : ''}`}>
      {/* Header row — always visible */}
      <div className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0"
              style={{ backgroundColor: accentColor }}
            >
              {summary.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="font-semibold text-gray-900 text-sm">{summary.name}</p>
              {isMe && <p className="text-[10px] text-teal-600 font-medium">You</p>}
            </div>
          </div>
          <div className="text-right">
            <p className="text-xl font-bold text-gray-900">{summary.total_kcal}</p>
            <p className="text-xs text-gray-400">/ {summary.kcal_target} kcal</p>
          </div>
        </div>

        <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden mb-4">
          <div
            className="h-full rounded-full transition-all"
            style={{ width: `${kcalPct}%`, backgroundColor: kcalPct >= 100 ? '#ef4444' : accentColor }}
          />
        </div>

        <div className="space-y-2">
          <MacroBar label="Protein" value={summary.total_protein_g} target={summary.protein_target} color="#3b82f6" />
          <MacroBar label="Fat"     value={summary.total_fat_g}     target={summary.fat_target}     color="#eab308" />
          <MacroBar label="Carbs"   value={summary.total_carbs_g}   target={summary.carbs_target}   color="#f97316" />
        </div>
      </div>

      {/* Expand toggle */}
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-2.5 border-t border-gray-100 text-xs font-medium text-gray-500 hover:bg-gray-50 transition-colors"
      >
        <span>
          {summary.meals.length === 0
            ? 'No meals logged yet'
            : `${summary.meals.length} meal${summary.meals.length > 1 ? 's' : ''} today`}
        </span>
        {summary.meals.length > 0 && (
          expanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />
        )}
      </button>

      {/* Expanded meal list */}
      {expanded && summary.meals.length > 0 && (
        <div className="px-4 pb-2 border-t border-gray-50">
          {summary.meals.map((meal) => (
            <MealRow key={meal.id} meal={meal} />
          ))}
        </div>
      )}
    </div>
  )
}

export function Social() {
  const { currentUser } = useAuth()
  const { data: summaries = [], isLoading, error } = useSocialToday()

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <div className="bg-white border-b border-gray-100 px-4 pt-12 pb-4">
        <h1 className="text-xl font-bold text-gray-900">Friends</h1>
        <p className="text-sm text-gray-400 mt-0.5">Today's nutrition</p>
      </div>

      <div className="px-4 pt-4 max-w-lg mx-auto space-y-4">
        {isLoading && <div className="text-center py-16 text-gray-400">Loading…</div>}

        {error && (
          <div className="text-center py-16 text-red-400 text-sm">
            Could not load data. Try again later.
          </div>
        )}

        {!isLoading && !error && summaries.length === 0 && (
          <div className="flex flex-col items-center py-16 text-gray-400">
            <UtensilsCrossed size={40} className="mb-3 text-gray-300" />
            <p className="text-sm">No users found.</p>
          </div>
        )}

        {!isLoading && !error && summaries.map((s) => (
          <UserCard key={s.user_id} summary={s} isMe={s.user_id === currentUser?.id} />
        ))}
      </div>

      <BottomNav />
    </div>
  )
}
