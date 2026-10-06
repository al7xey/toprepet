import { Link, useParams } from 'react-router-dom';
import DirectionPage from '../direction/direction-page';
import { informationDocuments } from './information-documents';

export default function LegalPage() {
  const { document: slug } = useParams();
  const document = informationDocuments.find(item => item.slug === slug);
  if (slug && !document) return <DirectionPage />;

  return (
    <article className="payment-info-page container">
      <div className="payment-info-reading">
        {document && <Link className="payment-info-back" to="/legal/">← Все документы</Link>}
        <h1>{document?.title ?? 'Документы TopRepet'}</h1>
        <p className="payment-info-lead">{document?.description ?? 'Правила работы сервиса, сотрудничество с преподавателями и информация об оплате.'}</p>
        {document ? <>
          <nav className="information-toc" aria-label="Содержание документа">
            <ol>{document.sections.map(section => <li key={section.id}><a href={`#${section.id}`}>{section.title}</a></li>)}</ol>
          </nav>
          {document.sections.map(section => <section className="information-section" id={section.id} key={section.id}><h2>{section.title}</h2>{section.content}</section>)}
        </> : <nav className="information-document-list" aria-label="Документы">
          <Link to="/legal/payment-refund/"><strong>Оплата, переносы и возвраты</strong><span>Стоимость занятий, возврат за непроведённое занятие и помощь поддержки.</span></Link>
          {informationDocuments.map(item => <Link key={item.slug} to={`/legal/${item.slug}/`}><strong>{item.title}</strong><span>{item.description}</span></Link>)}
        </nav>}
      </div>
    </article>
  );
}
