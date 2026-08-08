import { PachkaNotifier } from './PachkaNotifier';
import type { PachkaNotifierConfig } from './types';

// Глобальный инстанс
export let pachka: PachkaNotifier | null = null;

// Флаг включения отправки сообщений
let messagesEnabled = false;

// Префикс для сообщений
let messagePrefix: string | null = null;

// Дефолтные значения токенов
const DEFAULT_CONFIG: Partial<PachkaNotifierConfig> = {
  accessToken: '',
  userId: 0,
  chatId: 0,
};

/**
 * Параметры инициализации PachkaNotifier
 */
export interface PachkaInitOptions {
  pachkaAccessToken?: string;
  pachkaUserId?: number;
  pachkaChatId?: number;
  pachkaWebhookSecret?: string;
  pachkaEnableMessages?: boolean; // Включить отправку сообщений (по умолчанию false - библиотека молчаливая)
  pachkaPrefix?: string; // Префикс для всех сообщений (добавляется к группе или к сообщению)
}

/**
 * Инициализация PachkaNotifier
 * @param options - опциональные параметры для переопределения дефолтных значений
 */
export function pachkaInit({
  pachkaEnableMessages = false,
  pachkaPrefix,
  pachkaAccessToken,
  pachkaUserId,
  pachkaChatId,
  pachkaWebhookSecret,
}: PachkaInitOptions = {}): void {
  messagesEnabled = pachkaEnableMessages;
  messagePrefix = pachkaPrefix ?? null;

  const finalConfig: PachkaNotifierConfig = {
    accessToken: pachkaAccessToken ?? DEFAULT_CONFIG.accessToken!,
    userId: pachkaUserId ?? DEFAULT_CONFIG.userId!,
    chatId: pachkaChatId ?? DEFAULT_CONFIG.chatId!,
    webhookSecret: pachkaWebhookSecret,
  };

  try {
    pachka = new PachkaNotifier(finalConfig, pachkaEnableMessages);
  } catch (error) {
    pachka = null;
  }
}

export function getMessagePrefix(): string | null {
  return messagePrefix;
}

export function isMessagesEnabled(): boolean {
  return messagesEnabled;
}

// Экспорт типов и класса
export { PachkaNotifier } from './PachkaNotifier';
export * from './types';
