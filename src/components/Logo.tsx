interface LogoProps {
  /** Qual arquivo-fonte usar: "logo" (quadrado colorido) ou "favicon" (ícone). */
  variant?: "logo" | "favicon";
  /** Tamanho de exibição em px (largura = altura, ambos quadrados). */
  size: number;
  alt: string;
  className?: string;
  /** Marca a imagem como crítica para o LCP (acima da dobra). */
  priority?: boolean;
}

const WIDTHS: Record<"logo" | "favicon", number[]> = {
  logo: [40, 80, 128, 160],
  favicon: [80, 128, 256],
};

const FALLBACK: Record<"logo" | "favicon", string> = {
  logo: "/logo.png",
  favicon: "/favicon.png",
};

/**
 * Logo responsivo servido em WebP compactado (gerado a partir do PNG original),
 * com srcset por tamanho real de exibição e fallback PNG para navegadores sem suporte.
 */
const Logo = ({ variant = "logo", size, alt, className, priority = false }: LogoProps) => {
  const widths = WIDTHS[variant];
  const srcSet = widths.map((w) => `/${variant}-${w}.webp ${w}w`).join(", ");

  return (
    <picture>
      <source type="image/webp" srcSet={srcSet} sizes={`${size}px`} />
      <img
        src={FALLBACK[variant]}
        width={size}
        height={size}
        alt={alt}
        className={className}
        loading={priority ? "eager" : "lazy"}
        fetchPriority={priority ? "high" : undefined}
        decoding={priority ? "sync" : "async"}
      />
    </picture>
  );
};

export default Logo;
