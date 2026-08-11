export interface IPachcaNotifierConfig {
  accessToken: string;
  userId: number;
  chatId: number;
  webhookSecret?: string;
}

export interface SendMessageOptions {
  entityType?: 'user' | 'discussion';
  entityId?: number;
  parentMessageId?: number;
  groupName?: string; // Название группы для группировки сообщений в треды
  chatId?: number; // Опциональный chatId (по умолчанию используется из конфига)
}

export interface WebhookMessage {
  event: string;
  type: string;
  id: number;
  content: string;
  user_id: number;
  chat_id: number;
  entity_type: string;
  entity_id: number;
  parent_message_id: number | null;
  webhook_timestamp: number;
  created_at: string;
}

export interface PachcaApiMessageRequest {
  message: {
    entity_type: 'user' | 'discussion' | 'thread';
    entity_id: number;
    content: string;
    parent_message_id?: number;
  };
}

export interface PachcaApiMessageResponse {
  data: {
    id: number;
    entity_type: string;
    entity_id: number;
    chat_id: number;
    content: string;
    user_id: number;
    created_at: string;
    url: string;
  };
}

export interface GetMessagesOptions {
  per?: number;
  page?: number;
}

export interface PachcaMessage {
  id: number;
  entity_type: string;
  entity_id: number;
  chat_id: number;
  content: string;
  user_id: number;
  created_at: string;
  url: string;
  files?: any[];
  buttons?: any[];
  thread?: {
    id: number;
    chat_id: number;
  } | null;
  parent_message_id?: number | null;
}

export interface PachcaApiMessagesResponse {
  data: PachcaMessage[];
}

export interface AddReactionRequest {
  code: string;
}

export interface PachcaThread {
  id: number;
  chat_id: number;
  message_id?: number;
  message_chat_id?: number;
  updated_at?: string;
}

export interface CreateThreadResponse {
  data: PachcaThread;
}
