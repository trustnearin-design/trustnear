import { LoginForm } from './LoginForm';

export default function LoginPage() {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-brand px-4 py-12">
      <div className="absolute -right-32 -top-32 h-96 w-96 rounded-full bg-accent/20 blur-3xl" />
      <div className="absolute -bottom-32 -left-32 h-96 w-96 rounded-full bg-accent/10 blur-3xl" />

      <div className="relative z-10 w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mb-3 inline-flex items-center gap-2 rounded-pill bg-accent/15 px-3 py-1 text-caption font-semibold text-accent">
            <span className="h-1.5 w-1.5 rounded-full bg-accent" /> ADMIN CONSOLE
          </div>
          <h1 className="text-display font-bold text-ink-inverse">TrustNear</h1>
          <p className="mt-2 text-body text-brand-100">
            Operations dashboard · KYC review · Live monitoring
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
