export interface ITelegramConfig {
  telegramToken?: string;
  telegramEnableMessages?: boolean;
  telegramChatID?: number;
}

export interface TelegramApiResponse<T> {
  ok: boolean;
  result?: T;
  error_code?: number;
  description?: string;
}

type ChatT = { id: number; type: string; title: string; username: string; };
export interface TelegramMessage {
  message_id: number;
  sender_chat: ChatT;
  chat: ChatT;
  date: number;
  text?: string;
}
