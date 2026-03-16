import { Node, mergeAttributes } from '@tiptap/core'
import { ReactNodeViewRenderer } from '@tiptap/react'
import DatabaseNodeView from './DatabaseNodeView'

export const DatabaseNode = Node.create({
  name: 'databaseBlock',
  group: 'block',
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      title: { default: 'Untitled Database' },
    }
  },

  parseHTML() {
    return [{ tag: 'div[data-type="database"]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'database' })]
  },

  addNodeView() {
    return ReactNodeViewRenderer(DatabaseNodeView)
  },
})
