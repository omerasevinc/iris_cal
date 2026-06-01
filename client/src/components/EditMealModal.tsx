import { useState, useEffect } from 'react'
import { X, Plus, Trash2 } from 'lucide-react'
import type { FoodItem, AnalysisResult } from '../api'

interface Props {
  initial: Partial<AnalysisResult> | null
  onSave: (data: {
    meal_name: string
    items: FoodItem[]
    total_kcal: number
    total_protein_g: number
    total_fat_g: number
    total_carbs_g: number
    ai_confidence?: string
    ai_notes?: string
  }) => void
  onClose: () => void
  isSaving: boolean
}

function emptyItem(): FoodItem {
  return { name: '', weight_g: 0, kcal: 0, protein_g: 0, fat_g: 0, carbs_g: 0 }
}

function sumItems(items: FoodItem[]) {
  return items.reduce(
    (acc, it) => ({
      kcal: acc.kcal + it.kcal,
      protein_g: acc.protein_g + it.protein_g,
      fat_g: acc.fat_g + it.fat_g,
      carbs_g: acc.carbs_g + it.carbs_g,
    }),
    { kcal: 0, protein_g: 0, fat_g: 0, carbs_g: 0 }
  )
}

export function EditMealModal({ initial, onSave, onClose, isSaving }: Props) {
  const [mealName, setMealName] = useState(initial?.meal_name ?? '')
  const [items, setItems] = useState<FoodItem[]>(
    initial?.items && initial.items.length > 0 ? initial.items : [emptyItem()]
  )

  useEffect(() => {
    setMealName(initial?.meal_name ?? '')
    setItems(initial?.items && initial.items.length > 0 ? initial.items : [emptyItem()])
  }, [initial])

  const totals = sumItems(items)

  function updateItem<K extends keyof FoodItem>(index: number, key: K, value: FoodItem[K]) {
    setItems((prev) => prev.map((it, i) => (i === index ? { ...it, [key]: value } : it)))
  }

  function handleNumChange(index: number, key: keyof FoodItem, raw: string) {
    const val = parseFloat(raw)
    updateItem(index, key, isNaN(val) ? 0 : val)
  }

  function addRow() {
    setItems((prev) => [...prev, emptyItem()])
  }

  function removeRow(index: number) {
    setItems((prev) => prev.filter((_, i) => i !== index))
  }

  function handleSave() {
    onSave({
      meal_name: mealName,
      items,
      total_kcal: totals.kcal,
      total_protein_g: totals.protein_g,
      total_fat_g: totals.fat_g,
      total_carbs_g: totals.carbs_g,
      ai_confidence: initial?.confidence,
      ai_notes: initial?.notes,
    })
  }

  const cols: { key: keyof FoodItem; label: string; numeric: boolean }[] = [
    { key: 'name', label: 'Food', numeric: false },
    { key: 'weight_g', label: 'g', numeric: true },
    { key: 'kcal', label: 'kcal', numeric: true },
    { key: 'protein_g', label: 'prot', numeric: true },
    { key: 'fat_g', label: 'fat', numeric: true },
    { key: 'carbs_g', label: 'carbs', numeric: true },
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50">
      <div className="bg-white w-full sm:max-w-2xl sm:rounded-2xl rounded-t-2xl max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 pt-4 pb-2 border-b border-gray-100 shrink-0">
          <input
            value={mealName}
            onChange={(e) => setMealName(e.target.value)}
            placeholder="Meal name"
            className="text-lg font-semibold text-gray-900 flex-1 outline-none bg-transparent placeholder:text-gray-400"
          />
          <button
            onClick={onClose}
            className="ml-2 p-2 rounded-lg text-gray-400 hover:bg-gray-100 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* AI badges */}
        {initial?.confidence && (
          <div className="px-4 py-2 shrink-0 flex items-start gap-2 flex-wrap">
            <span
              className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                initial.confidence === 'high'
                  ? 'bg-green-100 text-green-700'
                  : initial.confidence === 'medium'
                  ? 'bg-yellow-100 text-yellow-700'
                  : 'bg-red-100 text-red-700'
              }`}
            >
              AI: {initial.confidence} confidence
            </span>
            {initial.notes && (
              <p className="text-xs text-gray-500 italic">{initial.notes}</p>
            )}
          </div>
        )}

        {/* Table */}
        <div className="flex-1 overflow-auto px-4 pb-2">
          <table className="w-full text-sm min-w-[480px]">
            <thead>
              <tr className="text-left text-xs text-gray-400 border-b border-gray-100">
                {cols.map((c) => (
                  <th key={c.key} className="py-2 pr-2 font-medium">
                    {c.label}
                  </th>
                ))}
                <th className="py-2 w-8" />
              </tr>
            </thead>
            <tbody>
              {items.map((item, i) => (
                <tr key={i} className="border-b border-gray-50">
                  {cols.map((c) => (
                    <td key={c.key} className="py-1.5 pr-2">
                      <input
                        type={c.numeric ? 'number' : 'text'}
                        min={c.numeric ? 0 : undefined}
                        step={c.numeric ? 'any' : undefined}
                        value={c.numeric ? (item[c.key] as number) : (item[c.key] as string)}
                        onChange={(e) =>
                          c.numeric
                            ? handleNumChange(i, c.key, e.target.value)
                            : updateItem(i, c.key, e.target.value as FoodItem[typeof c.key])
                        }
                        className={`w-full border border-transparent rounded px-1.5 py-1 focus:border-teal-400 focus:outline-none bg-gray-50 focus:bg-white transition-colors ${
                          c.numeric ? 'text-right w-16' : 'w-full'
                        }`}
                      />
                    </td>
                  ))}
                  <td className="py-1.5">
                    <button
                      onClick={() => removeRow(i)}
                      disabled={items.length === 1}
                      className="p-1 text-gray-300 hover:text-red-400 disabled:opacity-30 transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}

              {/* Totals row */}
              <tr className="text-xs font-semibold text-gray-700 border-t border-gray-200 bg-gray-50">
                <td className="py-2 pr-2 pl-1">Total</td>
                <td className="py-2 pr-2 text-right">—</td>
                <td className="py-2 pr-2 text-right text-teal-600">{Math.round(totals.kcal)}</td>
                <td className="py-2 pr-2 text-right">{Math.round(totals.protein_g)}</td>
                <td className="py-2 pr-2 text-right">{Math.round(totals.fat_g)}</td>
                <td className="py-2 pr-2 text-right">{Math.round(totals.carbs_g)}</td>
                <td />
              </tr>
            </tbody>
          </table>

          <button
            onClick={addRow}
            className="mt-3 flex items-center gap-1.5 text-sm text-teal-600 hover:text-teal-700 font-medium py-2"
          >
            <Plus size={16} />
            Add item
          </button>
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-4 py-4 border-t border-gray-100 shrink-0">
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-600 font-medium hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving || !mealName.trim()}
            className="flex-1 py-3 rounded-xl bg-teal-600 text-white font-semibold hover:bg-teal-700 disabled:opacity-60 transition-colors"
          >
            {isSaving ? 'Saving…' : 'Save meal'}
          </button>
        </div>
      </div>
    </div>
  )
}
