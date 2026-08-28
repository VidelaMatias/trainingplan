import { Home, UserCog, Users, Wallet, type LucideIcon } from 'lucide-react'

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
  // Sin esta entrada, /dashboard/payments no activaba ningún ítem —la barra no
  // indicaba dónde estaba parado el usuario— y en mobile, donde la barra
  // inferior es la navegación principal, el único acceso era el tile del panel.
  { href: '/dashboard/payments', label: 'Pagos', icon: Wallet, exact: true },
  { href: '/dashboard/account', label: 'Cuenta', icon: UserCog, exact: true },
]

export function isNavActive(pathname: string, item: NavItem): boolean {
  return item.exact ? pathname === item.href : pathname.startsWith(item.href)
}
