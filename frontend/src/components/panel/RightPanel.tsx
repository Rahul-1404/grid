import { useEditorStore } from '../../stores/editorStore';
import CommentsPanel from './CommentsPanel';
import ActivityPanel from './ActivityPanel';
import AgentDetailPanel from './AgentDetailPanel';

export default function RightPanel() {
  const { panelView } = useEditorStore();

  if (panelView === 'none') return null;

  return (
    <div className="w-[360px] h-full bg-surface border-l border-border shrink-0 panel-enter">
      {panelView === 'comments' && <CommentsPanel />}
      {panelView === 'activity' && <ActivityPanel />}
      {panelView === 'agent-detail' && <AgentDetailPanel />}
    </div>
  );
}
