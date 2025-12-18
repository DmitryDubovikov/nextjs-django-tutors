import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ChatInput } from '../chat-input';

describe('ChatInput', () => {
  const mockOnSend = vi.fn();
  const mockOnTyping = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('renders textarea with placeholder', () => {
      render(<ChatInput onSend={mockOnSend} onTyping={mockOnTyping} />);

      expect(screen.getByPlaceholderText('Type a message...')).toBeInTheDocument();
    });

    it('renders send button', () => {
      render(<ChatInput onSend={mockOnSend} onTyping={mockOnTyping} />);

      expect(screen.getByRole('button', { name: /send message/i })).toBeInTheDocument();
    });

    it('send button is disabled initially', () => {
      render(<ChatInput onSend={mockOnSend} onTyping={mockOnTyping} />);

      const sendButton = screen.getByRole('button', {
        name: /send message/i,
      });
      expect(sendButton).toBeDisabled();
    });
  });

  describe('typing', () => {
    it('updates value when user types', async () => {
      const user = userEvent.setup();
      render(<ChatInput onSend={mockOnSend} onTyping={mockOnTyping} />);

      const textarea = screen.getByPlaceholderText('Type a message...');
      await user.type(textarea, 'Hello');

      expect(textarea).toHaveValue('Hello');
    });

    it('calls onTyping(true) when user starts typing', async () => {
      const user = userEvent.setup();
      render(<ChatInput onSend={mockOnSend} onTyping={mockOnTyping} />);

      const textarea = screen.getByPlaceholderText('Type a message...');
      await user.type(textarea, 'H');

      expect(mockOnTyping).toHaveBeenCalledWith(true);
    });

    it('enables send button when text is entered', async () => {
      const user = userEvent.setup();
      render(<ChatInput onSend={mockOnSend} onTyping={mockOnTyping} />);

      const textarea = screen.getByPlaceholderText('Type a message...');
      await user.type(textarea, 'Hello');

      const sendButton = screen.getByRole('button', {
        name: /send message/i,
      });
      expect(sendButton).not.toBeDisabled();
    });

    it('keeps send button disabled for whitespace only', async () => {
      const user = userEvent.setup();
      render(<ChatInput onSend={mockOnSend} onTyping={mockOnTyping} />);

      const textarea = screen.getByPlaceholderText('Type a message...');
      await user.type(textarea, '   ');

      const sendButton = screen.getByRole('button', {
        name: /send message/i,
      });
      expect(sendButton).toBeDisabled();
    });
  });

  describe('sending messages', () => {
    it('calls onSend with trimmed content on submit', async () => {
      const user = userEvent.setup();
      render(<ChatInput onSend={mockOnSend} onTyping={mockOnTyping} />);

      const textarea = screen.getByPlaceholderText('Type a message...');
      await user.type(textarea, '  Hello World  ');

      const sendButton = screen.getByRole('button', {
        name: /send message/i,
      });
      await user.click(sendButton);

      expect(mockOnSend).toHaveBeenCalledWith('Hello World');
    });

    it('clears input after sending', async () => {
      const user = userEvent.setup();
      render(<ChatInput onSend={mockOnSend} onTyping={mockOnTyping} />);

      const textarea = screen.getByPlaceholderText('Type a message...');
      await user.type(textarea, 'Hello');

      const sendButton = screen.getByRole('button', {
        name: /send message/i,
      });
      await user.click(sendButton);

      expect(textarea).toHaveValue('');
    });

    it('calls onTyping(false) after sending', async () => {
      const user = userEvent.setup();
      render(<ChatInput onSend={mockOnSend} onTyping={mockOnTyping} />);

      const textarea = screen.getByPlaceholderText('Type a message...');
      await user.type(textarea, 'Hello');

      vi.clearAllMocks(); // Clear previous typing calls

      const sendButton = screen.getByRole('button', {
        name: /send message/i,
      });
      await user.click(sendButton);

      expect(mockOnTyping).toHaveBeenCalledWith(false);
    });

    it('does not send empty message', async () => {
      const user = userEvent.setup();
      render(<ChatInput onSend={mockOnSend} onTyping={mockOnTyping} />);

      const sendButton = screen.getByRole('button', {
        name: /send message/i,
      });
      await user.click(sendButton);

      expect(mockOnSend).not.toHaveBeenCalled();
    });

    it('does not send whitespace-only message', async () => {
      const user = userEvent.setup();
      render(<ChatInput onSend={mockOnSend} onTyping={mockOnTyping} />);

      const textarea = screen.getByPlaceholderText('Type a message...');
      await user.type(textarea, '   ');

      const form = textarea.closest('form');
      if (form) {
        form.dispatchEvent(new Event('submit', { cancelable: true }));
      }

      expect(mockOnSend).not.toHaveBeenCalled();
    });
  });

  describe('keyboard shortcuts', () => {
    it('sends message on Enter key', async () => {
      const user = userEvent.setup();
      render(<ChatInput onSend={mockOnSend} onTyping={mockOnTyping} />);

      const textarea = screen.getByPlaceholderText('Type a message...');
      await user.type(textarea, 'Hello');
      await user.keyboard('{Enter}');

      expect(mockOnSend).toHaveBeenCalledWith('Hello');
    });

    it('does not send on Shift+Enter', async () => {
      const user = userEvent.setup();
      render(<ChatInput onSend={mockOnSend} onTyping={mockOnTyping} />);

      const textarea = screen.getByPlaceholderText('Type a message...');
      await user.type(textarea, 'Hello');
      await user.keyboard('{Shift>}{Enter}{/Shift}');

      expect(mockOnSend).not.toHaveBeenCalled();
      // Should add newline instead
      expect(textarea).toHaveValue('Hello\n');
    });
  });

  describe('disabled state', () => {
    it('disables textarea when disabled prop is true', () => {
      render(<ChatInput onSend={mockOnSend} onTyping={mockOnTyping} disabled />);

      const textarea = screen.getByPlaceholderText('Type a message...');
      expect(textarea).toBeDisabled();
    });

    it('disables send button when disabled prop is true', () => {
      render(<ChatInput onSend={mockOnSend} onTyping={mockOnTyping} disabled />);

      const sendButton = screen.getByRole('button', {
        name: /send message/i,
      });
      expect(sendButton).toBeDisabled();
    });

    it('does not send when disabled', async () => {
      const user = userEvent.setup();
      render(<ChatInput onSend={mockOnSend} onTyping={mockOnTyping} disabled />);

      const textarea = screen.getByPlaceholderText('Type a message...');
      await user.type(textarea, 'Hello');

      const sendButton = screen.getByRole('button', {
        name: /send message/i,
      });
      await user.click(sendButton);

      expect(mockOnSend).not.toHaveBeenCalled();
    });
  });

  describe('multiline support', () => {
    it('supports multiline input', async () => {
      const user = userEvent.setup();
      render(<ChatInput onSend={mockOnSend} onTyping={mockOnTyping} />);

      const textarea = screen.getByPlaceholderText('Type a message...');
      await user.type(textarea, 'Line 1{Shift>}{Enter}{/Shift}Line 2');

      expect(textarea).toHaveValue('Line 1\nLine 2');
    });

    it('sends multiline message', async () => {
      const user = userEvent.setup();
      render(<ChatInput onSend={mockOnSend} onTyping={mockOnTyping} />);

      const textarea = screen.getByPlaceholderText('Type a message...');
      await user.type(textarea, 'Line 1{Shift>}{Enter}{/Shift}Line 2');
      await user.keyboard('{Enter}');

      expect(mockOnSend).toHaveBeenCalledWith('Line 1\nLine 2');
    });
  });
});
