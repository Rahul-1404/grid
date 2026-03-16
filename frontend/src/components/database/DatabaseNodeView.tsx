import { NodeViewWrapper } from '@tiptap/react'
import DatabaseBlock from './DatabaseBlock'

export default function DatabaseNodeView(props: any) {
  return (
    <NodeViewWrapper className="database-node-view" data-drag-handle>
      <DatabaseBlock
        id={props.node.attrs.id || 'inline'}
        onDelete={() => props.deleteNode()}
        title={props.node.attrs.title}
        onTitleChange={(t: string) => props.updateAttributes({ title: t })}
      />
    </NodeViewWrapper>
  )
}
