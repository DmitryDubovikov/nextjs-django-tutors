'use client';

import { Spinner } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { ChatMessage as ChatMessageType } from '@/stores/chat-store';
import { AnimatePresence, motion } from 'motion/react';

interface ChatMessageProps {
  message: ChatMessageType;
  isOwn: boolean;
}

export function ChatMessage({ message, isOwn }: ChatMessageProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -10, scale: 0.95 }}
      transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
      className={cn('flex', isOwn ? 'justify-end' : 'justify-start')}
    >
      <div
        className={cn(
          'max-w-[70%] rounded-2xl px-4 py-2',
          isOwn ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground'
        )}
      >
        {!isOwn && <p className="mb-1 font-medium text-xs opacity-70">{message.sender_name}</p>}
        <p className="whitespace-pre-wrap break-words text-sm">{message.content}</p>
        <div className="mt-1 flex items-center justify-end gap-2">
          <span className="text-xs opacity-60">{formatTime(message.created_at)}</span>
          {message.isPending && <Spinner className="h-3 w-3 animate-spin" />}
          {isOwn && !message.isPending && <MessageStatus isRead={message.is_read} />}
        </div>
      </div>
    </motion.div>
  );
}

function MessageStatus({ isRead }: { isRead: boolean }) {
  return (
    <svg
      className={cn('h-4 w-4', isRead ? 'text-success' : 'opacity-60')}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      role="img"
      aria-label={isRead ? 'Read' : 'Sent'}
    >
      <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
      {isRead && (
        <path d="M15 6L4 17" strokeLinecap="round" strokeLinejoin="round" className="opacity-60" />
      )}
    </svg>
  );
}

function formatTime(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

interface TypingIndicatorProps {
  usernames: string[];
}

export function TypingIndicator({ usernames }: TypingIndicatorProps) {
  if (usernames.length === 0) return null;

  const text =
    usernames.length === 1
      ? `${usernames[0]} is typing...`
      : `${usernames.join(', ')} are typing...`;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 10 }}
        className="flex items-center gap-2 px-4 py-2 text-muted-foreground text-sm"
      >
        <div className="flex gap-1">
          <motion.span
            animate={{ opacity: [0.4, 1, 0.4] }}
            transition={{ duration: 1, repeat: Number.POSITIVE_INFINITY }}
            className="h-2 w-2 rounded-full bg-muted-foreground"
          />
          <motion.span
            animate={{ opacity: [0.4, 1, 0.4] }}
            transition={{
              duration: 1,
              repeat: Number.POSITIVE_INFINITY,
              delay: 0.2,
            }}
            className="h-2 w-2 rounded-full bg-muted-foreground"
          />
          <motion.span
            animate={{ opacity: [0.4, 1, 0.4] }}
            transition={{
              duration: 1,
              repeat: Number.POSITIVE_INFINITY,
              delay: 0.4,
            }}
            className="h-2 w-2 rounded-full bg-muted-foreground"
          />
        </div>
        <span>{text}</span>
      </motion.div>
    </AnimatePresence>
  );
}
