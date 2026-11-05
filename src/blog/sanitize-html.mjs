import { parseFragment, serialize } from 'parse5';
import config from './supabase-config.json' with { type: 'json' };
const isUuid = (value) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)

const safeUrl = (value) => { try { const url = new URL(String(value)); return ['http:', 'https:'].includes(url.protocol) ? url.href : '' } catch { return '' } }
const imageUrl = (value) => { const url = safeUrl(value); const host = config.url; return host && url.startsWith(`${host}/storage/v1/object/public/article-images/`) ? url : '' }
export function sanitizeHtml(html) {
  const root = parseFragment(html)
  const allowedTags = new Set(['p','br','strong','em','s','a','h1','h2','h3','h4','h5','h6','ul','ol','li','blockquote','hr','figure','img','figcaption','div','table','thead','tbody','tr','th','td'])
  const dropWithContent = new Set(['script', 'style', 'iframe', 'object', 'embed', 'svg', 'math', 'template'])
  const allowedAttributes = {
    a: new Set(['href', 'rel']),
    h1: new Set(['id']), h2: new Set(['id']), h3: new Set(['id']), h4: new Set(['id']), h5: new Set(['id']), h6: new Set(['id']),
    figure: new Set(['class']),
    div: new Set(['class']),
    th: new Set(['colspan', 'rowspan', 'scope']),
    td: new Set(['colspan', 'rowspan']),
    img: new Set(['src', 'alt', 'width', 'height', 'loading', 'decoding', 'data-media-id']),
  }

  const clean = (parent) => {
    const children = []
    for (const child of parent.childNodes || []) {
      const tag = child.tagName?.toLowerCase()
      if (!tag) {
        if (child.nodeName === '#text') children.push(child)
        continue
      }
      if (dropWithContent.has(tag)) continue
      clean(child)
      if (!allowedTags.has(tag)) {
        for (const nested of child.childNodes || []) { nested.parentNode = parent; children.push(nested) }
        continue
      }
      const allowed = allowedAttributes[tag] || new Set()
      child.attrs = (child.attrs || []).filter(attribute => allowed.has(attribute.name))
      if (tag === 'a') {
        const href = child.attrs.find(attribute => attribute.name === 'href')
        const safeHref = href ? safeUrl(href.value) : ''
        child.attrs = safeHref ? [{ name: 'href', value: safeHref }, { name: 'rel', value: 'noopener noreferrer' }] : []
      }
      if (/^h[1-6]$/.test(tag)) child.attrs = (child.attrs || []).filter(attribute => attribute.name !== 'id' || /^[a-z0-9-]+$/.test(attribute.value))
      if (tag === 'figure') child.attrs = (child.attrs || []).filter(attribute => attribute.name !== 'class' || /^article-image article-image--(small|medium|large|content|wide) article-image--(left|center|right)$/.test(attribute.value))
      if (tag === 'div') child.attrs = (child.attrs || []).filter(attribute => attribute.name === 'class' && attribute.value === 'article-table-scroll')
      if (tag === 'th' || tag === 'td') {
        child.attrs = (child.attrs || []).filter(attribute => {
          if (attribute.name === 'scope') return tag === 'th' && ['col', 'row'].includes(attribute.value)
          const value = Number(attribute.value)
          return ['colspan', 'rowspan'].includes(attribute.name) && Number.isInteger(value) && value >= 1 && value <= (attribute.name === 'colspan' ? 20 : 100)
        })
      }
      if (tag === 'img') {
        const attributes = Object.fromEntries((child.attrs || []).map(attribute => [attribute.name, attribute.value]))
        const src = imageUrl(attributes.src)
        const width = Number(attributes.width)
        const height = Number(attributes.height)
        const mediaId = String(attributes['data-media-id'] || '')
        if (!src || !attributes.alt?.trim() || !Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1 || width > 1600 || height > 1600 || !isUuid(mediaId)) continue
        child.attrs = [
          { name: 'src', value: src },
          { name: 'alt', value: attributes.alt.trim() },
          { name: 'width', value: String(width) },
          { name: 'height', value: String(height) },
          { name: 'loading', value: 'lazy' },
          { name: 'decoding', value: 'async' },
          { name: 'data-media-id', value: mediaId },
        ]
      }
      child.parentNode = parent
      children.push(child)
    }
    parent.childNodes = children
  }

  clean(root)
  return serialize(root)
}
