import { beforeEach, describe, expect, it } from 'vitest';
import { useChatStore } from '../chat-store';
import type { ChatMessage } from '../chat-store';

describe('useChatStore', () => {
  beforeEach(() => {
    useChatStore.getState().reset();
  });

  describe('initial state', () => {
    it('starts with empty messages', () => {
      const { messages } = useChatStore.getState();

      expect(messages).toEqual([]);
    });

    it('starts with disconnected connection status', () => {
      const { connectionStatus } = useChatStore.getState();

      expect(connectionStatus).toBe('disconnected');
    });

    it('starts with empty typing users', () => {
      const { typingUsers } = useChatStore.getState();

      expect(typingUsers.size).toBe(0);
    });

    it('starts with null error', () => {
      const { error } = useChatStore.getState();

      expect(error).toBeNull();
    });
  });

  describe('addMessage', () => {
    it('adds a message to the store', () => {
      const message: ChatMessage = {
        id: '1',
        room_id: 'room-1',
        sender_id: 'user-1',
        sender_name: 'John',
        content: 'Hello',
        is_read: false,
        created_at: new Date().toISOString(),
      };

      useChatStore.getState().addMessage(message);

      const { messages } = useChatStore.getState();
      expect(messages).toHaveLength(1);
      expect(messages[0]).toEqual(message);
    });

    it('appends message to existing messages', () => {
      const message1: ChatMessage = {
        id: '1',
        room_id: 'room-1',
        sender_id: 'user-1',
        sender_name: 'John',
        content: 'First',
        is_read: false,
        created_at: new Date().toISOString(),
      };

      const message2: ChatMessage = {
        id: '2',
        room_id: 'room-1',
        sender_id: 'user-2',
        sender_name: 'Jane',
        content: 'Second',
        is_read: false,
        created_at: new Date().toISOString(),
      };

      useChatStore.getState().addMessage(message1);
      useChatStore.getState().addMessage(message2);

      const { messages } = useChatStore.getState();
      expect(messages).toHaveLength(2);
      expect(messages[0]?.id).toBe('1');
      expect(messages[1]?.id).toBe('2');
    });
  });

  describe('setMessages', () => {
    it('replaces all messages', () => {
      const initialMessages: ChatMessage[] = [
        {
          id: '1',
          room_id: 'room-1',
          sender_id: 'user-1',
          sender_name: 'John',
          content: 'Old message',
          is_read: false,
          created_at: new Date().toISOString(),
        },
      ];

      const newMessages: ChatMessage[] = [
        {
          id: '2',
          room_id: 'room-1',
          sender_id: 'user-2',
          sender_name: 'Jane',
          content: 'New message 1',
          is_read: false,
          created_at: new Date().toISOString(),
        },
        {
          id: '3',
          room_id: 'room-1',
          sender_id: 'user-3',
          sender_name: 'Bob',
          content: 'New message 2',
          is_read: false,
          created_at: new Date().toISOString(),
        },
      ];

      useChatStore.getState().setMessages(initialMessages);
      useChatStore.getState().setMessages(newMessages);

      const { messages } = useChatStore.getState();
      expect(messages).toEqual(newMessages);
      expect(messages).toHaveLength(2);
    });
  });

  describe('updateMessage', () => {
    it('updates a specific message by id', () => {
      const message: ChatMessage = {
        id: '1',
        room_id: 'room-1',
        sender_id: 'user-1',
        sender_name: 'John',
        content: 'Original',
        is_read: false,
        created_at: new Date().toISOString(),
      };

      useChatStore.getState().addMessage(message);
      useChatStore.getState().updateMessage('1', { content: 'Updated' });

      const { messages } = useChatStore.getState();
      expect(messages[0]?.content).toBe('Updated');
    });

    it('updates isPending flag', () => {
      const message: ChatMessage = {
        id: '1',
        room_id: 'room-1',
        sender_id: 'user-1',
        sender_name: 'John',
        content: 'Message',
        is_read: false,
        created_at: new Date().toISOString(),
        isPending: true,
      };

      useChatStore.getState().addMessage(message);
      useChatStore.getState().updateMessage('1', { isPending: false });

      const { messages } = useChatStore.getState();
      expect(messages[0]?.isPending).toBe(false);
    });

    it('does not update other messages', () => {
      const message1: ChatMessage = {
        id: '1',
        room_id: 'room-1',
        sender_id: 'user-1',
        sender_name: 'John',
        content: 'First',
        is_read: false,
        created_at: new Date().toISOString(),
      };

      const message2: ChatMessage = {
        id: '2',
        room_id: 'room-1',
        sender_id: 'user-2',
        sender_name: 'Jane',
        content: 'Second',
        is_read: false,
        created_at: new Date().toISOString(),
      };

      useChatStore.getState().addMessage(message1);
      useChatStore.getState().addMessage(message2);
      useChatStore.getState().updateMessage('1', { content: 'Updated' });

      const { messages } = useChatStore.getState();
      expect(messages[0]?.content).toBe('Updated');
      expect(messages[1]?.content).toBe('Second');
    });
  });

  describe('markMessageRead', () => {
    it('marks a message as read', () => {
      const message: ChatMessage = {
        id: '1',
        room_id: 'room-1',
        sender_id: 'user-1',
        sender_name: 'John',
        content: 'Message',
        is_read: false,
        created_at: new Date().toISOString(),
      };

      useChatStore.getState().addMessage(message);
      useChatStore.getState().markMessageRead('1');

      const { messages } = useChatStore.getState();
      expect(messages[0]?.is_read).toBe(true);
    });

    it('does not affect other messages', () => {
      const message1: ChatMessage = {
        id: '1',
        room_id: 'room-1',
        sender_id: 'user-1',
        sender_name: 'John',
        content: 'First',
        is_read: false,
        created_at: new Date().toISOString(),
      };

      const message2: ChatMessage = {
        id: '2',
        room_id: 'room-1',
        sender_id: 'user-2',
        sender_name: 'Jane',
        content: 'Second',
        is_read: false,
        created_at: new Date().toISOString(),
      };

      useChatStore.getState().addMessage(message1);
      useChatStore.getState().addMessage(message2);
      useChatStore.getState().markMessageRead('1');

      const { messages } = useChatStore.getState();
      expect(messages[0]?.is_read).toBe(true);
      expect(messages[1]?.is_read).toBe(false);
    });
  });

  describe('markMessagesReadBatch', () => {
    it('marks multiple messages as read', () => {
      const message1: ChatMessage = {
        id: '1',
        room_id: 'room-1',
        sender_id: 'user-1',
        sender_name: 'John',
        content: 'First',
        is_read: false,
        created_at: new Date().toISOString(),
      };

      const message2: ChatMessage = {
        id: '2',
        room_id: 'room-1',
        sender_id: 'user-2',
        sender_name: 'Jane',
        content: 'Second',
        is_read: false,
        created_at: new Date().toISOString(),
      };

      const message3: ChatMessage = {
        id: '3',
        room_id: 'room-1',
        sender_id: 'user-3',
        sender_name: 'Bob',
        content: 'Third',
        is_read: false,
        created_at: new Date().toISOString(),
      };

      useChatStore.getState().addMessage(message1);
      useChatStore.getState().addMessage(message2);
      useChatStore.getState().addMessage(message3);
      useChatStore.getState().markMessagesReadBatch(['1', '3']);

      const { messages } = useChatStore.getState();
      expect(messages[0]?.is_read).toBe(true);
      expect(messages[1]?.is_read).toBe(false);
      expect(messages[2]?.is_read).toBe(true);
    });

    it('handles empty array', () => {
      const message: ChatMessage = {
        id: '1',
        room_id: 'room-1',
        sender_id: 'user-1',
        sender_name: 'John',
        content: 'Message',
        is_read: false,
        created_at: new Date().toISOString(),
      };

      useChatStore.getState().addMessage(message);
      useChatStore.getState().markMessagesReadBatch([]);

      const { messages } = useChatStore.getState();
      expect(messages[0]?.is_read).toBe(false);
    });
  });

  describe('setTyping', () => {
    it('adds a typing user', () => {
      useChatStore.getState().setTyping('user-1', 'John', true);

      const { typingUsers } = useChatStore.getState();
      expect(typingUsers.size).toBe(1);
      expect(typingUsers.get('user-1')).toEqual({
        user_id: 'user-1',
        username: 'John',
      });
    });

    it('removes a typing user when isTyping is false', () => {
      useChatStore.getState().setTyping('user-1', 'John', true);
      useChatStore.getState().setTyping('user-1', 'John', false);

      const { typingUsers } = useChatStore.getState();
      expect(typingUsers.size).toBe(0);
    });

    it('handles multiple typing users', () => {
      useChatStore.getState().setTyping('user-1', 'John', true);
      useChatStore.getState().setTyping('user-2', 'Jane', true);

      const { typingUsers } = useChatStore.getState();
      expect(typingUsers.size).toBe(2);
      expect(typingUsers.has('user-1')).toBe(true);
      expect(typingUsers.has('user-2')).toBe(true);
    });

    it('removes one user without affecting others', () => {
      useChatStore.getState().setTyping('user-1', 'John', true);
      useChatStore.getState().setTyping('user-2', 'Jane', true);
      useChatStore.getState().setTyping('user-1', 'John', false);

      const { typingUsers } = useChatStore.getState();
      expect(typingUsers.size).toBe(1);
      expect(typingUsers.has('user-1')).toBe(false);
      expect(typingUsers.has('user-2')).toBe(true);
    });
  });

  describe('setConnectionStatus', () => {
    it('sets connection status to connecting', () => {
      useChatStore.getState().setConnectionStatus('connecting');

      const { connectionStatus } = useChatStore.getState();
      expect(connectionStatus).toBe('connecting');
    });

    it('sets connection status to connected', () => {
      useChatStore.getState().setConnectionStatus('connected');

      const { connectionStatus } = useChatStore.getState();
      expect(connectionStatus).toBe('connected');
    });

    it('sets connection status to disconnected', () => {
      useChatStore.getState().setConnectionStatus('disconnected');

      const { connectionStatus } = useChatStore.getState();
      expect(connectionStatus).toBe('disconnected');
    });

    it('sets connection status to error', () => {
      useChatStore.getState().setConnectionStatus('error');

      const { connectionStatus } = useChatStore.getState();
      expect(connectionStatus).toBe('error');
    });
  });

  describe('setError', () => {
    it('sets error message', () => {
      useChatStore.getState().setError('Connection failed');

      const { error } = useChatStore.getState();
      expect(error).toBe('Connection failed');
    });

    it('clears error when set to null', () => {
      useChatStore.getState().setError('Error');
      useChatStore.getState().setError(null);

      const { error } = useChatStore.getState();
      expect(error).toBeNull();
    });
  });

  describe('reset', () => {
    it('resets all state to initial values', () => {
      const message: ChatMessage = {
        id: '1',
        room_id: 'room-1',
        sender_id: 'user-1',
        sender_name: 'John',
        content: 'Message',
        is_read: false,
        created_at: new Date().toISOString(),
      };

      useChatStore.getState().addMessage(message);
      useChatStore.getState().setTyping('user-1', 'John', true);
      useChatStore.getState().setConnectionStatus('connected');
      useChatStore.getState().setError('Some error');

      useChatStore.getState().reset();

      const state = useChatStore.getState();
      expect(state.messages).toEqual([]);
      expect(state.typingUsers.size).toBe(0);
      expect(state.connectionStatus).toBe('disconnected');
      expect(state.error).toBeNull();
    });
  });
});
