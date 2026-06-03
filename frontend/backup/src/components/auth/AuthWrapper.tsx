import { LoginForm } from '@/components/auth/LoginForm';
import { RegisterForm } from './RegisterForm';

export function AuthWrapper({ mode }: { mode: 'login' | 'register' }) {
  return (
    <>
      {mode === 'login' ? <LoginForm /> : <RegisterForm />}
    </>

  );
}