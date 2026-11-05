import { describe, expect, it } from 'vitest';
import { sanitizeHtml } from './sanitize-html.mjs';
import { renderContent } from './content';

describe('untrusted blog HTML', () => {
  it.each([
    '<script>alert(1)</script>',
    '<svg onload="alert(1)"><a>x</a></svg>',
    '<iframe src="https://example.com"></iframe>',
    '<img src=x onerror="alert(1)">',
    '<a href="javascript:alert(1)" onclick="alert(2)">link</a>',
  ])('removes executable markup: %s', (payload) => {
    const clean = sanitizeHtml(payload);
    expect(clean).not.toMatch(/script|onerror|onload|onclick|iframe|<svg/i);
  });
  it('retains safe headings, links and tables', () => {
    const html = '<h2 id="section">Тема</h2><a href="https://example.com">ссылка</a><table><tr><td>текст</td></tr></table>';
    expect(sanitizeHtml(html)).toContain('<h2 id="section">Тема</h2>');
    expect(sanitizeHtml(html)).toContain('rel="noopener noreferrer"');
    expect(sanitizeHtml(html)).toContain('<td>текст</td>');
  });
  it('escapes text and rejects unsupported editor nodes', () => {
    expect(renderContent({ type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: '<script>' }] }] }).html).toBe('<p>&lt;script&gt;</p>');
    expect(() => renderContent({ type: 'doc', content: [{ type: 'script' }] })).toThrow();
  });
});
