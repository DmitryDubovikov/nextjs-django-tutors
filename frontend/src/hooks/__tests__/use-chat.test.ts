import { useChatStore } from '@/stores/chat-store';
import type { ChatMessage } from '@/stores/chat-store';
import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useChat } from '../use-chat';

// Store all created WebSocket instances
let wsInstances: MockWebSocket[] = [];

// Mock WebSocket
class MockWebSocket {
  public readyState = 0; // CONNECTING
  public onopen: ((event: Event) => void) | null = null;
  public onclose: ((event: CloseEvent) => void) | null = null;
  public onmessage: ((event: MessageEvent) => void) | null = null;
  public onerror: ((event: Event) => void) | null = null;

  static readonly CONNECTING = 0;
  static readonly OPEN = 1;
  static readonly CLOSING = 2;
  static readonly CLOSED = 3;

  public send = vi.fn();
  public close = vi.fn((code?: number) => {
    this.readyState = MockWebSocket.CLOSED;
    const event = new CloseEvent('close', { code: code || 1000 });
    this.onclose?.(event);
  });

  constructor(public url: string) {
    wsInstances.push(this);
  }

  // Helper to simulate connection success
  simulateOpen() {
    this.readyState = MockWebSocket.OPEN;
    this.onopen?.(new Event('open'));
  }

  // Helper to simulate receiving a message
  receiveMessage(data: unknown) {
    const messageEvent = new MessageEvent('message', {
      data: JSON.stringify(data),
    });
    this.onmessage?.(messageEvent);
  }

  // Helper to trigger error
  triggerError() {
    this.onerror?.(new Event('error'));
  }
}

// Helper to get the latest WebSocket instance
function getLatestWs(): MockWebSocket | undefined {
  return wsInstances[wsInstances.length - 1];
}

