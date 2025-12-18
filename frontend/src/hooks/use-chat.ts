'use client';

import type { ChatMessage } from '@/stores/chat-store';
import { useChatStore } from '@/stores/chat-store';
import { useCallback, useEffect, useRef } from 'react';

interface UseChatOptions {
  roomId: string;
  token: string;
  currentUserId: string;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: string) => void;
}

interface WebSocketMessage {
  type: string;
  message?: ChatMessage;
  messages?: ChatMessage[];
  user_id?: string;
  username?: string;
  is_typing?: boolean;
  message_id?: string;
  message_ids?: string[];
  reader_id?: string;
}

export function useChat({
  roomId,
  token,
  currentUserId,
  onConnect,
  onDisconnect,
  onError,
}: UseChatOptions) {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 5;

  const {
    messages,
    typingUsers,
    connectionStatus,
    addMessage,
    setMessages,
    markMessageRead,
    markMessagesReadBatch,
    setTyping,
    setConnectionStatus,
    setError,
    reset,
  } = useChatStore();

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    setConnectionStatus('connecting');
    setError(null);

    const wsUrl = `${process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000'}/ws/chat/${roomId}/?token=${token}`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      setConnectionStatus('connected');
      reconnectAttemptsRef.current = 0;
      onConnect?.();
    };

    // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: WebSocket message handler needs to handle multiple message types
    ws.onmessage = (event) => {
      const data: WebSocketMessage = JSON.parse(event.data);

      switch (data.type) {
        case 'message_history':
          if (data.messages) {
            setMessages(data.messages);
          }
          break;

        case 'message':
          if (data.message) {
            addMessage(data.message);
          }
          break;

        case 'typing':
          if (data.user_id && data.username !== undefined) {
            setTyping(data.user_id, data.username, data.is_typing ?? false);
          }
          break;

        case 'read':
          if (data.message_id) {
            markMessageRead(data.message_id);
          }
          break;

        case 'read_batch':
          if (data.message_ids) {
            markMessagesReadBatch(data.message_ids);
          }
          break;
      }
    };

    ws.onerror = () => {
      setConnectionStatus('error');
      setError('Connection error');
      onError?.('Connection error');
    };

    ws.onclose = (event) => {
      setConnectionStatus('disconnected');
      onDisconnect?.();

      if (event.code !== 1000 && event.code !== 4001 && event.code !== 4003) {
        if (reconnectAttemptsRef.current < maxReconnectAttempts) {
          const delay = Math.min(1000 * 2 ** reconnectAttemptsRef.current, 30000);
          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectAttemptsRef.current++;
            connect();
          }, delay);
        }
      }
    };
  }, [
    roomId,
    token,
    onConnect,
    onDisconnect,
    onError,
    setConnectionStatus,
    setError,
    setMessages,
    addMessage,
    setTyping,
    markMessageRead,
    markMessagesReadBatch,
  ]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    if (wsRef.current) {
      wsRef.current.close(1000);
      wsRef.current = null;
    }
    reset();
  }, [reset]);

  const sendMessage = useCallback(
    (content: string) => {
      if (wsRef.current?.readyState !== WebSocket.OPEN) {
        return;
      }

      const tempId = `temp-${Date.now()}`;
      const pendingMessage: ChatMessage = {
        id: tempId,
        room_id: roomId,
        sender_id: currentUserId,
        sender_name: 'Me',
        content,
        is_read: false,
        created_at: new Date().toISOString(),
        isPending: true,
      };

      addMessage(pendingMessage);

      wsRef.current.send(JSON.stringify({ type: 'message', content }));
    },
    [roomId, currentUserId, addMessage]
  );

  const sendTyping = useCallback((isTyping: boolean) => {
    if (wsRef.current?.readyState !== WebSocket.OPEN) {
      return;
    }
    wsRef.current.send(JSON.stringify({ type: 'typing', is_typing: isTyping }));
  }, []);

  const markAsRead = useCallback((messageId: string) => {
    if (wsRef.current?.readyState !== WebSocket.OPEN) {
      return;
    }
    wsRef.current.send(JSON.stringify({ type: 'read', message_id: messageId }));
  }, []);

  const markAsReadBatch = useCallback((messageIds: string[]) => {
    if (wsRef.current?.readyState !== WebSocket.OPEN || messageIds.length === 0) {
      return;
    }
    wsRef.current.send(JSON.stringify({ type: 'read_batch', message_ids: messageIds }));
  }, []);

  // Use refs to avoid dependency issues with connect/disconnect
  const connectRef = useRef(connect);
  const disconnectRef = useRef(disconnect);
  connectRef.current = connect;
  disconnectRef.current = disconnect;

  useEffect(() => {
    if (token && roomId) {
      connectRef.current();
    }

    return () => {
      disconnectRef.current();
    };
  }, [token, roomId]);

  return {
    messages,
    typingUsers: Array.from(typingUsers.values()),
    connectionStatus,
    sendMessage,
    sendTyping,
    markAsRead,
    markAsReadBatch,
    reconnect: connect,
    disconnect,
  };
}
