import { Suspense } from 'react';
import { LoginForm } from '@/components/auth/LoginForm';

export default function LoginPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background px-6 safe-top safe-bottom">
      <Suspense fallback={null}>
        <LoginForm />
      </Suspense>
    </main>
  );
}
