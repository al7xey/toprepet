import { useState, type SyntheticEvent } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../../api';
import { trackGoal } from '../../../shared/lib/analytics';
import { useMutation } from '../../api/hooks';
import type { Role } from '../../api/types';
import { homeFor, useSession } from '../../api/session';
import { AuthLayout } from '../../layout/layouts';
import { Button, ChoiceCards, Checkbox, FormError, PageHeader, PasswordField, TextField } from '../../ui';
import { AuthCard, emailValid } from './shared';

type SignupRole = Exclude<Role, 'admin'>;

/** Регистрация ученика или репетитора. Роль можно передать ссылкой: /signup?role=tutor. */
export default function SignupPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { user, setUser } = useSession();
  const [role, setRole] = useState<SignupRole>(params.get('role') === 'tutor' ? 'tutor' : 'student');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [agree, setAgree] = useState(false);
  const [errors, setErrors] = useState<{ name?: string; email?: string; password?: string; agree?: string }>({});
  const signup = useMutation((input: Parameters<typeof api.signup>[0]) => api.signup(input));

  if (user && user.emailVerified) return <Navigate to={homeFor(user.role)} replace />;
  if (user) return <Navigate to="/verify-email" replace />;

  const submit = async (e: SyntheticEvent) => {
    e.preventDefault();
    const found = {
      name: name.trim().length >= 2 ? undefined : 'Введите имя',
      email: emailValid(email) ? undefined : 'Введите почту, например name@mail.ru',
      password: password.length >= 8 ? undefined : 'Не короче 8 символов',
      agree: agree ? undefined : 'Нужно согласие, чтобы создать аккаунт',
    };
    setErrors(found);
    if (Object.values(found).some(Boolean)) return;
    const created = await signup.run({ role, name: name.trim(), email: email.trim(), password });
    if (created) { trackGoal('signup_submit', { role }); setUser(created); void navigate('/verify-email', { replace: true }); }
  };

  return (
    <AuthLayout>
      <PageHeader title="Регистрация" center />
      <AuthCard>
        <form className="trk-form" onSubmit={submit} noValidate>
          <ChoiceCards<SignupRole> label="Кто вы" value={role} onChange={setRole} options={[
            { value: 'student', title: 'Хочу учиться', text: 'Для себя или для ребёнка', icon: 'book' },
            { value: 'tutor', title: 'Хочу преподавать', text: 'Для работы со своими учениками', icon: 'school' },
          ]} />
          <TextField label="Имя" name="name" autoComplete="given-name" value={name} onChange={(e) => setName(e.target.value)} error={errors.name} />
          <TextField label="Почта" type="email" name="email" autoComplete="email" inputMode="email" placeholder="name@mail.ru" value={email} onChange={(e) => setEmail(e.target.value)} error={errors.email} />
          <PasswordField label="Пароль" name="password" autoComplete="new-password" hint="Не короче 8 символов" value={password} onChange={(e) => setPassword(e.target.value)} error={errors.password} />
          <div>
            <Checkbox checked={agree} onChange={setAgree}>
              Принимаю <Link className="acc" to="/legal/" target="_blank">условия использования</Link> и согласен(на) на обработку персональных данных
            </Checkbox>
            {errors.agree && <span className="trk-error">{errors.agree}</span>}
          </div>
          <FormError error={signup.error} />
          <Button type="submit" size="lg" block loading={signup.pending}>Создать аккаунт</Button>
        </form>
        <p className="muted trk-auth-foot">Уже есть аккаунт? <Link className="acc" to="/login">Войти</Link></p>
      </AuthCard>
    </AuthLayout>
  );
}
