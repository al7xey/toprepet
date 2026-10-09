import { useState, type SyntheticEvent } from 'react';
import { useNavigate } from 'react-router-dom';

import { Icon } from './icon';
import { buttonClass } from './button';
import { routes } from './routes';

export function SearchBar({ placeholder = 'Предмет, тема или репет', button = 'tinted' }: { placeholder?: string; button?: 'tinted' | 'primary' }) {
  const [query, setQuery] = useState('');
  const navigate = useNavigate();

  const submit = (event: SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault();
    const q = query.trim();
    void navigate(q ? `${routes.teachers}?q=${encodeURIComponent(q)}` : routes.teachers);
  };

  return (
    <search>
    <form className="tr-search tr-surface" onSubmit={submit}>
      <Icon name="search" />
      <input
        aria-label="Поиск"
        placeholder={placeholder}
        value={query}
        onChange={(event) => setQuery(event.target.value)}
      />
      <button className={buttonClass({ variant: button, size: 's' })} type="submit">Найти</button>
    </form>
    </search>
  );
}
