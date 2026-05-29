import { DashboardClient } from './DashboardClient';
import { BrandHero } from '@/components/BrandHero';

export const dynamic = 'force-dynamic';

const TODAY_LABEL = new Intl.DateTimeFormat('en-IN', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
}).format(new Date());

export default function DashboardPage() {
  return (
    <>
      <BrandHero
        eyebrow={TODAY_LABEL}
        title="Namaste, Admin"
        subtitle="TrustNear par aaj kya ho raha hai — ek nazar mein. Live ops, KYC queue, bookings, payouts."
        mascot="hero"
        mascotSize={104}
      />
      <DashboardClient />
    </>
  );
}
