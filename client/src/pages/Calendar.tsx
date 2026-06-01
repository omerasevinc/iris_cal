import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, ChevronRight, ExternalLink } from 'lucide-react'
import { useMealHistory, useMeals, useSettings } from '../hooks/useMeals'
import { BottomNav } from '../components/BottomNav'
import type { DayHistory } from '../api'

// ─── Date helpers ─────────────────────────────────────────────────────────────

function toISO(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

function todayISO(): string {
  return new Date().toISOString().substring(0, 10)
}

function monthBounds(year: number, month: number): { first: string; last: string } {
  const lastDay = new Date(year, month + 1, 0).getDate()
  return { first: toISO(year, month, 1), last: toISO(year, month, lastDay) }
}

// Returns a 6×7 grid of ISO date strings or null (for padding cells)
function buildGrid(year: number, month: number): (string | null)[][] {
  const firstDow = new Date(year, month, 1).getDay() // 0=Sun
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const weeks: (string | null)[][] = []
  let week: (string | null)[] = Array(firstDow).fill(null)

  for (let d = 1; d <= daysInMonth; d++) {
    week.push(toISO(year, month, d))
    if (week.length === 7) {
      weeks.push(week)
      week = []
    }
  }
  if (week.length > 0) {
    while (week.length < 7) week.push(null)
    weeks.push(week)
  }
  return weeks
}

// ─── Cell coloring ────────────────────────────────────────────────────────────

function cellStyle(kcal: number, target: number): { dot: string; bg: string } {
  if (kcal === 0) return { dot: '', bg: '' }
  const ratio = kcal / target
  if (ratio > 1.1) return { dot: 'bg-red-400', bg: 'bg-red-50' }
  if (ratio >= 0.9) return { dot: 'bg-green-400', bg: 'bg-green-50' }
  return { dot: 'bg-amber-400', bg: 'bg-amber-50' }
}

// ─── Day detail panel ─────────────────────────────────────────────────────────

function DayDetail({ date, kcalTarget }: { date: string; kcalTarget: number }) {
  const navigate = useNavigate()
  const { data: meals = [], isLoading } = useMeals(date)

  const label = new Date(date + 'T00:00:00').toLocaleDateString([], {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })

  const totalKcal = meals.reduce((s, m) => s + m.total_kcal, 0)
  const totalProtein = meals.reduce((s, m) => s + m.total_protein_g, 0)

  return (
    <div className="bg-white rounded-2xl shadow-sm p-4">
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="font-semibold text-gray-900">{label}</p>
          {meals.length > 0 && (
            <p className="text-sm text-gray-500 mt-0.5">
              {Math.round(totalKcal)} / {kcalTarget} kcal ·{' '}
              <span className="text-blue-500">{Math.round(totalProtein)}g protein</span>
            </p>
          )}
        </div>
        <button
          onClick={() => navigate(`/dashboard?date=${date}`)}
          className="flex items-center gap-1.5 text-xs text-teal-600 font-medium px-3 py-2 rounded-lg border border-teal-200 hover:bg-teal-50 transition-colors min-h-[36px]"
        >
          Open <ExternalLink size={13} />
        </button>
      </div>

      {isLoading ? (
        <p className="text-sm text-gray-400 py-2">Loading…</p>
      ) : meals.length === 0 ? (
        <p className="text-sm text-gray-400 py-2">No meals logged</p>
      ) : (
        <ul className="divide-y divide-gray-50">
          {meals.map((m) => (
            <li key={m.id} className="py-2 flex items-center justify-between gap-2">
              <span className="text-sm text-gray-800 truncate flex-1">{m.meal_name}</span>
              <span className="text-sm font-medium text-teal-600 shrink-0">
                {Math.round(m.total_kcal)} kcal
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

const DOW_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export function Calendar() {
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth())
  const [selected, setSelected] = useState<string>(todayISO())

  const { first, last } = monthBounds(year, month)
  const { data: history = [], isLoading } = useMealHistory(first, last)
  const { data: settings } = useSettings()
  const kcalTarget = settings?.kcal_target ?? 2000

  // Build a lookup map: date → DayHistory
  const dayMap = new Map<string, DayHistory>(history.map((d) => [d.date, d]))

  const grid = buildGrid(year, month)
  const today = todayISO()

  function prevMonth() {
    if (month === 0) { setYear((y) => y - 1); setMonth(11) }
    else setMonth((m) => m - 1)
  }
  function nextMonth() {
    if (month === 11) { setYear((y) => y + 1); setMonth(0) }
    else setMonth((m) => m + 1)
  }

  const monthLabel = new Date(year, month, 1).toLocaleDateString([], {
    month: 'long',
    year: 'numeric',
  })

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <div className="px-4 pt-12 pb-6 max-w-lg mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Calendar</h1>

        {/* Month navigation */}
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={prevMonth}
            className="p-2 rounded-lg hover:bg-gray-200 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
          >
            <ChevronLeft size={20} />
          </button>
          <h2 className="font-semibold text-gray-900">{monthLabel}</h2>
          <button
            onClick={nextMonth}
            disabled={year === now.getFullYear() && month === now.getMonth()}
            className="p-2 rounded-lg hover:bg-gray-200 disabled:opacity-30 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
          >
            <ChevronRight size={20} />
          </button>
        </div>

        {/* Calendar grid */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden mb-4">
          {/* Day-of-week header */}
          <div className="grid grid-cols-7 border-b border-gray-100">
            {DOW_LABELS.map((d) => (
              <div key={d} className="text-center py-2 text-[11px] font-semibold text-gray-400">
                {d}
              </div>
            ))}
          </div>

          {/* Weeks */}
          {isLoading ? (
            <div className="h-48 flex items-center justify-center text-gray-400 text-sm">
              Loading…
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {grid.map((week, wi) => (
                <div key={wi} className="grid grid-cols-7">
                  {week.map((dateStr, di) => {
                    if (!dateStr) {
                      return <div key={di} className="aspect-square p-1" />
                    }

                    const day = dayMap.get(dateStr)
                    const kcal = day?.total_kcal ?? 0
                    const { dot, bg } = cellStyle(kcal, kcalTarget)
                    const isSelected = dateStr === selected
                    const isToday = dateStr === today
                    const isFuture = dateStr > today
                    const dayNum = Number(dateStr.substring(8))

                    return (
                      <button
                        key={di}
                        onClick={() => setSelected(dateStr)}
                        disabled={isFuture}
                        className={`aspect-square p-1 flex flex-col items-center justify-center gap-0.5 transition-colors ${
                          isFuture ? 'opacity-30 cursor-default' : 'hover:bg-gray-50'
                        } ${bg && !isSelected ? bg : ''} ${
                          isSelected
                            ? 'ring-2 ring-inset ring-teal-500 rounded-xl'
                            : ''
                        }`}
                      >
                        <span
                          className={`text-sm leading-none font-medium ${
                            isToday
                              ? 'text-teal-600 font-bold'
                              : isSelected
                              ? 'text-teal-700'
                              : 'text-gray-700'
                          }`}
                        >
                          {dayNum}
                        </span>
                        {dot ? (
                          <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />
                        ) : (
                          <span className="w-1.5 h-1.5" />
                        )}
                      </button>
                    )
                  })}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 mb-4 px-1">
          {[
            { dot: 'bg-green-400', label: 'On target' },
            { dot: 'bg-amber-400', label: 'Under' },
            { dot: 'bg-red-400', label: 'Over' },
          ].map(({ dot, label }) => (
            <div key={label} className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${dot}`} />
              <span className="text-xs text-gray-500">{label}</span>
            </div>
          ))}
        </div>

        {/* Selected day detail */}
        <DayDetail date={selected} kcalTarget={kcalTarget} />
      </div>

      <BottomNav />
    </div>
  )
}
