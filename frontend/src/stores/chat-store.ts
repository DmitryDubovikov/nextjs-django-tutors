import { create } from 'zustand';

export interface ChatMessage {
  id: string;
  room_id: string;
  sender_id: string;
  sender_name: string;
  content: string;
  is_read: boolean;
  created_at: string;
  isPending?: boolean;
}

interface TypingUser {
  user_id: string;
  username: string;
}

interface ChatState {
  messages: ChatMessage[];
  typingUsers: Map<string, TypingUser>;
  connectionStatus: 'connecting' | 'connected' | 'disconnected' | 'error';
  error: string | null;
}

interface ChatActions {
  addMessage: (message: ChatMessage) => void;
  setMessages: (messages: ChatMessage[]) => void;
  updateMessage: (id: string, updates: Partial<ChatMessage>) => void;
  markMessageRead: (messageId: string) => void;
  markMessagesReadBatch: (messageIds: string[]) => void;
  setTyping: (userId: string, username: string, isTyping: boolean) => void;
  setConnectionStatus: (status: ChatState['connectionStatus']) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

const initialState: ChatState = {
  messages: [],
  typingUsers: new Map(),
  connectionStatus: 'disconnected',
  error: null,
};

export const useChatStore = create<ChatState & ChatActions>((set) => ({
  ...initialState,

  addMessage: (message) =>
    set((state) => {
      // If this is a server message (not pending), try to replace a matching pending message
      if (!message.isPending) {
        const pendingIndex = state.messages.findIndex(
          (msg) =>
            msg.isPending && msg.content === message.content && msg.sender_id === message.sender_id
        );
        if (pendingIndex !== -1) {
          // Replace pending message with server-confirmed message
          const newMessages = [...state.messages];
          newMessages[pendingIndex] = message;
          return { messages: newMessages };
        }
      }
      // Check for duplicates by id
      if (state.messages.some((msg) => msg.id === message.id)) {
        return state;
      }
      return { messages: [...state.messages, message] };
    }),

  setMessages: (messages) =>
    set(() => ({
      messages,
    })),

  updateMessage: (id, updates) =>
    set((state) => ({
      messages: state.messages.map((msg) => (msg.id === id ? { ...msg, ...updates } : msg)),
    })),

  markMessageRead: (messageId) =>
    set((state) => ({
      messages: state.messages.map((msg) =>
        msg.id === messageId ? { ...msg, is_read: true } : msg
      ),
    })),

  markMessagesReadBatch: (messageIds) =>
    set((state) => {
      const idSet = new Set(messageIds);
      return {
        messages: state.messages.map((msg) =>
          idSet.has(msg.id) ? { ...msg, is_read: true } : msg
        ),
      };
    }),

  setTyping: (userId, username, isTyping) =>
    set((state) => {
      const newTypingUsers = new Map(state.typingUsers);
      if (isTyping) {
        newTypingUsers.set(userId, { user_id: userId, username });
      } else {
        newTypingUsers.delete(userId);
      }
      return { typingUsers: newTypingUsers };
    }),

  setConnectionStatus: (connectionStatus) => set(() => ({ connectionStatus })),

  setError: (error) => set(() => ({ error })),

  reset: () => set(() => initialState),
}));
