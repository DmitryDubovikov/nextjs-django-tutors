'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useChatRoomsList } from '@/generated/api/chat/chat';
import type { ChatRoomLastMessage } from '@/generated/schemas';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { MessageCircle } from 'lucide-react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';

function getDisplayName(user: { first_name: string; last_name: string; email: string }): string {
  if (user.first_name && user.last_name) {
    return `${user.first_name} ${user.last_name}`;
  }
  const emailName = user.email.split('@')[0];
  return emailName ?? user.email;
}

function getInitials(user: { first_name: string; email: string }): string {
  return user.first_name?.[0]?.toUpperCase() ?? user.email[0]?.toUpperCase() ?? '?';
}

function getLastMessageTime(lastMessage: ChatRoomLastMessage): string | null {
  if (!lastMessage || typeof lastMessage.created_at !== 'string') {
    return null;
  }
  return formatDistanceToNow(new Date(lastMessage.created_at), { addSuffix: true });
}

function getLastMessageContent(lastMessage: ChatRoomLastMessage): string | null {
  if (!lastMessage || typeof lastMessage.content !== 'string') {
    return null;
  }
  return lastMessage.content;
}

export default function ChatsPage() {
  const { data: session, status } = useSession();
  const { data, isLoading } = useChatRoomsList(undefined, {
    query: { enabled: status === 'authenticated' },
  });

  if (status === 'loading' || isLoading) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-8">
        <h1 className="mb-6 font-bold text-2xl">Messages</h1>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse rounded-lg border p-4">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-full bg-muted" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-1/3 rounded bg-muted" />
                  <div className="h-3 w-2/3 rounded bg-muted" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (status === 'unauthenticated') {
    return (
      <div className="mx-auto max-w-2xl px-4 py-8">
        <h1 className="mb-6 font-bold text-2xl">Messages</h1>
        <p className="text-muted-foreground">Please sign in to view your messages.</p>
      </div>
    );
  }

  const rooms = data?.data?.results ?? [];
  const currentUserId = session?.user?.id;

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="mb-6 font-bold text-2xl">Messages</h1>

      {rooms.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center">
          <MessageCircle className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
          <p className="text-muted-foreground">No conversations yet.</p>
          <p className="mt-2 text-muted-foreground text-sm">
            Start a conversation by messaging a tutor from their profile page.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {rooms.map((room) => {
            const otherUser = room.tutor.id === Number(currentUserId) ? room.student : room.tutor;
            const hasUnread = room.unread_count > 0;

            return (
              <Link
                key={room.id}
                href={`/chat/${room.id}` as '/chat/[roomId]'}
                className={cn(
                  'flex items-center gap-3 rounded-lg border p-4 transition-colors hover:bg-muted/50',
                  hasUnread && 'border-primary/20 bg-primary/5'
                )}
              >
                <Avatar className="h-12 w-12">
                  <AvatarImage
                    src={otherUser.avatar || undefined}
                    alt={getDisplayName(otherUser)}
                  />
                  <AvatarFallback>{getInitials(otherUser)}</AvatarFallback>
                </Avatar>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className={cn('truncate font-medium', hasUnread && 'font-semibold')}>
                      {getDisplayName(otherUser)}
                    </p>
                    {getLastMessageTime(room.last_message) && (
                      <span className="shrink-0 text-muted-foreground text-xs">
                        {getLastMessageTime(room.last_message)}
                      </span>
                    )}
                  </div>

                  {getLastMessageContent(room.last_message) && (
                    <p
                      className={cn(
                        'truncate text-sm',
                        hasUnread ? 'font-medium text-foreground' : 'text-muted-foreground'
                      )}
                    >
                      {getLastMessageContent(room.last_message)}
                    </p>
                  )}
                </div>

                {hasUnread && (
                  <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 font-medium text-primary-foreground text-xs">
                    {room.unread_count}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
