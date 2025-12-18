'use client';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useCallback, useEffect, useRef, useState } from 'react';

interface ChatInputProps {
  onSend: (content: string) => void;
  onTyping: (isTyping: boolean) => void;
  disabled?: boolean;
}

export function ChatInput({ onSend, onTyping, disabled }: ChatInputProps) {
  const [value, setValue] = useState('');
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const wasTypingRef = useRef(false);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const trimmed = value.trim();
      if (trimmed && !disabled) {
        onSend(trimmed);
        setValue('');
        onTyping(false);
        wasTypingRef.current = false;
      }
    },
    [value, disabled, onSend, onTyping]
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setValue(e.target.value);

      if (!wasTypingRef.current) {
        wasTypingRef.current = true;
        onTyping(true);
      }

      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      typingTimeoutRef.current = setTimeout(() => {
        wasTypingRef.current = false;
        onTyping(false);
      }, 2000);
    },
    [onTyping]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSubmit(e);
      }
    },
    [handleSubmit]
  );

  // Cleanup typing timeout on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  return (
    <form
      onSubmit={handleSubmit}
      className="flex items-end gap-2 border-border border-t bg-background p-4"
    >
      <textarea
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder="Type a message..."
        disabled={disabled}
        rows={1}
        className={cn(
          'flex-1 resize-none rounded-lg border border-border bg-muted px-4 py-2',
          'text-sm placeholder:text-muted-foreground',
          'focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary-300',
          'disabled:cursor-not-allowed disabled:opacity-50',
          'max-h-[120px] min-h-[40px]'
        )}
        style={{
          height: 'auto',
          overflow: value.split('\n').length > 3 ? 'auto' : 'hidden',
        }}
      />
      <Button
        type="submit"
        disabled={disabled || !value.trim()}
        size="md"
        aria-label="Send message"
      >
        <SendIcon className="h-5 w-5" />
      </Button>
    </form>
  );
}

function SendIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M22 2L11 13" />
      <path d="M22 2L15 22L11 13L2 9L22 2Z" />
    </svg>
  );
}
