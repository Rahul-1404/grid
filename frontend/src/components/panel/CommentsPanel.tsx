import { useState, useRef, useEffect } from 'react';
import { useCommentStore } from '../../stores/commentStore';
import { usePeopleStore } from '../../stores/peopleStore';
import { useAgentStore } from '../../stores/agentStore';
import { IconCheck, IconSend } from '../../lib/icons';
import { timeAgo, getInitial, generateId } from '../../lib/utils';
import { getSocket } from '../../lib/socket';
import { useEditorStore } from '../../stores/editorStore';
import { useWorkspaceStore } from '../../stores/workspaceStore';
import type { Comment, CommentReply, Person, Agent } from '../../types';

export default function CommentsPanel() {
  const { comments, activeCommentId, pendingSelection, setActiveComment, addComment, addReply, resolveComment, unresolveComment, setPendingSelection, updateReply } = useCommentStore();
  const { currentUser } = usePeopleStore();
  const { agents } = useAgentStore();
  const currentDocId = useWorkspaceStore((s) => s.currentDocId);
  const [newCommentText, setNewCommentText] = useState('');
  const [replyTexts, setReplyTexts] = useState<Record<string, string>>({});
  const [showMentions, setShowMentions] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [activeInput, setActiveInput] = useState<string | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Listen for agent replies from the backend
  useEffect(() => {
    const socket = getSocket();
    const handleReply = (data: { commentId: string; docId?: string; reply: any }) => {
      // Try to replace a "thinking" placeholder from this agent first
      const allComments = useCommentStore.getState().comments;
      // Match by commentId or find any comment with a thinking reply from this agent
      const comment = allComments.find((c) => c.id === data.commentId)
        || allComments.find((c) => c.replies.some((r: any) => r.isThinking && r.author?.name?.toLowerCase() === data.reply?.author?.name?.toLowerCase()));
      const thinkingReply = comment?.replies.find(
        (r: any) => r.isThinking && (
          r.author?.id === data.reply?.author?.id ||
          r.author?.name?.toLowerCase() === data.reply?.author?.name?.toLowerCase()
        )
      );
      if (thinkingReply && comment) {
        updateReply(comment.id, thinkingReply.id, {
          isThinking: false,
          text: data.reply.text,
        });
      } else if (comment) {
        addReply(comment.id, data.reply);
      }
    };
    socket.on('comment:reply', handleReply);
    return () => {
      socket.off('comment:reply', handleReply);
    };
  }, [addReply, updateReply]);

  useEffect(() => {
    if (pendingSelection && inputRef.current) {
      inputRef.current.focus();
    }
  }, [pendingSelection]);

  const handleSubmitComment = () => {
    if (!newCommentText.trim() || !pendingSelection) return;

    const commentId = `comment-${generateId()}`;
    addComment({
      id: commentId,
      documentId: currentDocId || '',
      text: newCommentText,
      quotedText: pendingSelection.text,
      author: currentUser,
      isAgent: false,
      createdAt: new Date().toISOString(),
      resolved: false,
      selectionFrom: pendingSelection.from,
      selectionTo: pendingSelection.to,
      replies: [],
    });

    // Check for @mentions of agents and route through backend
    const mentionedAgents = agents.filter((a) =>
      newCommentText.toLowerCase().includes(`@${a.name.toLowerCase()}`)
    );
    if (mentionedAgents.length > 0) {
      // Add "thinking" placeholders for mentioned agents
      const replyIds: { agent: typeof mentionedAgents[0]; replyId: string }[] = [];
      mentionedAgents.forEach((agent) => {
        const replyId = `reply-${generateId()}`;
        replyIds.push({ agent, replyId });
        addReply(commentId, {
          id: replyId,
          commentId,
          text: '',
          author: agent,
          isAgent: true,
          createdAt: new Date().toISOString(),
          isThinking: true,
        });
      });

      // Send to backend so it can route to agents
      const socket = getSocket();
      if (socket.connected) {
        socket.emit('comment:create', {
          id: commentId,
          documentId: currentDocId || '',
          text: newCommentText,
          quotedText: pendingSelection.text,
          docContent: useEditorStore.getState().docContent,
          threadHistory: [],
          author: { id: currentUser.id, name: currentUser.name },
        });
      } else {
        // Fallback: simulate agent response locally when backend is down
        replyIds.forEach(({ agent, replyId }) => {
          setTimeout(() => {
            updateReply(commentId, replyId, {
              isThinking: false,
              text: getAgentResponse(agent.name, newCommentText),
            });
          }, 2000 + Math.random() * 2000);
        });
      }
    }

    setNewCommentText('');
    setPendingSelection(null);
    setActiveComment(commentId);
  };

  const handleSubmitReply = (commentId: string) => {
    const text = replyTexts[commentId];
    if (!text?.trim()) return;

    const replyId = `reply-${generateId()}`;
    addReply(commentId, {
      id: replyId,
      commentId,
      text,
      author: currentUser,
      isAgent: false,
      createdAt: new Date().toISOString(),
    });

    // Check for agent mentions and route through backend
    const mentionedAgents = agents.filter((a) =>
      text.toLowerCase().includes(`@${a.name.toLowerCase()}`)
    );
    if (mentionedAgents.length > 0) {
      const replyIds: { agent: typeof mentionedAgents[0]; replyId: string }[] = [];
      mentionedAgents.forEach((agent) => {
        const agentReplyId = `reply-${generateId()}`;
        replyIds.push({ agent, replyId: agentReplyId });
        addReply(commentId, {
          id: agentReplyId,
          commentId,
          text: '',
          author: agent,
          isAgent: true,
          createdAt: new Date().toISOString(),
          isThinking: true,
        });
      });

      const comment = comments.find((c) => c.id === commentId);
      const socket = getSocket();
      if (socket.connected) {
        // Build thread history from existing replies
        const threadHistory = [
          { role: 'user', name: comment?.author?.name || 'User', text: comment?.text || '' },
          ...(comment?.replies || [])
            .filter((r: any) => !r.isThinking)
            .map((r: any) => ({ role: r.isAgent ? 'agent' : 'user', name: r.author?.name || 'Unknown', text: r.text })),
        ];

        socket.emit('comment:reply', {
          commentId,
          documentId: comment?.documentId || 'doc-1',
          text,
          quotedText: comment?.quotedText || '',
          docContent: useEditorStore.getState().docContent,
          threadHistory,
          author: { id: currentUser.id, name: currentUser.name },
        });
      } else {
        // Fallback when backend is down
        replyIds.forEach(({ agent, replyId }) => {
          setTimeout(() => {
            updateReply(commentId, replyId, {
              isThinking: false,
              text: getAgentResponse(agent.name, text),
            });
          }, 2000 + Math.random() * 2000);
        });
      }
    }

    setReplyTexts((prev) => ({ ...prev, [commentId]: '' }));
  };

  const handleInputChange = (value: string, inputId: string) => {
    if (inputId === 'new') {
      setNewCommentText(value);
    } else {
      setReplyTexts((prev) => ({ ...prev, [inputId]: value }));
    }

    // Check for @ trigger
    const lastAt = value.lastIndexOf('@');
    if (lastAt >= 0) {
      const afterAt = value.slice(lastAt + 1);
      if (!afterAt.includes(' ')) {
        setShowMentions(true);
        setMentionQuery(afterAt);
        setActiveInput(inputId);
        return;
      }
    }
    setShowMentions(false);
  };

  const insertMention = (name: string) => {
    const setter = activeInput === 'new' ? setNewCommentText : (val: string) =>
      setReplyTexts((prev) => ({ ...prev, [activeInput!]: val }));
    const currentVal = activeInput === 'new' ? newCommentText : (replyTexts[activeInput!] || '');
    const lastAt = currentVal.lastIndexOf('@');
    const newVal = currentVal.slice(0, lastAt) + `@${name} `;
    setter(newVal);
    setShowMentions(false);
  };

  const filteredMentions = agents.filter(
    (a) => a.name.toLowerCase().includes(mentionQuery.toLowerCase())
  );

  const docComments = comments.filter((c) => c.documentId === currentDocId);
  const unresolvedComments = docComments.filter((c) => !c.resolved);
  const resolvedComments = docComments.filter((c) => c.resolved);

  return (
    <div className="h-full flex flex-col">
      <div className="px-4 py-3 border-b border-border">
        <h3 className="text-sm font-semibold text-text-primary">Comments</h3>
        <p className="text-xs text-text-tertiary mt-0.5">
          {unresolvedComments.length} open, {resolvedComments.length} resolved
        </p>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* New comment input */}
        {pendingSelection && (
          <div className="p-4 border-b border-border bg-surface-hover/30">
            <div className="text-xs text-text-tertiary mb-2">Commenting on:</div>
            <div className="text-sm text-accent bg-accent/10 px-2 py-1 rounded mb-3 italic truncate">
              "{pendingSelection.text}"
            </div>
            <div className="relative">
              <textarea
                ref={inputRef}
                value={newCommentText}
                onChange={(e) => handleInputChange(e.target.value, 'new')}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSubmitComment();
                  }
                }}
                placeholder="Add a comment... Use @ to mention agents"
                className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm text-text-primary placeholder:text-text-tertiary outline-none focus:border-accent resize-none"
                rows={3}
              />
              <button
                onClick={handleSubmitComment}
                disabled={!newCommentText.trim()}
                className="absolute bottom-2 right-2 p-1.5 rounded-md bg-accent text-white disabled:opacity-30 hover:bg-accent-hover transition-colors"
              >
                <IconSend className="w-3.5 h-3.5" />
              </button>
              {showMentions && activeInput === 'new' && (
                <MentionDropdown items={filteredMentions} onSelect={insertMention} />
              )}
            </div>
          </div>
        )}

        {/* Comments list */}
        {unresolvedComments.map((comment) => (
          <CommentThread
            key={comment.id}
            comment={comment}
            isActive={activeCommentId === comment.id}
            replyText={replyTexts[comment.id] || ''}
            onActivate={() => setActiveComment(comment.id)}
            onReplyChange={(val) => handleInputChange(val, comment.id)}
            onSubmitReply={() => handleSubmitReply(comment.id)}
            onResolve={() => resolveComment(comment.id)}
            showMentions={showMentions && activeInput === comment.id}
            mentionItems={filteredMentions}
            onMentionSelect={insertMention}
          />
        ))}

        {resolvedComments.length > 0 && (
          <>
            <div className="px-4 py-2 text-xs text-text-tertiary font-semibold uppercase tracking-wider border-t border-border mt-2">
              Resolved
            </div>
            {resolvedComments.map((comment) => (
              <CommentThread
                key={comment.id}
                comment={comment}
                isActive={activeCommentId === comment.id}
                replyText={replyTexts[comment.id] || ''}
                onActivate={() => setActiveComment(comment.id)}
                onReplyChange={(val) => handleInputChange(val, comment.id)}
                onSubmitReply={() => handleSubmitReply(comment.id)}
                onResolve={() => unresolveComment(comment.id)}
                showMentions={showMentions && activeInput === comment.id}
                mentionItems={filteredMentions}
                onMentionSelect={insertMention}
                resolved
              />
            ))}
          </>
        )}

        {docComments.length === 0 && !pendingSelection && (
          <div className="px-4 py-12 text-center">
            <div className="text-text-tertiary text-sm">No comments yet</div>
            <div className="text-text-tertiary text-xs mt-1">
              Select text in the editor to add a comment
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function CommentThread({
  comment,
  isActive,
  replyText,
  onActivate,
  onReplyChange,
  onSubmitReply,
  onResolve,
  showMentions,
  mentionItems,
  onMentionSelect,
  resolved,
}: {
  comment: Comment;
  isActive: boolean;
  replyText: string;
  onActivate: () => void;
  onReplyChange: (val: string) => void;
  onSubmitReply: () => void;
  onResolve: () => void;
  showMentions: boolean;
  mentionItems: (Person | Agent)[];
  onMentionSelect: (name: string) => void;
  resolved?: boolean;
}) {
  return (
    <div
      onClick={onActivate}
      className={`px-4 py-3 border-b border-border cursor-pointer transition-colors ${
        isActive ? 'bg-surface-hover/50' : 'hover:bg-surface-hover/30'
      } ${resolved ? 'opacity-60' : ''}`}
    >
      {/* Quoted text */}
      <div className="text-xs text-accent bg-accent/10 px-2 py-1 rounded mb-2 italic truncate">
        "{comment.quotedText}"
      </div>

      {/* Main comment */}
      <div className="flex items-start gap-2 mb-2">
        <div
          className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0 mt-0.5"
          style={{ backgroundColor: comment.author.color }}
        >
          {getInitial(comment.author.name)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-text-primary">{comment.author.name}</span>
            <span className="text-[10px] text-text-tertiary">{timeAgo(comment.createdAt)}</span>
          </div>
          <p className="text-sm text-text-secondary mt-0.5 whitespace-pre-wrap">{formatMentions(comment.text)}</p>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onResolve();
          }}
          className={`p-1 rounded-md text-text-tertiary hover:text-online hover:bg-online/10 transition-colors shrink-0 ${
            resolved ? 'text-online' : ''
          }`}
          title={resolved ? 'Unresolve' : 'Resolve'}
        >
          <IconCheck className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Replies */}
      {comment.replies.map((reply: CommentReply) => (
        <div key={reply.id} className="flex items-start gap-2 ml-8 mt-2">
          <div
            className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white shrink-0 mt-0.5 ${
              reply.isAgent ? 'ring-1 ring-agent/50' : ''
            }`}
            style={{ backgroundColor: reply.author.color }}
          >
            {getInitial(reply.author.name)}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-text-primary">
                {reply.author.name}
                {reply.isAgent && (
                  <span className="ml-1 text-[9px] text-agent font-normal px-1 py-0.5 bg-agent/10 rounded">
                    AI
                  </span>
                )}
              </span>
              <span className="text-[10px] text-text-tertiary">{timeAgo(reply.createdAt)}</span>
            </div>
            {reply.isThinking ? (
              <div className="flex items-center gap-1.5 mt-1">
                <div className="flex gap-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-agent animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-1.5 h-1.5 rounded-full bg-agent animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-1.5 h-1.5 rounded-full bg-agent animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
                <span className="text-xs text-agent">thinking...</span>
              </div>
            ) : (
              <p className="text-sm text-text-secondary mt-0.5 whitespace-pre-wrap">{formatMentions(reply.text)}</p>
            )}
          </div>
        </div>
      ))}

      {/* Reply input */}
      {isActive && !resolved && (
        <div className="mt-3 ml-8 relative">
          <textarea
            value={replyText}
            onChange={(e) => onReplyChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                onSubmitReply();
              }
            }}
            onClick={(e) => e.stopPropagation()}
            placeholder="Reply... Use @ to mention agents"
            className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm text-text-primary placeholder:text-text-tertiary outline-none focus:border-accent resize-none"
            rows={2}
          />
          <button
            onClick={(e) => {
              e.stopPropagation();
              onSubmitReply();
            }}
            disabled={!replyText.trim()}
            className="absolute bottom-2 right-2 p-1 rounded bg-accent text-white disabled:opacity-30 hover:bg-accent-hover transition-colors"
          >
            <IconSend className="w-3 h-3" />
          </button>
          {showMentions && (
            <MentionDropdown items={mentionItems} onSelect={onMentionSelect} />
          )}
        </div>
      )}
    </div>
  );
}

function MentionDropdown({
  items,
  onSelect,
}: {
  items: (Person | Agent)[];
  onSelect: (name: string) => void;
}) {
  if (items.length === 0) return null;
  return (
    <div className="absolute bottom-full left-0 mb-1 bg-surface border border-border rounded-lg shadow-lg py-1 min-w-[160px] z-50">
      {items.map((item) => (
        <button
          key={item.id}
          onClick={(e) => {
            e.stopPropagation();
            onSelect(item.name);
          }}
          className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-text-secondary hover:bg-surface-hover hover:text-text-primary transition-colors"
        >
          <div
            className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white"
            style={{ backgroundColor: item.color }}
          >
            {getInitial(item.name)}
          </div>
          <span>{item.name}</span>
          {'capabilities' in item && (
            <span className="text-[9px] text-agent ml-auto px-1 py-0.5 bg-agent/10 rounded">AI</span>
          )}
        </button>
      ))}
    </div>
  );
}

function formatMentions(text: string): React.ReactNode {
  const parts = text.split(/(@[\w][\w\s]*\w|@\w+)/g);
  return parts.map((part, i) => {
    if (part.startsWith('@')) {
      return (
        <span key={i} className="text-accent font-medium">
          {part}
        </span>
      );
    }
    return part;
  });
}

function getAgentResponse(agentName: string, context: string): string {
  const responses: Record<string, string[]> = {
    'Claude Code': [
      "I'd be happy to help with that. Based on the context, I think we should expand the section with more concrete examples and add error handling patterns.",
      "Good point. I'll draft an updated version that covers the edge cases you mentioned. Let me also add some inline documentation.",
      "I've analyzed the current content and have a few suggestions: 1) Add input validation, 2) Include rate limiting details, 3) Document the error response format.",
    ],
    Claude: [
      "I'd be happy to help with that. Based on the context, I think we should expand the section with more concrete examples and add error handling patterns.",
      "Good point. I'll draft an updated version that covers the edge cases you mentioned. Let me also add some inline documentation.",
      "I've analyzed the current content and have a few suggestions: 1) Add input validation, 2) Include rate limiting details, 3) Document the error response format.",
    ],
    Codex: [
      "Looking at the code structure, I recommend refactoring this into smaller, testable modules. I can generate the boilerplate if you'd like.",
      "I've reviewed the implementation. The current approach works but could benefit from better type safety. Want me to add TypeScript interfaces?",
      "The code looks good. I'd suggest adding unit tests for the critical paths and setting up CI/CD integration.",
    ],
    Researcher: [
      "Based on my analysis, there are 3 industry-standard approaches to this. I'll compile a comparison with pros and cons.",
      "I've found several relevant resources and best practices. Let me summarize the key findings in a structured format.",
    ],
  };

  const agentResponses = responses[agentName] || [
    "I'll look into this and provide my analysis shortly.",
  ];
  return agentResponses[Math.floor(Math.random() * agentResponses.length)];
}
