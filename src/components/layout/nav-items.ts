import { Home, Users, type LucideIcon } from 'lucide-react'

export interface NavItem {
  href: string
  label: string
  icon: LucideIcon
  // Whether the route matches only exactly (Inicio) or by prefix (Alumnos).
  exact: boolean
}

// Single source of truth for the primary navigation, shared by the desktop
// Sidebar and the mobile bottom bar.
export const NAV_ITEMS: NavItem[] = [
  { href: '/dashboard', label: 'Inicio', icon: Home, exact: true },
  { href: '/dashboard/clients', label: 'Alumnos', icon: Users, exact: false },
]

export function isNavActive(pathname: string, item: NavItem): boolean {
  return item.exact ? pathname === item.href : pathname.startsWith(item.href)
}
