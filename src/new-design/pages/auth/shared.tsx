import { useState, type ReactNode } from 'react';
import { api } from '../../api';
import { Card, Note } from '../../ui';

/** Рамка форм входа и регистрации: карточка по центру. */
export function AuthCard({ children }: { children: ReactNode }) {
  return <Card className="trk-auth-card" pad="lg">{children}</Card>;
}

export const DEMO_ACCOUNTS = [
  { label: 'Ученик', email: 'olga@mail.ru' },
  { label: 'Репетитор', email: 'anastasia@toprepet.ru' },
  { label: 'Админ', email: 'admin@toprepet.ru' },
];

/** Подсказка с демо-аккаунтами: только пока работает мок, с настоящим бэкендом её нет. */
export function DemoHint({ onPick }: { onPick: (email: string, password: string) => void }) {
  const [open] = useState(api.mode === 'mock');
  if (!open) return null;
  return (
    <Note tone="plain" icon="info">
      <b>Демо-режим.</b> Данные хранятся в вашем браузере. Войти можно любым демо-аккаунтом, пароль <b>demo</b>:
      <span className="trk-demo-list">
        {DEMO_ACCOUNTS.map((a) => <button key={a.email} type="button" className="trk-demo" onClick={() => onPick(a.email, 'demo')}>{a.label}</button>)}
      </span>
    </Note>
  );
}

export const emailValid = (value: string) => /^\S+@\S+\.\S+$/.test(value.trim());
