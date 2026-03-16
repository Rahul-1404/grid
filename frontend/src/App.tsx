import { useUser } from '@clerk/clerk-react';
import Sidebar from './components/sidebar/Sidebar';
import EditorArea from './components/editor/EditorArea';
import RightPanel from './components/panel/RightPanel';
import AddAgentModal from './components/modals/AddAgentModal';
import InviteModal from './components/modals/InviteModal';
import SearchModal from './components/modals/SearchModal';
import SettingsModal from './components/modals/SettingsModal';
import CreateWorkspaceModal from './components/modals/CreateWorkspaceModal';
import ErrorBoundary from './components/ErrorBoundary';
import ToastContainer, { useToastListener } from './components/Toast';
import LandingPage from './components/LandingPage';
import { useEditorStore } from './stores/editorStore';
import { useWorkspaceStore } from './stores/workspaceStore';
import { useAgentStore } from './stores/agentStore';
import { usePeopleStore } from './stores/peopleStore';
import { useEffect, useState, useCallback } from 'react';

function LoadingScreen() {
  return (
    <div className="h-full w-full flex items-center justify-center bg-bg">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#D4A574] to-[#B8865C] flex items-center justify-center animate-pulse">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0A0A0B" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="7" height="7" />
            <rect x="14" y="3" width="7" height="7" />
            <rect x="3" y="14" width="7" height="7" />
            <rect x="14" y="14" width="7" height="7" />
          </svg>
        </div>
        <span className="text-sm text-text-tertiary">Loading...</span>
      </div>
    </div>
  );
}

function JoiningScreen() {
  return (
    <div className="h-full w-full flex items-center justify-center bg-bg">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#D4A574] to-[#B8865C] flex items-center justify-center animate-pulse">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0A0A0B" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="7" height="7" />
            <rect x="14" y="3" width="7" height="7" />
            <rect x="3" y="14" width="7" height="7" />
            <rect x="14" y="14" width="7" height="7" />
          </svg>
        </div>
        <span className="text-sm text-text-tertiary">Joining workspace...</span>
      </div>
    </div>
  );
}

function getJoinCode(): string | null {
  const params = new URLSearchParams(window.location.search);
  return params.get('join');
}

function clearJoinCode() {
  const url = new URL(window.location.href);
  url.searchParams.delete('join');
  window.history.replaceState({}, '', url.pathname + url.search);
}

export default function App() {
  const { isSignedIn, isLoaded, user } = useUser();
  const { showAddAgentModal, showInviteModal, showSettingsModal, showCreateWorkspaceModal } = useEditorStore();
  const { searchOpen, loading: workspacesLoading, currentWorkspaceId } = useWorkspaceStore();
  const loadWorkspaces = useWorkspaceStore((s) => s.loadWorkspaces);
  const joinWorkspace = useWorkspaceStore((s) => s.joinWorkspace);
  const connectSocket = useAgentStore((s) => s.connectSocket);
  const setCurrentUser = usePeopleStore((s) => s.setCurrentUser);
  const loadWorkspaceMembers = usePeopleStore((s) => s.loadWorkspaceMembers);
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [pendingJoinCode] = useState<string | null>(() => getJoinCode());

  // Sync Clerk user to people store
  useEffect(() => {
    if (isLoaded && isSignedIn && user) {
      const userName = user.fullName || user.firstName || 'You';
      (globalThis as any).__gridUserName = userName;
      (globalThis as any).__gridUserAvatar = user.imageUrl;
      setCurrentUser({
        id: user.id,
        name: userName,
        email: user.primaryEmailAddress?.emailAddress || '',
        color: '#3B82F6',
        status: 'online',
        avatar: user.imageUrl,
      });
    }
  }, [isLoaded, isSignedIn, user, setCurrentUser]);

  // Load workspaces from Supabase after sign-in
  useEffect(() => {
    if (isSignedIn && user) {
      loadWorkspaces(user.id);
    }
  }, [isSignedIn, user, loadWorkspaces]);

  // Process join code after workspaces are loaded
  const processJoin = useCallback(async () => {
    const joinCode = getJoinCode();
    if (!joinCode || !isSignedIn || !user || workspacesLoading) return;

    setJoining(true);
    setJoinError(null);

    const result = await joinWorkspace(joinCode, {
      id: user.id,
      name: user.fullName || user.firstName || 'User',
      avatar: user.imageUrl,
    });

    if (!result.success) {
      setJoinError(result.error || 'Failed to join workspace');
    }

    clearJoinCode();
    setJoining(false);
  }, [isSignedIn, user, workspacesLoading, joinWorkspace]);

  useEffect(() => {
    processJoin();
  }, [processJoin]);

  // Load workspace members when current workspace changes
  useEffect(() => {
    if (currentWorkspaceId && !workspacesLoading) {
      loadWorkspaceMembers(currentWorkspaceId);
    }
  }, [currentWorkspaceId, workspacesLoading, loadWorkspaceMembers]);

  useEffect(() => {
    if (isSignedIn) {
      connectSocket();
    }
  }, [isSignedIn, connectSocket]);

  // Listen for socket events and show toast notifications
  useToastListener();

  if (!isLoaded) return <LoadingScreen />;

  // If not signed in and there's a join code, show landing page (join will be processed after sign-in)
  if (!isSignedIn) return <LandingPage />;

  if (workspacesLoading) return <LoadingScreen />;
  if (joining) return <JoiningScreen />;

  return (
    <div className="flex h-full w-full overflow-hidden">
      <Sidebar />
      <ErrorBoundary>
        <EditorArea />
      </ErrorBoundary>
      <RightPanel />

      {showAddAgentModal && <AddAgentModal />}
      {showInviteModal && <InviteModal />}
      {searchOpen && <SearchModal />}
      {showSettingsModal && <SettingsModal />}
      {showCreateWorkspaceModal && <CreateWorkspaceModal />}
      {joinError && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 bg-danger/90 text-white px-4 py-2 rounded-lg text-sm shadow-lg">
          {joinError}
          <button onClick={() => setJoinError(null)} className="ml-3 opacity-70 hover:opacity-100">dismiss</button>
        </div>
      )}
      <ToastContainer />
    </div>
  );
}
