'use client';

import { useChat } from '@/hooks/use-chat';
import { cn } from '@/lib/utils';
import { AnimatePresence, motion } from 'motion/react';
import { useCallback, useEffect, useRef } from 'react';
import { ChatInput } from './chat-input';
import { ChatMessage, TypingIndicator } from './chat-message';

interface ChatRoomProps {
  roomId: string;
  token: string;
  currentUserId: string;
}

export function ChatRoom({ roomId, token, currentUserId }: ChatRoomProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { messages, typingUsers, connectionStatus, sendMessage, sendTyping, markAsReadBatch } =
    useChat({
      roomId,
      token,
      currentUserId,
    });

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  // biome-ignore lint/correctness/useExhaustiveDependencies: messages dependency is intentional to scroll when new messages arrive
  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  useEffect(() => {
    const unreadMessageIds = messages
      .filter((msg) => !msg.is_read && msg.sender_id !== currentUserId)
      .map((msg) => msg.id);

    if (unreadMessageIds.length > 0) {
      markAsReadBatch(unreadMessageIds);
    }
  }, [messages, currentUserId, markAsReadBatch]);

  return (
    <div className="flex h-full flex-col bg-background">
      <ChatHeader connectionStatus={connectionStatus} />

      <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
        <AnimatePresence mode="popLayout">
          {messages.map((message) => (
            <ChatMessage
              key={message.id}
              message={message}
              isOwn={message.sender_id === currentUserId}
            />
          ))}
        </AnimatePresence>

        <TypingIndicator usernames={typingUsers.map((u) => u.username)} />

        <div ref={messagesEndRef} />
      </div>

      <ChatInput
        onSend={sendMessage}
        onTyping={sendTyping}
        disabled={connectionStatus !== 'connected'}
      />
    </div>
  );
}

interface ChatHeaderProps {
  connectionStatus: 'connecting' | 'connected' | 'disconnected' | 'error';
}

function ChatHeader({ connectionStatus }: ChatHeaderProps) {
  const statusConfig = {
    connecting: { color: 'bg-warning', text: 'Connecting...' },
    connected: { color: 'bg-success', text: 'Connected' },
    disconnected: { color: 'bg-muted-foreground', text: 'Disconnected' },
    error: { color: 'bg-error', text: 'Connection error' },
  };

  const status = statusConfig[connectionStatus];

  return (
    <div className="flex items-center justify-between border-border border-b bg-background px-4 py-3">
      <h2 className="font-semibold text-foreground">Chat</h2>
      <div className="flex items-center gap-2">
        <motion.span
          initial={{ scale: 0.8 }}
          animate={{ scale: 1 }}
          className={cn('h-2 w-2 rounded-full', status.color)}
        />
        <span className="text-muted-foreground text-xs">{status.text}</span>
      </div>
    </div>
  );
}
