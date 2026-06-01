import { useState, useEffect, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useSettings, useSaveSettings } from '../hooks/useMeals'
import { BottomNav } from '../components/BottomNav'

export function Settings() {
  const { currentUser, availableUsers, logout, switchUser } = useAuth()
  const navigate = useNavigate()
  const { data: settings, isLoading } = useSettings()
  const save = useSaveSettings()

  const [form, setForm] = useState({
    kcal_target: 2000,
    protein_target: 150,
    fat_target: 70,
    carbs_target: 250,
  })

  useEffect(() => {
    if (settings) {
      setForm({
        kcal_target: settings.kcal_target,
        protein_target: settings.protein_target,
        fat_target: settings.fat_target,
        carbs_target: settings.carbs_target,
      })
    }
  }, [settings])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    await save.mutateAsync(form)
  }

  const otherUsers = availableUsers.filter((u) => u.id !== currentUser?.id)

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="px-4 pt-12 pb-6 max-w-lg mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Settings</h1>

        {/* Profile */}
        <section className="bg-white rounded-xl shadow-sm p-4 mb-4">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
            Profile
          </h2>
          <p className="font-semibold text-gray-900">{currentUser?.name}</p>
          <p className="text-sm text-gray-400">{currentUser?.email}</p>
        </section>

        {/* Daily targets */}
        <section className="bg-white rounded-xl shadow-sm p-4 mb-4">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
            Daily targets
          </h2>
          {isLoading ? (
            <p className="text-gray-400 text-sm">Loading…</p>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-3">
              {(
                [
                  { key: 'kcal_target', label: 'Calories (kcal)' },
                  { key: 'protein_target', label: 'Protein (g)' },
                  { key: 'fat_target', label: 'Fat (g)' },
                  { key: 'carbs_target', label: 'Carbs (g)' },
                ] as const
              ).map(({ key, label }) => (
                <div key={key} className="flex items-center justify-between gap-4">
                  <label className="text-sm text-gray-700 flex-1">{label}</label>
                  <input
                    type="number"
                    min={1}
                    value={form[key]}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, [key]: Number(e.target.value) }))
                    }
                    className="w-28 border border-gray-200 rounded-lg px-3 py-2 text-right text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              ))}

              {save.isError && (
                <p className="text-sm text-red-500">{save.error?.message}</p>
              )}
              {save.isSuccess && (
                <p className="text-sm text-green-600">Saved!</p>
              )}

              <button
                type="submit"
                disabled={save.isPending}
                className="w-full mt-2 bg-teal-600 text-white font-semibold py-3 rounded-xl hover:bg-teal-700 disabled:opacity-60 transition-colors"
              >
                {save.isPending ? 'Saving…' : 'Save'}
              </button>
            </form>
          )}
        </section>

        {/* User switch */}
        <section className="bg-white rounded-xl shadow-sm p-4 mb-4">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
            Switch user
          </h2>
          {otherUsers.length === 0 ? (
            <p className="text-sm text-gray-400">
              No other users logged in. Log in as another user to switch.
            </p>
          ) : (
            <div className="space-y-2">
              {otherUsers.map((u) => (
                <button
                  key={u.id}
                  onClick={() => {
                    switchUser(u.id)
                    navigate('/dashboard', { replace: true })
                  }}
                  className="w-full text-left px-4 py-3 rounded-xl border border-gray-200 hover:border-teal-400 hover:bg-teal-50 transition-colors"
                >
                  <p className="font-medium text-gray-900">{u.name}</p>
                  <p className="text-xs text-gray-400">{u.email}</p>
                </button>
              ))}
            </div>
          )}
        </section>

        {/* Logout */}
        <button
          onClick={() => {
            logout()
            navigate('/login', { replace: true })
          }}
          className="w-full py-3 rounded-xl border border-red-200 text-red-500 font-medium hover:bg-red-50 transition-colors"
        >
          Log out
        </button>
      </div>

      <BottomNav />
    </div>
  )
}
