import type { ReactNode } from 'react'

interface CardProps {
  children: ReactNode
  className?: string
  onClick?: () => void
  hoverable?: boolean
}

export function Card({ children, className = '', onClick, hoverable = false }: CardProps) {
  return (
    <div
      className={`bg-bg-card border border-border rounded-xl shadow-[var(--shadow-sm)] ${hoverable ? 'hover:shadow-[var(--shadow-md)] hover:border-primary/20 transition-all duration-200 cursor-pointer' : ''} ${className}`}
      onClick={onClick}
    >
      {children}
    </div>
  )
}
