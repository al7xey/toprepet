import snapshot from './snapshot.json'

export type Category = { id: string; name: string; slug: string; parent_id: string | null; description: string | null; sort_order: number }
export type Article = { id: string; title: string; slug: string; excerpt: string; content_html: string; cover_image_url: string | null; cover_image_alt: string | null; status: 'draft' | 'published'; category_id: string; author_name: string; seo_title: string | null; seo_description: string | null; published_at: string | null; modified_at: string | null; updated_at: string; view_count: number }
export type Recommendation = { article_id: string; recommended_article_id: string; sort_order: number }
export const categories = snapshot.categories as Category[]
export const articles = snapshot.articles as Article[]
export const recommendations = snapshot.recommendations as Recommendation[]
export const categoryById = (id: string) => categories.find(category => category.id === id)
export const categoryPath = (category: Category) => {
  const parts = [category.slug]
  let parent = categoryById(category.parent_id || '')
  while (parent && parts.length < 8) { parts.unshift(parent.slug); parent = categoryById(parent.parent_id || '') }
  return `/blog/rubrics/${parts.join('/')}/`
}
export const articlePath = (article: Pick<Article, 'slug'>) => `/blog/articles/${article.slug}/`
export const formatDate = (value: string | null) => value ? new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Moscow' }).format(new Date(value)) : ''
export function relatedArticles(article: Article) {
  const result: Article[] = []
  const add = (candidate?: Article) => { if (candidate && candidate.id !== article.id && !result.some(item => item.id === candidate.id)) result.push(candidate) }
  recommendations.filter(item => item.article_id === article.id).sort((a,b) => a.sort_order - b.sort_order).forEach(item => add(articles.find(candidate => candidate.id === item.recommended_article_id)))
  articles.filter(candidate => candidate.category_id === article.category_id).forEach(add)
  articles.forEach(add)
  return result.slice(0, 3)
}
