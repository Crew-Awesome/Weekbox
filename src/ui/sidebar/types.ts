export interface SidebarNavItem {
  id: string
  label: string
  icon: string
  path: string
}

export interface SidebarProps {
  onNavigate?: (path: string) => void
}
