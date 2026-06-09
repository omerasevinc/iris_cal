import { useAuth } from '../hooks/useAuth'
import { useSocialToday } from '../hooks/useMeals'
import { BottomNav } from '../components/BottomNav'
import type { UserTodaySummary } from '../api'

function pct(val: number, target: number) {
  return Math.min(100, target > 0 ? Math.round((val / target) * 100) : 0)
}

interface MacroBarProps {
  label: string
  value: number
  target: number
  color: string
}

function MacroBar({ label, value, target, color }: MacroBarProps) {
  const p = pct(value, target)
  return (
    <div>
      <div className="flex justify-between text-xs text-gray-500 mb-1">
        <span>{label}</span>
        <span>
          {value}
          <span className="text-gray-400"> / {target}g</span>
        </span>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${p}%`, backgroundColor: color }}
        />
      </div>
    </div>
  )
}

function UserCard({ summary, isMe }: { summary: UserTodaySummary; isMe: boolean }) {
  const kcalPct = pct(summary.total_kcal, summary.kcal_target)

  return (
    <div className={`bg-white rounded-2xl shadow-sm p-4 ${isMe ? 'ring-2 ring-teal-400' : ''}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white"
            style={{ backgroundColor: isMe ? '#0d9488' : '#6366f1' }}
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

      {/* Calorie progress arc */}
      <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden mb-4">
        <div
          className="h-full rounded-full transition-all"
          style={{
            width: `${kcalPct}%`,
            backgroundColor: kcalPct >= 100 ? '#ef4444' : '#0d9488',
          }}
        />
      </div>

      <div className="space-y-2">
        <MacroBar
          label="Protein"
          value={summary.total_protein_g}
          target={summary.protein_target}
          color="#3b82f6"
        />
        <MacroBar
          label="Fat"
          value={summary.total_fat_g}
          target={summary.fat_target}
          color="#eab308"
        />
        <MacroBar
          label="Carbs"
          value={summary.total_carbs_g}
          target={summary.carbs_target}
          color="#f97316"
        />
      </div>
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
        {isLoading && (
          <div className="text-center py-16 text-gray-400">Loading…</div>
        )}

        {error && (
          <div className="text-center py-16 text-red-400 text-sm">
            Could not load data. Try again later.
          </div>
        )}

        {!isLoading && !error && summaries.map((s) => (
          <UserCard
            key={s.user_id}
            summary={s}
            isMe={s.user_id === currentUser?.id}
          />
        ))}

        {!isLoading && !error && summaries.length === 0 && (
          <div className="text-center py-16 text-gray-400 text-sm">No users found.</div>
        )}
      </div>

      <BottomNav />
    </div>
  )
}
