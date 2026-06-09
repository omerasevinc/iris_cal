import { NavLink } from 'react-router-dom'
import { Home, Camera, CalendarDays, Users, Settings } from 'lucide-react'

const links = [
  { to: '/dashboard', icon: Home, label: 'Home' },
  { to: '/log', icon: Camera, label: 'Log' },
  { to: '/calendar', icon: CalendarDays, label: 'Calendar' },
  { to: '/social', icon: Users, label: 'Friends' },
  { to: '/settings', icon: Settings, label: 'Settings' },
]

export function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-40 safe-area-bottom">
      <ul className="flex">
        {links.map(({ to, icon: Icon, label }) => (
          <li key={to} className="flex-1">
            <NavLink
              to={to}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center py-2 gap-0.5 min-h-[56px] w-full transition-colors ${
                  isActive ? 'text-teal-600' : 'text-gray-400'
                }`
              }
            >
              <Icon size={22} />
              <span className="text-[10px] font-medium">{label}</span>
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}
