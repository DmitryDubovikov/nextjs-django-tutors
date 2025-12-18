import type { ChatMessage as ChatMessageType } from '@/stores/chat-store';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ChatMessage, TypingIndicator } from '../chat-message';

describe('ChatMessage', () => {
  const mockMessage: ChatMessageType = {
    id: '1',
    room_id: 'room-1',
    sender_id: 'user-1',
    sender_name: 'John Doe',
    content: 'Hello, world!',
    is_read: false,
    created_at: new Date('2025-01-15T10:30:00Z').toISOString(),
  };

  describe('rendering', () => {
    it('renders message content', () => {
      render(<ChatMessage message={mockMessage} isOwn={false} />);

      expect(screen.getByText('Hello, world!')).toBeInTheDocument();
    });

    it('renders sender name for other users messages', () => {
      render(<ChatMessage message={mockMessage} isOwn={false} />);

      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    it('does not render sender name for own messages', () => {
      render(<ChatMessage message={mockMessage} isOwn={true} />);

      expect(screen.queryByText('John Doe')).not.toBeInTheDocument();
    });

    it('renders formatted time', () => {
      render(<ChatMessage message={mockMessage} isOwn={false} />);

      // Time format depends on locale, just check it exists
      const timeElement = screen.getByText(/\d{1,2}:\d{2}/);
      expect(timeElement).toBeInTheDocument();
    });
  });

  describe('styling', () => {
    it('applies primary background for own messages', () => {
      const { container } = render(<ChatMessage message={mockMessage} isOwn={true} />);

      const messageBox = container.querySelector('.bg-primary');
      expect(messageBox).toBeInTheDocument();
    });

    it('applies muted background for other messages', () => {
      const { container } = render(<ChatMessage message={mockMessage} isOwn={false} />);

      const messageBox = container.querySelector('.bg-muted');
      expect(messageBox).toBeInTheDocument();
    });

    it('aligns own messages to the right', () => {
      const { container } = render(<ChatMessage message={mockMessage} isOwn={true} />);

      const wrapper = container.querySelector('.justify-end');
      expect(wrapper).toBeInTheDocument();
    });

    it('aligns other messages to the left', () => {
      const { container } = render(<ChatMessage message={mockMessage} isOwn={false} />);

      const wrapper = container.querySelector('.justify-start');
      expect(wrapper).toBeInTheDocument();
    });
  });

  describe('message status', () => {
    it('shows pending spinner for pending messages', () => {
      const pendingMessage: ChatMessageType = {
        ...mockMessage,
        isPending: true,
      };

      const { container } = render(<ChatMessage message={pendingMessage} isOwn={true} />);

      const spinner = container.querySelector('.animate-spin');
      expect(spinner).toBeInTheDocument();
    });

    it('shows read status for own read messages', () => {
      const readMessage: ChatMessageType = {
        ...mockMessage,
        is_read: true,
      };

      render(<ChatMessage message={readMessage} isOwn={true} />);

      const readIcon = screen.getByLabelText('Read');
      expect(readIcon).toBeInTheDocument();
    });

    it('shows sent status for own unread messages', () => {
      const unreadMessage: ChatMessageType = {
        ...mockMessage,
        is_read: false,
      };

      render(<ChatMessage message={unreadMessage} isOwn={true} />);

      const sentIcon = screen.getByLabelText('Sent');
      expect(sentIcon).toBeInTheDocument();
    });

    it('does not show status for other users messages', () => {
      render(<ChatMessage message={mockMessage} isOwn={false} />);

      expect(screen.queryByLabelText('Read')).not.toBeInTheDocument();
      expect(screen.queryByLabelText('Sent')).not.toBeInTheDocument();
    });
  });

  describe('long content', () => {
    it('handles multiline content with line breaks', () => {
      const multilineMessage: ChatMessageType = {
        ...mockMessage,
        content: 'Line 1\nLine 2\nLine 3',
      };

      render(<ChatMessage message={multilineMessage} isOwn={false} />);

      expect(screen.getByText(/Line 1/)).toBeInTheDocument();
    });

    it('applies word break for long words', () => {
      const longWordMessage: ChatMessageType = {
        ...mockMessage,
        content: 'verylongwordwithoutspacesverylongwordwithoutspaces',
      };

      const { container } = render(<ChatMessage message={longWordMessage} isOwn={false} />);

      const contentElement = container.querySelector('.break-words');
      expect(contentElement).toBeInTheDocument();
    });
  });
});

describe('TypingIndicator', () => {
  describe('rendering', () => {
    it('does not render when no users are typing', () => {
      const { container } = render(<TypingIndicator usernames={[]} />);

      expect(container.firstChild).toBeNull();
    });

    it('renders single user typing', () => {
      render(<TypingIndicator usernames={['John']} />);

      expect(screen.getByText('John is typing...')).toBeInTheDocument();
    });

    it('renders multiple users typing', () => {
      render(<TypingIndicator usernames={['John', 'Jane']} />);

      expect(screen.getByText('John, Jane are typing...')).toBeInTheDocument();
    });

    it('renders three users typing', () => {
      render(<TypingIndicator usernames={['John', 'Jane', 'Bob']} />);

      expect(screen.getByText('John, Jane, Bob are typing...')).toBeInTheDocument();
    });
  });

  describe('animation', () => {
    it('renders animated dots', () => {
      const { container } = render(<TypingIndicator usernames={['John']} />);

      const dots = container.querySelectorAll('.rounded-full');
      expect(dots.length).toBe(3);
    });
  });
});
