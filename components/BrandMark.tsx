import { BRAND } from "@/lib/brand";

/**
 * Glifo da marca: a barra que rompe a fileira — a tese do produto
 * como logotipo. Mesma linguagem do hero da landing.
 */
export function BrandGlyph({ size = 16 }: { size?: number }) {
  const bars = [7, 10, 6, 16, 6, 9]; // a 4ª rompe a escala
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
    >
      {bars.map((height, index) => (
        <rect
          key={index}
          x={index * 2.7}
          y={16 - height}
          width={1.9}
          height={height}
          fill={index === 3 ? "#da291c" : "#4b4b4b"}
        />
      ))}
    </svg>
  );
}

/** Lockup horizontal: glifo + wordmark. */
export function BrandMark({
  withDescriptor = false,
}: {
  withDescriptor?: boolean;
}) {
  return (
    <span className="flex items-center gap-xxs">
      <BrandGlyph size={18} />
      <span className="leading-none">
        <span className="block text-title-sm font-bold uppercase tracking-[3px] text-ink">
          {BRAND.name}
        </span>
        {withDescriptor && (
          <span className="mt-[3px] block text-caption text-muted-soft">
            {BRAND.descriptor}
          </span>
        )}
      </span>
    </span>
  );
}
