import { describe, it, expect } from 'vitest'
import {
  parseDescription,
  extractMentions,
  diffMentions,
  extractPlainText,
  formatActivityMessage,
} from './activityUtils'

describe('parseDescription', () => {
  it('wraps plain text as a paragraph doc', () => {
    expect(parseDescription('Hello world')).toEqual({
      type: 'doc',
      content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Hello world' }] }],
    })
  })

  it('returns empty paragraph doc for empty string', () => {
    expect(parseDescription('')).toEqual({ type: 'doc', content: [{ type: 'paragraph' }] })
  })

  it('returns valid Tiptap JSON unchanged', () => {
    const json = {
      type: 'doc',
      content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Rich' }] }],
    }
    expect(parseDescription(JSON.stringify(json))).toEqual(json)
  })

  it('wraps non-doc JSON object as plain text', () => {
    const result = parseDescription('{"foo":"bar"}')
    expect(result.type).toBe('doc')
    expect((result.content?.[0] as { content?: Array<{ text?: string }> }).content?.[0].text).toBe(
      '{"foo":"bar"}'
    )
  })
})

describe('extractMentions', () => {
  it('extracts mention nodes from content', () => {
    const content = {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: 'Hello ' },
            { type: 'mention', attrs: { id: 'user1', label: 'Alice' } },
          ],
        },
      ],
    }
    expect(extractMentions(content)).toEqual([{ id: 'user1', label: 'Alice' }])
  })

  it('returns empty array when no mentions', () => {
    const content = {
      type: 'doc',
      content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Hello' }] }],
    }
    expect(extractMentions(content)).toEqual([])
  })

  it('extracts multiple mentions', () => {
    const content = {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            { type: 'mention', attrs: { id: 'u1', label: 'Alice' } },
            { type: 'text', text: ' and ' },
            { type: 'mention', attrs: { id: 'u2', label: 'Bob' } },
          ],
        },
      ],
    }
    expect(extractMentions(content)).toEqual([
      { id: 'u1', label: 'Alice' },
      { id: 'u2', label: 'Bob' },
    ])
  })
})

describe('diffMentions', () => {
  it('returns only newly added mentions', () => {
    const prev = [{ id: 'u1', label: 'Alice' }]
    const next = [
      { id: 'u1', label: 'Alice' },
      { id: 'u2', label: 'Bob' },
    ]
    expect(diffMentions(prev, next)).toEqual([{ id: 'u2', label: 'Bob' }])
  })

  it('returns all mentions when prev is empty', () => {
    const next = [{ id: 'u1', label: 'Alice' }]
    expect(diffMentions([], next)).toEqual(next)
  })

  it('returns empty when no new mentions added', () => {
    const both = [{ id: 'u1', label: 'Alice' }]
    expect(diffMentions(both, both)).toEqual([])
  })
})

describe('extractPlainText', () => {
  it('extracts text from paragraph', () => {
    const content = {
      type: 'doc',
      content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Hello world' }] }],
    }
    expect(extractPlainText(content)).toBe('Hello world')
  })

  it('renders @mention label in plain text', () => {
    const content = {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: 'Hi ' },
            { type: 'mention', attrs: { id: 'u1', label: 'Alice' } },
          ],
        },
      ],
    }
    expect(extractPlainText(content)).toBe('Hi @Alice')
  })
})

describe('formatActivityMessage', () => {
  it('formats member_assigned', () => {
    expect(formatActivityMessage('member_assigned', 'Alice', { userName: 'Bob' })).toBe(
      'Alice assigned Bob to this card'
    )
  })

  it('formats member_unassigned', () => {
    expect(formatActivityMessage('member_unassigned', 'Alice', { userName: 'Bob' })).toBe(
      'Alice removed Bob from this card'
    )
  })

  it('formats moved', () => {
    expect(formatActivityMessage('moved', 'Alice', { from: 'Backlog', to: 'In Progress' })).toBe(
      'Alice moved this from Backlog to In Progress'
    )
  })

  it('formats due_date_set', () => {
    expect(formatActivityMessage('due_date_set', 'Alice', { date: 'Jun 3' })).toBe(
      'Alice set the due date to Jun 3'
    )
  })

  it('formats due_date_changed', () => {
    expect(
      formatActivityMessage('due_date_changed', 'Alice', { from: 'Jun 3', to: 'Jun 10' })
    ).toBe('Alice changed the due date to Jun 10')
  })

  it('formats due_date_removed', () => {
    expect(formatActivityMessage('due_date_removed', 'Alice', {})).toBe(
      'Alice removed the due date'
    )
  })

  it('formats archived', () => {
    expect(formatActivityMessage('archived', 'Alice', {})).toBe('Alice archived this card')
  })

  it('formats description_updated', () => {
    expect(formatActivityMessage('description_updated', 'Alice', {})).toBe(
      'Alice updated the description'
    )
  })
})
