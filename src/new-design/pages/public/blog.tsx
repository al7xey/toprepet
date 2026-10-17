import { Link, useParams } from 'react-router-dom';
import { articles, articlePath, categories, categoryById, categoryPath, formatDate, hasPublished, relatedArticles, type Article, type Category } from '../../../blog/data';
import { PublicLayout } from '../../layout/layouts';
import { Button, PageHeader, Section } from '../../ui';
import { NotFoundBody } from './notfound';

type BlogView = 'home' | 'rubric' | 'article' | 'not-found';

const readTime = (article: Article) => `${Math.max(1, Math.ceil(article.content_html.replace(/<[^>]*>/g, ' ').trim().split(/\s+/).length / 180))} мин чтения`;

function ArticleCard({ article }: { article: Article }) {
  const category = categoryById(article.category_id);
  return (
    <article className="trk-blog-card">
      <Link to={articlePath(article)} className="trk-blog-media" aria-label={`Читать: ${article.title}`} tabIndex={-1}>
        {article.cover_image_url && <img src={article.cover_image_url} alt="" loading="lazy" width="640" height="400" />}
      </Link>
      <div className="trk-blog-body">
        {category && <Link to={categoryPath(category)} className="trk-blog-cat">{category.name}</Link>}
        <h3 className="trk-blog-title"><Link to={articlePath(article)}>{article.title}</Link></h3>
        {article.excerpt && <p className="trk-blog-excerpt">{article.excerpt}</p>}
        <p className="trk-blog-meta"><time dateTime={article.published_at || undefined}>{formatDate(article.published_at)}</time> · {readTime(article)}</p>
      </div>
    </article>
  );
}

function ArticleGrid({ items }: { items: Article[] }) {
  return <div className="trk-blog-grid">{items.map((article) => <ArticleCard key={article.id} article={article} />)}</div>;
}

function Crumbs({ category, title }: { category?: Category; title?: string }) {
  const branch: Category[] = [];
  let current = category;
  while (current && branch.length < 8) { branch.unshift(current); current = categoryById(current.parent_id || ''); }
  return (
    <nav className="trk-blog-crumbs" aria-label="Навигационная цепочка">
      <Link to="/blog/">Блог</Link>
      {branch.map((item) => <span key={item.id}> / <Link to={categoryPath(item)}>{item.name}</Link></span>)}
      {title && <span> / {title}</span>}
    </nav>
  );
}

function Home() {
  const roots = categories.filter((c) => !c.parent_id && hasPublished(c));
  return (
    <>
      <PageHeader title="Блог" lead="Понятные разборы школьных тем и материалы для подготовки к ОГЭ и ЕГЭ." />
      {roots.length > 0 && (
        <nav className="trk-blog-rubrics" aria-label="Направления блога">
          {roots.map((c) => <Link key={c.id} to={categoryPath(c)}>{c.name}</Link>)}
        </nav>
      )}
      <Section title="Свежее">
        {articles.length ? <ArticleGrid items={articles.slice(0, 12)} /> : <p className="muted">Пока нет опубликованных статей. Новые материалы появятся здесь.</p>}
      </Section>
    </>
  );
}

function Rubric() {
  const { '*': slugPath } = useParams();
  const category = categories.find((c) => categoryPath(c) === `/blog/rubrics/${slugPath}/`);
  if (!category || !hasPublished(category)) return <NotFoundBody title="Рубрика не найдена" action={<Button to="/blog/" size="lg">В блог</Button>} />;
  const ids = new Set([category.id]);
  for (let i = 0; i < 8; i++) categories.filter((c) => c.parent_id && ids.has(c.parent_id)).forEach((c) => ids.add(c.id));
  const selected = articles.filter((a) => ids.has(a.category_id));
  const children = categories.filter((c) => c.parent_id === category.id && hasPublished(c));
  return (
    <>
      <Crumbs category={category} />
      <PageHeader title={category.name} lead={category.description || undefined} />
      {children.length > 0 && (
        <nav className="trk-blog-rubrics" aria-label="Разделы рубрики">
          {children.map((c) => <Link key={c.id} to={categoryPath(c)}>{c.name}</Link>)}
        </nav>
      )}
      <Section title="Статьи"><ArticleGrid items={selected} /></Section>
    </>
  );
}

function ArticleMarkup({ article }: { article: Article }) {
  const url = `https://toprepet.ru${articlePath(article)}`;
  const category = categoryById(article.category_id);
  const schema = {
    '@context': 'https://schema.org', '@type': 'BlogPosting', '@id': `${url}#article-content`,
    url, headline: article.title, description: article.excerpt,
    text: article.content_html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim(),
    author: { '@type': 'Person', name: article.author_name },
    publisher: { '@type': 'Organization', name: 'TopRepet', url: 'https://toprepet.ru/' },
    articleSection: category?.name, datePublished: article.published_at || undefined,
    dateModified: article.modified_at || article.updated_at,
    image: article.cover_image_url || undefined, inLanguage: 'ru-RU',
  };
  return <script type="application/ld+json">{JSON.stringify(schema).replace(/</g, '\\u003c')}</script>;
}

function ArticleView() {
  const { slug } = useParams();
  const article = articles.find((a) => a.slug === slug);
  if (!article) return <NotFoundBody title="Статья не найдена" action={<Button to="/blog/" size="lg">В блог</Button>} />;
  const category = categoryById(article.category_id);
  const related = relatedArticles(article);
  return (
    <>
      <Crumbs category={category} title={article.title} />
      <article id="article-content" className="trk-blog-article">
        <ArticleMarkup article={article} />
        <header className="trk-pagehead">
          <h1 className="trh-h1">{article.title}</h1>
          {article.excerpt && <p className="lead">{article.excerpt}</p>}
          <p className="trk-blog-meta">
            <strong>{article.author_name}</strong>
            {article.published_at && <> · <time dateTime={article.published_at}>{formatDate(article.published_at)}</time></>}
            {' · '}{readTime(article)}
          </p>
        </header>
        {article.cover_image_url && <figure className="trk-blog-cover"><img src={article.cover_image_url} alt={article.cover_image_alt || article.title} width="1200" height="675" /></figure>}
        <section aria-label="Текст статьи" className="trk-blog-body-text" dangerouslySetInnerHTML={{ __html: article.content_html }} />
      </article>
      <aside className="trk-blog-cta">
        <h2 className="h3">Нужна помощь с этой темой?</h2>
        <p>Выберите репетитора под свою цель и запишитесь на урок.</p>
        <Button to="/teachers" size="lg">Найти репетитора</Button>
      </aside>
      {related.length > 0 && <Section title="Читайте также"><ArticleGrid items={related} /></Section>}
    </>
  );
}

/** Публичный блог: главная, рубрики, статьи. Данные берутся из snapshot.json (его обновляет sync-blog). */
export default function BlogPage({ page }: { page: BlogView }) {
  return (
    <PublicLayout tight>
      {page === 'home' ? <Home /> : page === 'rubric' ? <Rubric /> : page === 'article' ? <ArticleView /> : <NotFoundBody />}
    </PublicLayout>
  );
}
