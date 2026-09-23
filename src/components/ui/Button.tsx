import type { ButtonHTMLAttributes, CSSProperties, ReactNode } from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'danger' | 'gold' | 'ghost';
export type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  children: ReactNode;
  style?: CSSProperties;
}

export function Button({
  variant = 'primary',
  size = 'md',
  isLoading = false,
  leftIcon,
  rightIcon,
  children,
  disabled,
  className = '',
  style,
  ...props
}: ButtonProps) {
  const sizeClass = size === 'sm' ? 'btn-sm' : size === 'lg' ? 'btn-lg' : '';

  // Custom inline styles for gold and ghost variants if not covered by CSS classes
  const variantStyle: CSSProperties =
    variant === 'gold'
      ? {
          background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
          color: '#000',
          fontWeight: 700,
          border: 'none',
          boxShadow: 'var(--shadow-gold)',
          cursor: disabled || isLoading ? 'not-allowed' : 'pointer',
        }
      : variant === 'ghost'
      ? {
          background: 'transparent',
          color: 'var(--text-secondary)',
          border: '1px solid transparent',
          cursor: disabled || isLoading ? 'not-allowed' : 'pointer',
        }
      : {};

  return (
    <button
      className={`btn btn-${variant} ${sizeClass} ${className}`}
      disabled={disabled || isLoading}
      style={{ ...variantStyle, ...style }}
      {...props}
    >
      {isLoading ? (
        <span
          style={{
            display: 'inline-block',
            width: '14px',
            height: '14px',
            border: '2px solid currentColor',
            borderRightColor: 'transparent',
            borderRadius: '50%',
            animation: 'spin 0.6s linear infinite',
          }}
        />
      ) : (
        leftIcon
      )}
      {children}
      {!isLoading && rightIcon}
    </button>
  );
}
