import { Trash2 } from 'lucide-react'
import type { MealLog } from '../api'

interface Props {
  meal: MealLog
  onDelete: (id: number) => void
}

function fmt(n: number) {
  return Math.round(n)
}

function timeLabel(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

export function MealCard({ meal, onDelete }: Props) {
  return (
    <div className="bg-white rounded-xl shadow-sm p-4 flex items-start justify-between gap-3">
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2 flex-wrap">
          <h3 className="font-semibold text-gray-900 truncate">{meal.meal_name}</h3>
          <span className="text-xs text-gray-400 shrink-0">{timeLabel(meal.logged_at)}</span>
        </div>
        <p className="text-lg font-bold text-teal-600 mt-0.5">{fmt(meal.total_kcal)} kcal</p>
        <div className="flex gap-3 mt-1 flex-wrap">
          <span className="text-xs text-gray-500">
            <span className="font-medium text-blue-600">{fmt(meal.total_protein_g)}g</span> protein
          </span>
          <span className="text-xs text-gray-500">
            <span className="font-medium text-yellow-600">{fmt(meal.total_fat_g)}g</span> fat
          </span>
          <span className="text-xs text-gray-500">
            <span className="font-medium text-orange-500">{fmt(meal.total_carbs_g)}g</span> carbs
          </span>
        </div>
        {meal.ai_confidence && (
          <span
            className={`inline-block mt-2 text-[10px] px-2 py-0.5 rounded-full font-medium ${
              meal.ai_confidence === 'high'
                ? 'bg-green-100 text-green-700'
                : meal.ai_confidence === 'medium'
                ? 'bg-yellow-100 text-yellow-700'
                : 'bg-red-100 text-red-700'
            }`}
          >
            {meal.ai_confidence} confidence
          </span>
        )}
      </div>
      <button
        onClick={() => onDelete(meal.id)}
        className="shrink-0 p-2 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
        aria-label="Delete meal"
      >
        <Trash2 size={18} />
      </button>
    </div>
  )
}
