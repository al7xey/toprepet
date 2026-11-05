import { parseFragment } from 'parse5'
import { sanitizeHtml } from './sanitize-html.mjs'
export { sanitizeHtml } from './sanitize-html.mjs'
import { transliterate } from 'transliteration'
type HeadingData = { id: string; level: 2 | 3; text: string }
import config from './supabase-config.json'

type Node = { type?: string; text?: string; attrs?: Record<string, unknown>; marks?: { type: string; attrs?: Record<string, unknown> }[]; content?: Node[] }
type HtmlNode = { nodeName: string; tagName?: string; value?: string; attrs?: { name: string; value: string }[]; childNodes?: HtmlNode[]; parentNode?: HtmlNode }
export type Heading = HeadingData
const isUuid = (value: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)

const textAttr = (value: unknown) => typeof value === 'string' ? value : ''
const escape = (text: string) => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;')
const safeUrl = (value: unknown) => { try { const url = new URL(String(value)); return ['http:', 'https:'].includes(url.protocol) ? url.href : '' } catch { return '' } }
const imageUrl = (value: unknown) => { const url = safeUrl(value); const host = config.url; return host && url.startsWith(`${host}/storage/v1/object/public/article-images/`) ? url : '' }
const slug = (text: string) => transliterate(text).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'section'
const textOf = (node: Node): string => node.text || (node.content || []).map(textOf).join('')

export function articlePlainText(value: unknown): string {
  const visit = (node: Node): string => {
    if (node.type === 'text') return node.text || ''
    if (node.type === 'hardBreak') return ' '
    const separator = ['doc', 'bulletList', 'orderedList', 'listItem', 'blockquote'].includes(node.type || '') ? ' ' : ''
    return (node.content || []).map(visit).join(separator)
  }
  if (!value || typeof value !== 'object') return ''
  return visit(value as Node).replace(/\s+/g, ' ').trim()
}

export function suggestedExcerpt(value: unknown, maxLength = 180): string {
  const text = articlePlainText(value)
  if (text.length <= maxLength) return text
  const sample = text.slice(0, maxLength + 1)
  const lastSpace = sample.lastIndexOf(' ')
  return `${sample.slice(0, lastSpace > maxLength / 2 ? lastSpace : maxLength).trimEnd()}…`
}

