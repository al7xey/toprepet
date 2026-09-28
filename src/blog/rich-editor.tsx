'use client'

import { EditorContent, useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import TiptapImage from '@tiptap/extension-image'
import { TableKit } from '@tiptap/extension-table'
import {
  Bold,
  ImagePlus,
  Italic,
  Link2,
  List,
  ListOrdered,
  Minus,
  Quote,
  Strikethrough,
  Table2,
  Trash2,
} from 'lucide-react'
import { useCallback, useRef, useState, type SyntheticEvent, type ReactNode } from 'react'

const ArticleImage = TiptapImage.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      caption: { default: null },
      mediaId: { default: null },
      width: { default: null },
      height: { default: null },
      displaySize: { default: 'content' },
      alignment: { default: 'center' },
    }
  },
})

type Uploaded = { id: string; url: string; width: number; height: number }
type Props = {
  initial: Record<string, unknown>
  articleId?: string
  onChange: (json: Record<string, unknown>) => void
  onUpload: (file: File, alt: string, caption: string) => Promise<Uploaded>
  onDeleteImage: (id: string) => Promise<void>
}

export function RichEditor({ initial, onChange, onUpload, onDeleteImage }: Props) {
  const [panel, setPanel] = useState<'image' | 'link' | 'table' | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [alt, setAlt] = useState('')
  const [caption, setCaption] = useState('')
  const [link, setLink] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const linkRange = useRef<{ from: number; to: number } | null>(null)

  const chooseImage = useCallback((image: File) => {
    setFile(image)
    setPanel('image')
    setError('')
  }, [])

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3, 4, 5, 6] }, code: false, codeBlock: false }),
      ArticleImage.configure({ inline: false, allowBase64: false }),
      TableKit.configure({ table: { resizable: false } }),
    ],
    content: initial,
    immediatelyRender: true,
    autofocus: false,
    editorProps: {
      attributes: {
        class: 'article-body simple-editor-content',
        role: 'textbox',
        'aria-label': 'Текст статьи',
        'aria-multiline': 'true',
      },
      handleDrop: (_view, event) => {
        const image = [...(event.dataTransfer?.files || [])].find((item) => item.type.startsWith('image/'))
        if (!image) return false
        event.preventDefault()
        chooseImage(image)
        return true
      },
      handlePaste: (_view, event) => {
        const image = [...(event.clipboardData?.files || [])].find((item) => item.type.startsWith('image/'))
        if (!image) return false
        event.preventDefault()
        chooseImage(image)
        return true
      },
    },
    onUpdate: ({ editor: current }) => onChange(current.getJSON() as Record<string, unknown>),
  })

  if (!editor) return <div className="paper simple-editor-loading">Подготавливаем редактор…</div>

  const selectedImage = editor.isActive('image') ? editor.getAttributes('image') : null
  const activeHeading = [1, 2, 3, 4, 5, 6].find(level => editor.isActive('heading', { level }))
  const block = activeHeading ? `h${activeHeading}` : 'p'
  const text = editor.getText({ blockSeparator: ' ' }).trim()
  const words = text ? text.split(/\s+/).length : 0

  const command = (
    label: string,
    run: () => void,
    active = false,
    disabled = false,
    icon?: ReactNode,
  ) => (
    <button
      type="button"
      aria-label={label}
      aria-pressed={active}
      title={label}
      data-active={active}
      disabled={disabled || busy}
      onClick={run}
    >
      {icon || label}
    </button>
  )

  function openLinkPanel() {
    const current = String(editor.getAttributes('link').href || '')
    if (current && editor.state.selection.empty) editor.chain().focus().extendMarkRange('link').run()
    if (!current && editor.state.selection.empty) {
      setError('Сначала выделите текст, который нужно сделать ссылкой.')
      return
    }
    linkRange.current = { from: editor.state.selection.from, to: editor.state.selection.to }
    setLink(current)
    setError('')
    setPanel('link')
  }

  function applyLink(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault()
    let href = link.trim()
    if (!href) {
      const range = linkRange.current
      const chain = editor.chain().focus()
      if (range) chain.setTextSelection(range)
      chain.unsetLink().run()
      setPanel(null)
      return
    }
    if (!/^https?:\/\//i.test(href)) href = `https://${href}`
    try {
      const url = new URL(href)
      if (!['http:', 'https:'].includes(url.protocol)) throw new Error()
    } catch {
      setError('Введите корректный адрес сайта.')
      return
    }
    const range = linkRange.current
    const chain = editor.chain().focus()
    if (range) chain.setTextSelection(range)
    chain.setLink({ href }).run()
    linkRange.current = null
    setPanel(null)
    setError('')
  }

  async function uploadImage(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!file) {
      setError('Выберите изображение.')
      return
    }
    if (!alt.trim()) {
      setError('Коротко опишите, что изображено.')
      return
    }
    setBusy(true)
    setError('')
    try {
      const image = await onUpload(file, alt.trim(), caption.trim())
      editor
        .chain()
        .focus()
        .setImage({ src: image.url, alt: alt.trim(), title: caption.trim() || undefined })
        .updateAttributes('image', {
          mediaId: image.id,
          caption: caption.trim() || null,
          width: image.width,
          height: image.height,
          displaySize: 'content',
          alignment: 'center',
        })
        .run()
      setFile(null)
      setAlt('')
      setCaption('')
      setPanel(null)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Не удалось загрузить изображение')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="paper simple-editor">
      <div className="simple-editor-toolbar" role="toolbar" aria-label="Форматирование статьи">
        <select
          aria-label="Стиль текста"
          value={block}
          disabled={busy}
          onChange={(event) => {
            const level = Number(event.target.value.slice(1))
            if (level >= 1 && level <= 6) editor.chain().focus().setHeading({ level: level as 1 | 2 | 3 | 4 | 5 | 6 }).run()
            else editor.chain().focus().setParagraph().run()
          }}
        >
          <option value="p">Обычный текст</option>
          <option value="h1">Заголовок H1</option>
          <option value="h2">Заголовок H2</option>
          <option value="h3">Заголовок H3</option>
          <option value="h4">Заголовок H4</option>
          <option value="h5">Заголовок H5</option>
          <option value="h6">Заголовок H6</option>
        </select>
        <div className="simple-editor-toolbar-group">
          {command('Жирный', () => editor.chain().focus().toggleBold().run(), editor.isActive('bold'), false, <Bold size={18} />)}
          {command('Курсив', () => editor.chain().focus().toggleItalic().run(), editor.isActive('italic'), false, <Italic size={18} />)}
          {command('Зачёркнутый', () => editor.chain().focus().toggleStrike().run(), editor.isActive('strike'), false, <Strikethrough size={18} />)}
          <button
            type="button"
            aria-label="Ссылка"
            aria-pressed={editor.isActive('link') || panel === 'link'}
            title="Ссылка"
            data-active={editor.isActive('link') || panel === 'link'}
            disabled={busy}
            onClick={openLinkPanel}
          >
            <Link2 size={18} />
          </button>
        </div>
        <div className="simple-editor-toolbar-group">
          {command('Маркированный список', () => editor.chain().focus().toggleBulletList().run(), editor.isActive('bulletList'), false, <List size={18} />)}
          {command('Нумерованный список', () => editor.chain().focus().toggleOrderedList().run(), editor.isActive('orderedList'), false, <ListOrdered size={18} />)}
          {command('Цитата', () => editor.chain().focus().toggleBlockquote().run(), editor.isActive('blockquote'), false, <Quote size={18} />)}
          {command('Разделитель', () => editor.chain().focus().setHorizontalRule().run(), false, false, <Minus size={18} />)}
          {command('Добавить изображение', () => { setPanel(panel === 'image' ? null : 'image'); setError('') }, panel === 'image', false, <ImagePlus size={18} />)}
          {command('Таблица', () => { setPanel(panel === 'table' ? null : 'table'); setError('') }, editor.isActive('table') || panel === 'table', false, <Table2 size={18} />)}
        </div>
        <div className="simple-editor-history">
          {command('Отменить', () => editor.chain().focus().undo().run(), false, !editor.can().undo())}
          {command('Повторить', () => editor.chain().focus().redo().run(), false, !editor.can().redo())}
        </div>
      </div>

      {panel === 'link' && (
        <form className="simple-editor-inline-panel" onSubmit={applyLink}>
          <label className="label" htmlFor="editor-link">Адрес ссылки</label>
          <div className="simple-editor-inline-row">
            <input
              id="editor-link"
              className="field"
              type="url"
              inputMode="url"
              
              value={link}
              placeholder="https://example.ru"
              onChange={(event) => setLink(event.target.value)}
            />
            <button type="submit" className="button-primary">Применить</button>
            {editor.isActive('link') && <button type="button" className="button-outline" onClick={() => { const range = linkRange.current; const chain = editor.chain().focus(); if (range) chain.setTextSelection(range); chain.unsetLink().run(); linkRange.current = null; setPanel(null) }}>Убрать ссылку</button>}
            <button type="button" className="button-outline" onClick={() => setPanel(null)}>Отмена</button>
          </div>
        </form>
      )}

      {panel === 'image' && (
        <form className="simple-editor-image-form" onSubmit={uploadImage}>
          <div>
            <label className="label" htmlFor="editor-image-file">Изображение</label>
            <input
              id="editor-image-file"
              type="file"
              accept="image/*"
              onChange={(event) => setFile(event.target.files?.[0] || null)}
            />
            {file && <p className="simple-editor-file-name">Выбрано: {file.name}</p>}
          </div>
          <div>
            <label className="label" htmlFor="editor-image-alt">Что изображено</label>
            <input id="editor-image-alt" className="field" value={alt} maxLength={300} onChange={(event) => setAlt(event.target.value)} />
          </div>
          <div>
            <label className="label" htmlFor="editor-image-caption">Подпись</label>
            <input id="editor-image-caption" className="field" value={caption} maxLength={400} onChange={(event) => setCaption(event.target.value)} />
          </div>
          <div className="simple-editor-image-actions">
            <button type="submit" className="button-primary" disabled={busy}>{busy ? 'Подготавливаем и сжимаем…' : 'Добавить'}</button>
            <button type="button" className="button-outline" disabled={busy} onClick={() => setPanel(null)}>Отмена</button>
          </div>
        </form>
      )}

      {panel === 'table' && (
        <div className="simple-editor-inline-panel" aria-label="Настройки таблицы">
          {!editor.isActive('table') ? (
            <div className="simple-editor-inline-row">
              <span className="label">Вставить таблицу</span>
              {[2, 3, 4].map(size => <button key={size} type="button" className="button-outline" onClick={() => { editor.chain().focus().insertTable({ rows: size, cols: size, withHeaderRow: true }).run(); setPanel(null) }}>{size}×{size}</button>)}
            </div>
          ) : (
            <div className="simple-editor-inline-row">
              <button type="button" className="button-outline" onClick={() => editor.chain().focus().addRowAfter().run()}>Добавить строку</button>
              <button type="button" className="button-outline" onClick={() => editor.chain().focus().deleteRow().run()}>Удалить строку</button>
              <button type="button" className="button-outline" onClick={() => editor.chain().focus().addColumnAfter().run()}>Добавить столбец</button>
              <button type="button" className="button-outline" onClick={() => editor.chain().focus().deleteColumn().run()}>Удалить столбец</button>
              <button type="button" className="button-outline" onClick={() => editor.chain().focus().toggleHeaderRow().run()}>Строка заголовков</button>
              <button type="button" className="button-outline" onClick={() => { editor.chain().focus().deleteTable().run(); setPanel(null) }}>Удалить таблицу</button>
            </div>
          )}
        </div>
      )}

      {error && <p role="alert" className="simple-editor-error">{error}</p>}
      {block === 'h1' && <p className="editor-hint">H1 обычно используется для названия статьи. Для разделов лучше использовать H2–H6.</p>}

      <div className="simple-editor-area">
        {editor.isEmpty && <span className="simple-editor-placeholder">Начните писать статью…</span>}
        <EditorContent editor={editor} />
      </div>

      <div className="simple-editor-status" aria-live="polite">
        <span>{words ? `${words} ${words % 10 === 1 && words % 100 !== 11 ? 'слово' : words % 10 >= 2 && words % 10 <= 4 && (words % 100 < 10 || words % 100 >= 20) ? 'слова' : 'слов'}` : 'Текст пока пуст'}</span>
        <span>Изображение можно перетащить или вставить из буфера</span>
      </div>

      {selectedImage && (
        <div className="simple-editor-image-settings">
          <div>
            <label className="label" htmlFor="editor-selected-alt">Описание изображения</label>
            <input id="editor-selected-alt" className="field" value={selectedImage.alt || ''} onChange={(event) => editor.commands.updateAttributes('image', { alt: event.target.value })} />
          </div>
          <div>
            <label className="label" htmlFor="editor-selected-size">Размер</label>
            <select id="editor-selected-size" className="field" value={selectedImage.displaySize || 'content'} onChange={(event) => editor.commands.updateAttributes('image', { displaySize: event.target.value })}>
              <option value="small">Маленькое</option><option value="medium">Среднее</option><option value="large">Большое</option><option value="content">На ширину текста</option><option value="wide">Широкое</option>
            </select>
          </div>
          <div>
            <label className="label" htmlFor="editor-selected-alignment">Расположение</label>
            <select id="editor-selected-alignment" className="field" value={selectedImage.alignment || 'center'} onChange={(event) => editor.commands.updateAttributes('image', { alignment: event.target.value })}>
              <option value="left">Слева</option><option value="center">По центру</option><option value="right">Справа</option>
            </select>
          </div>
          <div>
            <label className="label" htmlFor="editor-selected-caption">Подпись</label>
            <input id="editor-selected-caption" className="field" value={selectedImage.caption || ''} onChange={(event) => editor.commands.updateAttributes('image', { caption: event.target.value, title: event.target.value || null })} />
          </div>
          <button
            type="button"
            className="button-outline text-red-700"
            onClick={async () => {
              if (selectedImage.mediaId) await onDeleteImage(selectedImage.mediaId)
              editor.chain().focus().deleteSelection().run()
            }}
          >
            <Trash2 size={17} />
            Удалить изображение
          </button>
        </div>
      )}
    </div>
  )
}

