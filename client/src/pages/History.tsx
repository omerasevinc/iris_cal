import { useState } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
} from 'recharts'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { useMealHistory, useSettings } from '../hooks/useMeals'
import { BottomNav } from '../components/BottomNav'
import type { DayHistory } from '../api'

type Range = '7d' | '30d' | 'custom'

function daysAgo(n: number): string {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d.toISOString().substring(0, 10)
}

function today(): string {
  return new Date().toISOString().substring(0, 10)
}

function kCalStatus(kcal: number, target: number): string {
  const ratio = kcal / target
  if (ratio > 1.1) return 'bg-red-100 text-red-700'
  if (ratio >= 0.9) return 'bg-green-100 text-green-700'
  return 'bg-amber-100 text-amber-700'
}

function DayRow({ day, target }: { day: DayHistory; target: number }) {
  const [open, setOpen] = useState(false)
  const label = new Date(day.date + 'T00:00:00').toLocaleDateString([], {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })

  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden">
      <button
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors"
        onClick={() => setOpen((o) => !o)}
      >
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-gray-700 w-28 text-left">{label}</span>
          <span
            className={`text-xs px-2 py-0.5 rounded-full font-semibold ${kCalStatus(day.total_kcal, target)}`}
          >
            {Math.round(day.total_kcal)} kcal
          </span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-xs text-gray-400 hidden sm:block">
            P {Math.round(day.total_protein_g)}g
          </span>
          {open ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
        </div>
      </button>

      {open && (
        <div className="px-4 pb-3 border-t border-gray-50 space-y-2 pt-2">
          {day.meals.map((m) => (
            <div key={m.id} className="flex justify-between text-sm">
              <span className="text-gray-700 truncate flex-1">{m.meal_name}</span>
              <span className="text-gray-400 shrink-0 ml-2">{Math.round(m.total_kcal)} kcal</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export function History() {
  const [range, setRange] = useState<Range>('7d')
  const [customFrom, setCustomFrom] = useState(daysAgo(6))
  const [customTo, setCustomTo] = useState(today())

  const from = range === '7d' ? daysAgo(6) : range === '30d' ? daysAgo(29) : customFrom
  const to = range === '7d' || range === '30d' ? today() : customTo

  const { data: history = [], isLoading } = useMealHistory(from, to)
  const { data: settings } = useSettings()
  const kcalTarget = settings?.kcal_target ?? 2000

  const chartData = history.map((d) => ({
    date: new Date(d.date + 'T00:00:00').toLocaleDateString([], { month: 'numeric', day: 'numeric' }),
    kcal: Math.round(d.total_kcal),
    fullDate: d.date,
  }))

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="px-4 pt-12 pb-6 max-w-lg mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">History</h1>

        {/* Range selector */}
        <div className="flex gap-2 mb-4 flex-wrap">
          {(['7d', '30d', 'custom'] as Range[]).map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors min-h-[44px] ${
                range === r
                  ? 'bg-teal-600 text-white'
                  : 'bg-white text-gray-600 border border-gray-200 hover:border-teal-300'
              }`}
            >
              {r === '7d' ? 'Last 7 days' : r === '30d' ? 'Last 30 days' : 'Custom'}
            </button>
          ))}
        </div>

        {range === 'custom' && (
          <div className="flex gap-3 mb-4 flex-wrap">
            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-500">From</label>
              <input
                type="date"
                value={customFrom}
                max={customTo}
                onChange={(e) => setCustomFrom(e.target.value)}
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-500">To</label>
              <input
                type="date"
                value={customTo}
                min={customFrom}
                max={today()}
                onChange={(e) => setCustomTo(e.target.value)}
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
          </div>
        )}

        {/* Chart */}
        {isLoading ? (
          <div className="h-48 flex items-center justify-center text-gray-400">Loading…</div>
        ) : chartData.length === 0 ? (
          <div className="h-48 flex items-center justify-center text-gray-400 text-sm">
            No data for this period
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm p-4 mb-4">
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#9ca3af' }} />
                <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} />
                <Tooltip
                  formatter={(v) => [`${v} kcal`, 'Calories']}
                  contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 2px 8px rgba(0,0,0,.1)' }}
                />
                <ReferenceLine
                  y={kcalTarget}
                  stroke="#22c55e"
                  strokeDasharray="4 2"
                  label={{ value: 'Target', position: 'right', fontSize: 10, fill: '#22c55e' }}
                />
                <Bar dataKey="kcal" fill="#0d9488" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Day list */}
        <div className="space-y-2">
          {history.map((d) => (
            <DayRow key={d.date} day={d} target={kcalTarget} />
          ))}
        </div>
      </div>

      <BottomNav />
    </div>
  )
}
