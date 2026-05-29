import { Mascot } from '@/components/Mascot';
import { LoginForm } from './LoginForm';

export default function LoginPage() {
  return (
    <div
      className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-12"
      style={{
        backgroundImage: 'linear-gradient(135deg, #4F2A66 0%, #3D1F4E 55%, #22102F 100%)',
      }}
    >
      {/* Soft brand circles for depth — same as the mobile auth hero */}
      <div
        aria-hidden
        className="pointer-events-none absolute -right-32 -top-32 h-96 w-96 rounded-full bg-brand-600/30 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-32 -left-32 h-96 w-96 rounded-full bg-accent/15 blur-3xl"
      />

      <div className="relative z-10 w-full max-w-md">
        {/* Lockup with Sevak namaste */}
        <div className="mb-8 flex flex-col items-center text-center">
          <Mascot variant="namaste" size={120} priority />
          <div className="mt-3 inline-flex items-center gap-2 rounded-pill bg-support/15 px-3 py-1 text-caption font-semibold text-support-300">
            <span className="h-1.5 w-1.5 rounded-full bg-support" /> ADMIN CONSOLE
          </div>
          <h1 className="mt-3 font-display text-display font-bold text-ink-inverse">
            Welcome back
          </h1>
          <p className="mt-2 text-body text-brand-200">
            Aapke TrustNear admin tools. Pehle login karein.
          </p>
        </div>

        <div className="card p-8">
          <LoginForm />
        </div>

        <p className="mt-6 text-center text-caption text-brand-200">
          Only authorised admin accounts can sign in here.
        </p>
      </div>
    </div>
  );
}