describe('useChat', () => {
  const mockRoomId = 'room-123';
  const mockToken = 'mock-token';
  const mockCurrentUserId = 'user-123';

  beforeEach(() => {
    // Reset store before each test
    useChatStore.getState().reset();
    // Clear WebSocket instances
    wsInstances = [];
    // Mock WebSocket globally using vi.stubGlobal
    vi.stubGlobal('WebSocket', MockWebSocket);
    // Mock environment variable
    process.env.NEXT_PUBLIC_WS_URL = 'ws://localhost:8000';
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('initialization', () => {
    it('creates WebSocket connection with correct URL', async () => {
      const { result } = renderHook(() =>
        useChat({ roomId: mockRoomId, token: mockToken, currentUserId: mockCurrentUserId })
      );

      const mockWs = getLatestWs();
      act(() => {
        mockWs?.simulateOpen();
      });

      await waitFor(() => {
        expect(result.current.connectionStatus).toBe('connected');
      });
    });

    it('sets connection status to connecting initially', () => {
      renderHook(() =>
        useChat({ roomId: mockRoomId, token: mockToken, currentUserId: mockCurrentUserId })
      );

      const { connectionStatus } = useChatStore.getState();
      expect(connectionStatus).toBe('connecting');
    });

    it('calls onConnect callback when connected', async () => {
      const onConnect = vi.fn();

      renderHook(() =>
        useChat({
          roomId: mockRoomId,
          token: mockToken,
          currentUserId: mockCurrentUserId,
          onConnect,
        })
      );

      const mockWs = getLatestWs();
      act(() => {
        mockWs?.simulateOpen();
      });

      await waitFor(() => {
        expect(onConnect).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('receiving messages', () => {
    it('handles message_history event', async () => {
      const messages: ChatMessage[] = [
        {
          id: '1',
          room_id: mockRoomId,
          sender_id: 'user-1',
          sender_name: 'John',
          content: 'Hello',
          is_read: false,
          created_at: new Date().toISOString(),
        },
      ];

      const { result } = renderHook(() =>
        useChat({ roomId: mockRoomId, token: mockToken, currentUserId: mockCurrentUserId })
      );

      const mockWs = getLatestWs();
      act(() => {
        mockWs?.simulateOpen();
      });

      await waitFor(() => {
        expect(result.current.connectionStatus).toBe('connected');
      });

      act(() => {
        mockWs?.receiveMessage({
          type: 'message_history',
          messages,
        });
      });

      await waitFor(() => {
        expect(result.current.messages).toHaveLength(1);
        expect(result.current.messages[0]?.content).toBe('Hello');
      });
    });

    it('handles incoming message event', async () => {
      const { result } = renderHook(() =>
        useChat({ roomId: mockRoomId, token: mockToken, currentUserId: mockCurrentUserId })
      );

      const mockWs = getLatestWs();
      act(() => {
        mockWs?.simulateOpen();
      });

      await waitFor(() => {
        expect(result.current.connectionStatus).toBe('connected');
      });

      const newMessage: ChatMessage = {
        id: '2',
        room_id: mockRoomId,
        sender_id: 'user-2',
        sender_name: 'Jane',
        content: 'Hi there',
        is_read: false,
        created_at: new Date().toISOString(),
      };

      act(() => {
        mockWs?.receiveMessage({
          type: 'message',
          message: newMessage,
        });
      });

      await waitFor(() => {
        expect(result.current.messages).toHaveLength(1);
        expect(result.current.messages[0]?.content).toBe('Hi there');
      });
    });

    it('handles typing indicator event', async () => {
      const { result } = renderHook(() =>
        useChat({ roomId: mockRoomId, token: mockToken, currentUserId: mockCurrentUserId })
      );

      const mockWs = getLatestWs();
      act(() => {
        mockWs?.simulateOpen();
      });

      await waitFor(() => {
        expect(result.current.connectionStatus).toBe('connected');
      });

      act(() => {
        mockWs?.receiveMessage({
          type: 'typing',
          user_id: 'user-1',
          username: 'John',
          is_typing: true,
        });
      });

      await waitFor(() => {
        expect(result.current.typingUsers).toHaveLength(1);
        expect(result.current.typingUsers[0]?.username).toBe('John');
      });
    });

    it('handles read receipt event', async () => {
      const message: ChatMessage = {
        id: '1',
        room_id: mockRoomId,
        sender_id: 'user-1',
        sender_name: 'John',
        content: 'Message',
        is_read: false,
        created_at: new Date().toISOString(),
      };

      useChatStore.getState().addMessage(message);

      const { result } = renderHook(() =>
        useChat({ roomId: mockRoomId, token: mockToken, currentUserId: mockCurrentUserId })
      );

      const mockWs = getLatestWs();
      act(() => {
        mockWs?.simulateOpen();
      });

      await waitFor(() => {
        expect(result.current.connectionStatus).toBe('connected');
      });

      act(() => {
        mockWs?.receiveMessage({
          type: 'read',
          message_id: '1',
        });
      });

      await waitFor(() => {
        expect(result.current.messages[0]?.is_read).toBe(true);
      });
    });
  });

  describe('sending messages', () => {
    it('sends message through WebSocket', async () => {
      const { result } = renderHook(() =>
        useChat({ roomId: mockRoomId, token: mockToken, currentUserId: mockCurrentUserId })
      );

      const mockWs = getLatestWs();
      act(() => {
        mockWs?.simulateOpen();
      });

      await waitFor(() => {
        expect(result.current.connectionStatus).toBe('connected');
      });

      act(() => {
        result.current.sendMessage('Hello World');
      });

      expect(mockWs?.send).toHaveBeenCalledWith(
        JSON.stringify({ type: 'message', content: 'Hello World' })
      );
    });

    it('adds pending message to store', async () => {
      const { result } = renderHook(() =>
        useChat({ roomId: mockRoomId, token: mockToken, currentUserId: mockCurrentUserId })
      );

      const mockWs = getLatestWs();
      act(() => {
        mockWs?.simulateOpen();
      });

      await waitFor(() => {
        expect(result.current.connectionStatus).toBe('connected');
      });

      act(() => {
        result.current.sendMessage('Test message');
      });

      await waitFor(() => {
        expect(result.current.messages).toHaveLength(1);
        expect(result.current.messages[0]?.content).toBe('Test message');
        expect(result.current.messages[0]?.isPending).toBe(true);
      });
    });

    it('does not send when not connected', async () => {
      const { result } = renderHook(() =>
        useChat({ roomId: mockRoomId, token: mockToken, currentUserId: mockCurrentUserId })
      );

      // Don't let the connection complete
      const mockWs = getLatestWs();

      act(() => {
        result.current.sendMessage('Message');
      });

      expect(mockWs?.send).not.toHaveBeenCalled();
    });
  });

  describe('typing indicator', () => {
    it('sends typing indicator', async () => {
      const { result } = renderHook(() =>
        useChat({ roomId: mockRoomId, token: mockToken, currentUserId: mockCurrentUserId })
      );

      const mockWs = getLatestWs();
      act(() => {
        mockWs?.simulateOpen();
      });

      await waitFor(() => {
        expect(result.current.connectionStatus).toBe('connected');
      });

      act(() => {
        result.current.sendTyping(true);
      });

      expect(mockWs?.send).toHaveBeenCalledWith(
        JSON.stringify({ type: 'typing', is_typing: true })
      );
    });

    it('does not send typing when not connected', async () => {
      const { result } = renderHook(() =>
        useChat({ roomId: mockRoomId, token: mockToken, currentUserId: mockCurrentUserId })
      );

      // Don't let the connection complete
      const mockWs = getLatestWs();

      act(() => {
        result.current.sendTyping(true);
      });

      expect(mockWs?.send).not.toHaveBeenCalled();
    });
  });

  describe('mark as read', () => {
    it('sends read receipt', async () => {
      const { result } = renderHook(() =>
        useChat({ roomId: mockRoomId, token: mockToken, currentUserId: mockCurrentUserId })
      );

      const mockWs = getLatestWs();
      act(() => {
        mockWs?.simulateOpen();
      });

      await waitFor(() => {
        expect(result.current.connectionStatus).toBe('connected');
      });

      act(() => {
        result.current.markAsRead('message-123');
      });

      expect(mockWs?.send).toHaveBeenCalledWith(
        JSON.stringify({ type: 'read', message_id: 'message-123' })
      );
    });

    it('sends batch read receipt', async () => {
      const { result } = renderHook(() =>
        useChat({ roomId: mockRoomId, token: mockToken, currentUserId: mockCurrentUserId })
      );

      const mockWs = getLatestWs();
      act(() => {
        mockWs?.simulateOpen();
      });

      await waitFor(() => {
        expect(result.current.connectionStatus).toBe('connected');
      });

      act(() => {
        result.current.markAsReadBatch(['msg-1', 'msg-2', 'msg-3']);
      });

      expect(mockWs?.send).toHaveBeenCalledWith(
        JSON.stringify({ type: 'read_batch', message_ids: ['msg-1', 'msg-2', 'msg-3'] })
      );
    });

    it('does not send batch read receipt for empty array', async () => {
      const { result } = renderHook(() =>
        useChat({ roomId: mockRoomId, token: mockToken, currentUserId: mockCurrentUserId })
      );

      const mockWs = getLatestWs();
      act(() => {
        mockWs?.simulateOpen();
      });

      await waitFor(() => {
        expect(result.current.connectionStatus).toBe('connected');
      });

      act(() => {
        result.current.markAsReadBatch([]);
      });

      expect(mockWs?.send).not.toHaveBeenCalled();
    });

    it('handles read_batch event from server', async () => {
      const message1: ChatMessage = {
        id: '1',
        room_id: mockRoomId,
        sender_id: 'user-1',
        sender_name: 'John',
        content: 'First',
        is_read: false,
        created_at: new Date().toISOString(),
      };

      const message2: ChatMessage = {
        id: '2',
        room_id: mockRoomId,
        sender_id: 'user-1',
        sender_name: 'John',
        content: 'Second',
        is_read: false,
        created_at: new Date().toISOString(),
      };

      useChatStore.getState().addMessage(message1);
      useChatStore.getState().addMessage(message2);

      const { result } = renderHook(() =>
        useChat({ roomId: mockRoomId, token: mockToken, currentUserId: mockCurrentUserId })
      );

      const mockWs = getLatestWs();
      act(() => {
        mockWs?.simulateOpen();
      });

      await waitFor(() => {
        expect(result.current.connectionStatus).toBe('connected');
      });

      act(() => {
        mockWs?.receiveMessage({
          type: 'read_batch',
          message_ids: ['1', '2'],
        });
      });

      await waitFor(() => {
        expect(result.current.messages[0]?.is_read).toBe(true);
        expect(result.current.messages[1]?.is_read).toBe(true);
      });
    });
  });

  describe('disconnect', () => {
    it('calls onDisconnect callback', async () => {
      const onDisconnect = vi.fn();

      const { result } = renderHook(() =>
        useChat({
          roomId: mockRoomId,
          token: mockToken,
          currentUserId: mockCurrentUserId,
          onDisconnect,
        })
      );

      const mockWs = getLatestWs();
      act(() => {
        mockWs?.simulateOpen();
      });

      await waitFor(() => {
        expect(result.current.connectionStatus).toBe('connected');
      });

      act(() => {
        result.current.disconnect();
      });

      await waitFor(() => {
        expect(onDisconnect).toHaveBeenCalled();
      });
    });

    it('resets store on disconnect', async () => {
      const message: ChatMessage = {
        id: '1',
        room_id: mockRoomId,
        sender_id: 'user-1',
        sender_name: 'John',
        content: 'Message',
        is_read: false,
        created_at: new Date().toISOString(),
      };

      useChatStore.getState().addMessage(message);

      const { result } = renderHook(() =>
        useChat({ roomId: mockRoomId, token: mockToken, currentUserId: mockCurrentUserId })
      );

      const mockWs = getLatestWs();
      act(() => {
        mockWs?.simulateOpen();
      });

      await waitFor(() => {
        expect(result.current.connectionStatus).toBe('connected');
      });

      act(() => {
        result.current.disconnect();
      });

      await waitFor(() => {
        expect(result.current.messages).toHaveLength(0);
        expect(result.current.connectionStatus).toBe('disconnected');
      });
    });

    it('closes WebSocket connection', async () => {
      const { result } = renderHook(() =>
        useChat({ roomId: mockRoomId, token: mockToken, currentUserId: mockCurrentUserId })
      );

      const mockWs = getLatestWs();
      act(() => {
        mockWs?.simulateOpen();
      });

      await waitFor(() => {
        expect(result.current.connectionStatus).toBe('connected');
      });

      act(() => {
        result.current.disconnect();
      });

      expect(mockWs?.close).toHaveBeenCalledWith(1000);
    });
  });

  describe('error handling', () => {
    it('sets error status on connection error', async () => {
      const { result } = renderHook(() =>
        useChat({ roomId: mockRoomId, token: mockToken, currentUserId: mockCurrentUserId })
      );

      const mockWs = getLatestWs();
      act(() => {
        mockWs?.triggerError();
      });

      await waitFor(() => {
        expect(result.current.connectionStatus).toBe('error');
      });
    });

    it('calls onError callback', async () => {
      const onError = vi.fn();

      renderHook(() =>
        useChat({
          roomId: mockRoomId,
          token: mockToken,
          currentUserId: mockCurrentUserId,
          onError,
        })
      );

      const mockWs = getLatestWs();
      act(() => {
        mockWs?.triggerError();
      });

      await waitFor(() => {
        expect(onError).toHaveBeenCalledWith('Connection error');
      });
    });
  });

  describe('cleanup', () => {
    it('disconnects on unmount', async () => {
      const { result, unmount } = renderHook(() =>
        useChat({ roomId: mockRoomId, token: mockToken, currentUserId: mockCurrentUserId })
      );

      const mockWs = getLatestWs();
      act(() => {
        mockWs?.simulateOpen();
      });

      await waitFor(() => {
        expect(result.current.connectionStatus).toBe('connected');
      });

      unmount();

      expect(mockWs?.close).toHaveBeenCalled();
    });
  });
});
