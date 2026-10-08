import type { ReactNode } from 'react';
import { Page } from '../../ui/layout';
import { Ava } from '../../ui/kit';
import type { Tone } from '../../api/types';

/* the team's workplace: desktop first, the same header capsule and side menu */
export function AdminPage({ title, side, children, back }: { title: string; side: string; children: ReactNode; back?: string }) {
  return <Page title={title} kind="cabinet" side={side} back={back} className="adm">{children}</Page>;
}

export function Who({ tone, src, name, sub, right }: { tone: Tone; src?: string; name: ReactNode; sub?: ReactNode; right?: ReactNode }) {
  return <div className="r9-who"><Ava tone={tone} src={src} /><div><b>{name}</b>{sub && <span>{sub}</span>}</div>{right}</div>;
}
