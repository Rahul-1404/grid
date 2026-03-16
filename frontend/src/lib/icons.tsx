const I = ({ className = 'w-4 h-4', d, children }: { className?: string; d?: string; children?: React.ReactNode }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    {d ? <path d={d} /> : children}
  </svg>
);

export function IconHash({ className }: { className?: string }) {
  return <I className={className}><line x1="4" y1="9" x2="20" y2="9" /><line x1="4" y1="15" x2="20" y2="15" /><line x1="10" y1="3" x2="8" y2="21" /><line x1="16" y1="3" x2="14" y2="21" /></I>;
}
export function IconFile({ className }: { className?: string }) {
  return <I className={className}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></I>;
}
export function IconPlus({ className }: { className?: string }) {
  return <I className={className}><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></I>;
}
export function IconMessage({ className }: { className?: string }) {
  return <I className={className} d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />;
}
export function IconCheck({ className }: { className?: string }) {
  return <I className={className}><polyline points="20 6 9 17 4 12" /></I>;
}
export function IconX({ className }: { className?: string }) {
  return <I className={className}><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></I>;
}
export function IconChevronDown({ className }: { className?: string }) {
  return <I className={className}><polyline points="6 9 12 15 18 9" /></I>;
}
export function IconChevronRight({ className }: { className?: string }) {
  return <I className={className}><polyline points="9 18 15 12 9 6" /></I>;
}
export function IconBold({ className }: { className?: string }) {
  return <I className={className}><path d="M6 4h8a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z" /><path d="M6 12h9a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z" /></I>;
}
export function IconItalic({ className }: { className?: string }) {
  return <I className={className}><line x1="19" y1="4" x2="10" y2="4" /><line x1="14" y1="20" x2="5" y2="20" /><line x1="15" y1="4" x2="9" y2="20" /></I>;
}
export function IconStrikethrough({ className }: { className?: string }) {
  return <I className={className}><line x1="4" y1="12" x2="20" y2="12" /><path d="M17.5 7.5A4 4 0 0 0 12 4H8a4 4 0 0 0 0 8" /><path d="M8.5 16.5A4 4 0 0 0 12 20h4a4 4 0 0 0 0-8" /></I>;
}
export function IconCode({ className }: { className?: string }) {
  return <I className={className}><polyline points="16 18 22 12 16 6" /><polyline points="8 6 2 12 8 18" /></I>;
}
export function IconList({ className }: { className?: string }) {
  return <I className={className}><line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" /><line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" /></I>;
}
export function IconListOrdered({ className }: { className?: string }) {
  return <I className={className}><line x1="10" y1="6" x2="21" y2="6" /><line x1="10" y1="12" x2="21" y2="12" /><line x1="10" y1="18" x2="21" y2="18" /><path d="M4 6h1v4" /><path d="M4 10h2" /><path d="M6 18H4c0-1 2-2 2-3s-1-1.5-2-1" /></I>;
}
export function IconQuote({ className }: { className?: string }) {
  return <I className={className}><path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V21z" /><path d="M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2h.75c0 2.25.25 4-2.75 4v3z" /></I>;
}
export function IconTable({ className }: { className?: string }) {
  return <I className={className}><rect x="3" y="3" width="18" height="18" rx="2" /><line x1="3" y1="9" x2="21" y2="9" /><line x1="3" y1="15" x2="21" y2="15" /><line x1="9" y1="3" x2="9" y2="21" /><line x1="15" y1="3" x2="15" y2="21" /></I>;
}
export function IconImage({ className }: { className?: string }) {
  return <I className={className}><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" /></I>;
}
export function IconMinus({ className }: { className?: string }) {
  return <I className={className}><line x1="5" y1="12" x2="19" y2="12" /></I>;
}
export function IconActivity({ className }: { className?: string }) {
  return <I className={className}><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></I>;
}
export function IconLink({ className }: { className?: string }) {
  return <I className={className}><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" /></I>;
}
export function IconCopy({ className }: { className?: string }) {
  return <I className={className}><rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></I>;
}
export function IconSend({ className }: { className?: string }) {
  return <I className={className}><line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" /></I>;
}
export function IconHeading({ className }: { className?: string }) {
  return <I className={className}><path d="M6 4v16" /><path d="M18 4v16" /><path d="M6 12h12" /></I>;
}
export function IconAlertCircle({ className }: { className?: string }) {
  return <I className={className}><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></I>;
}
export function IconCheckSquare({ className }: { className?: string }) {
  return <I className={className}><polyline points="9 11 12 14 22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" /></I>;
}
export function IconUnderline({ className }: { className?: string }) {
  return <I className={className}><path d="M6 3v7a6 6 0 0 0 6 6 6 6 0 0 0 6-6V3" /><line x1="4" y1="21" x2="20" y2="21" /></I>;
}
export function IconHighlight({ className }: { className?: string }) {
  return <I className={className}><path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" /></I>;
}
export function IconSearch({ className }: { className?: string }) {
  return <I className={className}><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></I>;
}
export function IconStar({ className }: { className?: string }) {
  return <I className={className} d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />;
}
export function IconStarFilled({ className }: { className?: string }) {
  return (
    <svg className={className || 'w-4 h-4'} viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
    </svg>
  );
}
export function IconSettings({ className }: { className?: string }) {
  return <I className={className}><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" /></I>;
}
export function IconTrash({ className }: { className?: string }) {
  return <I className={className}><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></I>;
}
export function IconMoreHorizontal({ className }: { className?: string }) {
  return <I className={className}><circle cx="12" cy="12" r="1" /><circle cx="19" cy="12" r="1" /><circle cx="5" cy="12" r="1" /></I>;
}
export function IconGripVertical({ className }: { className?: string }) {
  return <I className={className}><circle cx="9" cy="5" r="1" /><circle cx="9" cy="12" r="1" /><circle cx="9" cy="19" r="1" /><circle cx="15" cy="5" r="1" /><circle cx="15" cy="12" r="1" /><circle cx="15" cy="19" r="1" /></I>;
}
export function IconType({ className }: { className?: string }) {
  return <I className={className}><polyline points="4 7 4 4 20 4 20 7" /><line x1="9" y1="20" x2="15" y2="20" /><line x1="12" y1="4" x2="12" y2="20" /></I>;
}
export function IconToggleRight({ className }: { className?: string }) {
  return <I className={className}><rect x="1" y="5" width="22" height="14" rx="7" ry="7" /><circle cx="16" cy="12" r="3" /></I>;
}
export function IconColumns({ className }: { className?: string }) {
  return <I className={className}><rect x="3" y="3" width="18" height="18" rx="2" /><line x1="12" y1="3" x2="12" y2="21" /></I>;
}
export function IconExternalLink({ className }: { className?: string }) {
  return <I className={className}><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" /></I>;
}
export function IconSun({ className }: { className?: string }) {
  return <I className={className}><circle cx="12" cy="12" r="5" /><line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" /><line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" /><line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" /><line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" /></I>;
}
export function IconMoon({ className }: { className?: string }) {
  return <I className={className} d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />;
}
export function IconTerminal({ className }: { className?: string }) {
  return <I className={className}><polyline points="4 17 10 11 4 5" /><line x1="12" y1="19" x2="20" y2="19" /></I>;
}
export function IconPalette({ className }: { className?: string }) {
  return <I className={className}><circle cx="13.5" cy="6.5" r="2.5" /><circle cx="19" cy="11.5" r="2.5" /><circle cx="17" cy="18.5" r="2.5" /><circle cx="8.5" cy="18.5" r="2.5" /><circle cx="5" cy="11.5" r="2.5" /><path d="M12 2a10 10 0 1 0 0 20 10 10 0 1 0 0-20z" /></I>;
}
