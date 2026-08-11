import { PachcaNotifier } from './PachcaNotifier';
import type { IPachcaNotifierConfig } from './types';

// Глобальный инстанс
export let pachca: PachcaNotifier | null = null;

// Флаг включения отправки сообщений
let messagesEnabled = false;

// Префикс для сообщений
let messagePrefix: string | null = null;

// Дефолтные значения токенов
const DEFAULT_CONFIG: Partial<IPachcaNotifierConfig> = {
  accessToken: '',
  userId: 0,
  chatId: 0,
};

/**
 * Параметры инициализации PachcaNotifier
 */
export interface PachcaInitOptions {
  pachcaAccessToken?: string;
  pachcaUserId?: number;
  pachcaChatId?: number;
  pachcaWebhookSecret?: string;
  pachcaEnableMessages?: boolean; // Включить отправку сообщений (по умолчанию false - библиотека молчаливая)
  pachcaPrefix?: string; // Префикс для всех сообщений (добавляется к группе или к сообщению)
}

/**
 * Инициализация PachcaNotifier
 * @param options - опциональные параметры для переопределения дефолтных значений
 */
export function pachcaInit({
  pachcaEnableMessages = false,
  pachcaPrefix,
  pachcaAccessToken,
  pachcaUserId,
  pachcaChatId,
  pachcaWebhookSecret,
}: PachcaInitOptions = {}): void {
  messagesEnabled = pachcaEnableMessages;
  messagePrefix = pachcaPrefix ?? null;

  const finalConfig: IPachcaNotifierConfig = {
    accessToken: pachcaAccessToken ?? DEFAULT_CONFIG.accessToken!,
    userId: pachcaUserId ?? DEFAULT_CONFIG.userId!,
    chatId: pachcaChatId ?? DEFAULT_CONFIG.chatId!,
    webhookSecret: pachcaWebhookSecret,
  };

  try {
    pachca = new PachcaNotifier(finalConfig, pachcaEnableMessages);
  } catch (error) {
    pachca = null;
  }
}

export function getMessagePrefix(): string | null {
  return messagePrefix;
}

export function isMessagesEnabled(): boolean {
  return messagesEnabled;
}

// Экспорт типов и класса
export { PachcaNotifier } from './PachcaNotifier';
export * from './types';
