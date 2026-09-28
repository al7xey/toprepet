import { readFile, writeFile } from 'node:fs/promises'

const config = JSON.parse(await readFile('src/blog/supabase-config.json', 'utf8'))
const headers = { apikey: config.publishableKey, Authorization: `Bearer ${config.publishableKey}` }
async function table(path) {
  const response = await fetch(`${config.url}/rest/v1/${path}`, { headers })
  if (!response.ok) throw new Error(`Blog sync failed (${response.status}): ${path.split('?')[0]}`)
  return response.json()
}

const [categories, articles, recommendations] = await Promise.all([
  table('categories?select=id,name,slug,parent_id,description,sort_order&order=sort_order.asc'),
  table('articles?select=id,title,slug,excerpt,content_html,cover_image_url,cover_image_alt,status,category_id,author_name,seo_title,seo_description,published_at,modified_at,updated_at,view_count&status=eq.published&order=published_at.desc'),
  table('article_recommendations?select=article_id,recommended_article_id,sort_order&order=sort_order.asc'),
])
await writeFile('src/blog/snapshot.json', JSON.stringify({ categories, articles, recommendations }), 'utf8')
console.log(`Blog snapshot: ${categories.length} categories, ${articles.length} published articles`)