export function renderContent(value: unknown): { html: string; headings: Heading[] } {
  const root = value as Node
  if (!root || root.type !== 'doc' || !Array.isArray(root.content)) throw new Error('Некорректная структура статьи')
  const headings: Heading[] = []
  const used = new Map<string, number>()
  let nodes = 0
  const render = (node: Node, depth = 0): string => {
    if (++nodes > 10000 || depth > 32) throw new Error('Статья слишком большая')
    const inner = () => (node.content || []).map(child => render(child, depth + 1)).join('')
    switch (node.type) {
      case 'doc': return inner()
      case 'text': {
        let html = escape(node.text || '')
        for (const mark of node.marks || []) {
          if (mark.type === 'bold') html = `<strong>${html}</strong>`
          if (mark.type === 'italic') html = `<em>${html}</em>`
          if (mark.type === 'strike') html = `<s>${html}</s>`
          if (mark.type === 'link') { const href = safeUrl(mark.attrs?.href); if (href) html = `<a href="${escape(href)}" rel="noopener noreferrer">${html}</a>` }
          if (!['bold', 'italic', 'strike', 'link'].includes(mark.type)) throw new Error(`Unsupported mark: ${mark.type}`)
        }
        return html
      }
      case 'paragraph': return `<p>${inner() || '<br>'}</p>`
      case 'heading': {
        const level = Number(node.attrs?.level)
        if (![1, 2, 3, 4, 5, 6].includes(level)) return `<p>${inner()}</p>`
        const title = textOf(node)
        const base = slug(title)
        const count = used.get(base) || 0
        used.set(base, count + 1)
        const id = count ? `${base}-${count + 1}` : base
        if (level === 2 || level === 3) headings.push({ id, level, text: title })
        return `<h${level} id="${escape(id)}">${inner()}</h${level}>`
      }
      case 'bulletList': return `<ul>${inner()}</ul>`
      case 'orderedList': return `<ol>${inner()}</ol>`
      case 'listItem': return `<li>${inner()}</li>`
      case 'blockquote': return `<blockquote>${inner()}</blockquote>`
      case 'horizontalRule': return '<hr>'
      case 'hardBreak': return '<br>'
      case 'table': {
        const rows = node.content || []
        const headerRows = rows.length && (rows[0].content || []).every(cell => cell.type === 'tableHeader') ? rows.slice(0, 1) : []
        const bodyRows = headerRows.length ? rows.slice(1) : rows
        const renderRows = (items: Node[]) => items.map(row => render(row, depth + 1)).join('')
        return `<div class="article-table-scroll"><table>${headerRows.length ? `<thead>${renderRows(headerRows)}</thead>` : ''}<tbody>${renderRows(bodyRows)}</tbody></table></div>`
      }
      case 'tableRow': return `<tr>${inner()}</tr>`
      case 'tableHeader':
      case 'tableCell': {
        const tag = node.type === 'tableHeader' ? 'th' : 'td'
        const colspan = Math.max(1, Math.min(20, Number(node.attrs?.colspan) || 1))
        const rowspan = Math.max(1, Math.min(100, Number(node.attrs?.rowspan) || 1))
        return `<${tag}${colspan > 1 ? ` colspan="${colspan}"` : ''}${rowspan > 1 ? ` rowspan="${rowspan}"` : ''}${tag === 'th' ? ' scope="col"' : ''}>${inner()}</${tag}>`
      }
      case 'image': {
        const src = imageUrl(node.attrs?.src)
        const alt = textAttr(node.attrs?.alt).trim()
        const mediaId = textAttr(node.attrs?.mediaId)
        const width = Number(node.attrs?.width)
        const height = Number(node.attrs?.height)
        const displaySize = ['small', 'medium', 'large', 'content', 'wide'].includes(String(node.attrs?.displaySize)) ? String(node.attrs?.displaySize) : 'content'
        const alignment = ['left', 'center', 'right'].includes(String(node.attrs?.alignment)) ? String(node.attrs?.alignment) : 'center'
        if (!src || !alt || !isUuid(mediaId) || !Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1 || width > 1600 || height > 1600) throw new Error('У изображения должны быть адрес, alt, mediaId и размеры')
        const caption = textAttr(node.attrs?.caption).trim()
        return `<figure class="article-image article-image--${displaySize} article-image--${alignment}"><img src="${escape(src)}" alt="${escape(alt)}" width="${width}" height="${height}" loading="lazy" decoding="async" data-media-id="${escape(mediaId)}">${caption ? `<figcaption>${escape(caption)}</figcaption>` : ''}</figure>`
      }
      default: throw new Error(`Unsupported node: ${node.type || 'unknown'}`)
    }
  }
  const html = render(root)
  return { html: sanitizeHtml(html), headings }
}


export function headingsFromHtml(html: string): Heading[] {
  const root = parseFragment(html) as unknown as HtmlNode
  const headings: Heading[] = []
  const nodeText = (node: HtmlNode): string => node.nodeName === '#text' ? node.value || '' : (node.childNodes || []).map(nodeText).join('')
  const visit = (node: HtmlNode) => {
    if (node.tagName === 'h2' || node.tagName === 'h3') {
      const id = node.attrs?.find(attribute => attribute.name === 'id')?.value
      if (id) headings.push({ id, level: node.tagName === 'h2' ? 2 : 3, text: nodeText(node) })
    }
    for (const child of node.childNodes || []) visit(child)
  }
  visit(root)
  return headings
}

export function imageMetadata(value: unknown) {
  const images: { id: string; alt: string; caption: string | null; width: number; height: number }[] = []
  const visit = (node: Node) => {
    const mediaId = textAttr(node.attrs?.mediaId)
    if (node.type === 'image' && isUuid(mediaId)) images.push({ id: mediaId, alt: textAttr(node.attrs?.alt).trim(), caption: textAttr(node.attrs?.caption).trim() || null, width: Number(node.attrs?.width), height: Number(node.attrs?.height) })
    for (const child of node.content || []) visit(child)
  }
  visit(value as Node)
  return images
}

