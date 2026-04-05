import {
  Utensils,
  Zap,
  Clapperboard,
  Smartphone,
  Car,
  Package,
  Briefcase,
  Laptop,
  LayoutDashboard,
  ArrowLeftRight,
  CreditCard,
  PiggyBank,
  Banknote,
  History,
  Settings,
  Home,
  Receipt,
  ShoppingCart,
  Heart,
  GraduationCap,
  Plane,
  Gift,
  Coffee,
  Dumbbell,
  Pill,
  MoreHorizontal,
  Plus,
  ChevronLeft,
  ChevronRight,
  Lock,
  type LucideProps,
} from 'lucide-react'
import { type ComponentType } from 'react'

/** Static icon map resolving DB string names to Lucide components */
export const ICON_MAP: Record<string, ComponentType<LucideProps>> = {
  // Default category icons (from seed data)
  utensils: Utensils,
  zap: Zap,
  clapperboard: Clapperboard,
  smartphone: Smartphone,
  car: Car,
  package: Package,
  briefcase: Briefcase,
  laptop: Laptop,
  // Nav icons
  'layout-dashboard': LayoutDashboard,
  'arrow-left-right': ArrowLeftRight,
  'credit-card': CreditCard,
  'piggy-bank': PiggyBank,
  banknote: Banknote,
  history: History,
  settings: Settings,
  'more-horizontal': MoreHorizontal,
  plus: Plus,
  'chevron-left': ChevronLeft,
  'chevron-right': ChevronRight,
  lock: Lock,
  // Extra icons for custom categories
  home: Home,
  receipt: Receipt,
  'shopping-cart': ShoppingCart,
  heart: Heart,
  'graduation-cap': GraduationCap,
  plane: Plane,
  gift: Gift,
  coffee: Coffee,
  dumbbell: Dumbbell,
  pill: Pill,
}

interface DynamicIconProps extends LucideProps {
  name: string
}

/** Renders a Lucide icon by its DB string name, falling back to Package */
export default function DynamicIcon({ name, ...props }: DynamicIconProps) {
  const IconComponent = ICON_MAP[name] ?? Package
  return <IconComponent {...props} />
}
