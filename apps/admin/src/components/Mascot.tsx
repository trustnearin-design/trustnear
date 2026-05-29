import Image from 'next/image';

export type MascotVariant =
  | 'namaste'
  | 'waving'
  | 'hero'
  | 'confident'
  | 'doorstep'
  | 'toolbox'
  | 'verified';

const VARIANT_TO_FILE: Record<MascotVariant, string> = {
  namaste: '/mascot/mascot-namaste.png',
  waving: '/mascot/mascot-waving.png',
  hero: '/mascot/mascot-hero.png',
  confident: '/mascot/mascot-confident.png',
  doorstep: '/mascot/mascot-doorstep.png',
  toolbox: '/mascot/mascot-toolbox.png',
  verified: '/mascot/mascot-verified.png',
};

const VARIANT_TO_ALT: Record<MascotVariant, string> = {
  namaste: 'Sevak greeting with namaste',
  waving: 'Sevak waving hello',
  hero: 'Sevak as the TrustNear hero',
  confident: 'Sevak confident with a thumbs-up',
  doorstep: 'Sevak at your doorstep',
  toolbox: 'Sevak with a toolbox',
  verified: 'Sevak verified badge',
};

/**
 * Sevak — TrustNear's 3D mascot. Same pose set as the mobile apps,
 * served from /public/mascot/. Always renders inside a fixed square
 * box so card layouts stay predictable.
 *
 * Use sparingly (login hero, dashboard greeting, empty/error states).
 * Not every page needs the mascot — admin is a power-user surface.
 */
export function Mascot({
  variant,
  size = 96,
  priority = false,
  className,
}: {
  variant: MascotVariant;
  size?: number;
  priority?: boolean;
  className?: string;
}) {
  return (
    <Image
      src={VARIANT_TO_FILE[variant]}
      alt={VARIANT_TO_ALT[variant]}
      width={size}
      height={size}
      priority={priority}
      className={className}
      style={{ width: size, height: size, objectFit: 'contain' }}
    />
  );
}
