import { Link, useParams } from 'react-router-dom';
import { PublicLayout } from '../../layout/layouts';
import { Icon, PageHeader } from '../../ui';
import { LEGAL_DOCUMENTS } from './legal-docs';
import { NotFoundBody } from './notfound';

/** Документы: список и страница документа с оглавлением. Адреса прежние: /legal/ и /legal/:document/. */
export default function LegalPage() {
  const { document: slug } = useParams();
  const doc = slug ? LEGAL_DOCUMENTS.find((d) => d.slug === slug) : undefined;
  if (slug && !doc) return <PublicLayout tight><NotFoundBody /></PublicLayout>;
  if (!doc) {
    return (
      <PublicLayout tight>
        <PageHeader title="Документы" lead="Правила работы сервиса, условия для репетиторов и информация об оплате." />
        <nav className="trk-legal-list" aria-label="Документы">
          {LEGAL_DOCUMENTS.map((d) => (
            <Link key={d.slug} to={`/legal/${d.slug}/`}><strong>{d.title}</strong><span>{d.description}</span><Icon name="right" /></Link>
          ))}
        </nav>
      </PublicLayout>
    );
  }
  return (
    <PublicLayout tight>
      <PageHeader title={doc.title} lead={doc.description} back={{ to: '/legal/', label: 'Все документы' }} />
      <div className="trk-legal">
        <nav className="trk-legal-toc" aria-label="Содержание документа">
          <ol>{doc.sections.map((s) => <li key={s.id}><a href={`#${s.id}`}>{s.title}</a></li>)}</ol>
        </nav>
        {doc.sections.map((s) => <section key={s.id} id={s.id}><h2 className="h3">{s.title}</h2>{s.content}</section>)}
      </div>
    </PublicLayout>
  );
}
