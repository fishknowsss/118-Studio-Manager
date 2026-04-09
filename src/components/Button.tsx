import type { ButtonHTMLAttributes, ReactNode } from 'react'

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost'
type Size = 'sm' | 'md'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  children: ReactNode
}

const variantClasses: Record<Variant, string> = {
  primary: 'bg-primary text-white shadow-[var(--shadow-xs)] hover:bg-primary-dark hover:shadow-[var(--shadow-sm)] active:shadow-none',
  secondary: 'bg-white text-text-primary border border-border shadow-[var(--shadow-xs)] hover:bg-gray-50 hover:border-gray-300 active:bg-gray-100',
  danger: 'bg-danger text-white shadow-[var(--shadow-xs)] hover:bg-danger/90 active:shadow-none',
  ghost: 'text-text-secondary hover:bg-gray-100 hover:text-text-primary active:bg-gray-200',
}

const sizeClasses: Record<Size, string> = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-4 py-2 text-sm',
}

export function Button({ variant = 'primary', size = 'md', className = '', children, ...props }: ButtonProps) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-1.5 rounded-lg font-medium transition-all duration-200 disabled:opacity-50 disabled:pointer-events-none cursor-pointer ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}
