'use client';

import { ChatRoom } from '@/components/features/chat';
import { useSession } from 'next-auth/react';
import { use } from 'react';

interface ChatPageProps {
  params: Promise<{ roomId: string }>;
}

export default function ChatPage({ params }: ChatPageProps) {
  const { roomId } = use(params);
  const { data: session, status } = useSession();

  if (status === 'loading') {
    return (
      <div className="flex h-screen items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!session?.accessToken) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p className="text-muted-foreground">Please sign in to access chat</p>
      </div>
    );
  }

  return (
    <div className="h-screen">
      <ChatRoom
        roomId={roomId}
        token={session.accessToken}
        currentUserId={session.user?.id ?? ''}
      />
    </div>
  );
}
