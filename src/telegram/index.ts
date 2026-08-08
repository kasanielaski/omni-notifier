import { TelegramNotifier } from './TelegramNotifier';

export let telegram: TelegramNotifier | null = null;

// Флаг включения отправки сообщений
let messagesEnabled = false;

// Префикс для сообщений
let messagePrefix: string | null = null;

const DEFAULT_CONFIG: ITelegramConfig = {
  telegramToken: '',
  telegramEnableMessages: false,
  telegramPrefix: '',
};

export interface ITelegramConfig {
  telegramToken?: string;
  telegramEnableMessages?: boolean;
  telegramPrefix?: string;
}

export function telegramInit({
  telegramToken,
  telegramPrefix,
  telegramEnableMessages = false,
}: ITelegramConfig = {}): void {
  messagesEnabled = telegramEnableMessages;
  messagePrefix = telegramPrefix ?? null;

  const finalConfig: ITelegramConfig = {
    telegramToken: telegramToken ?? DEFAULT_CONFIG.telegramToken,
    telegramPrefix: telegramPrefix ?? DEFAULT_CONFIG.telegramPrefix,
  };

  try {
    telegram = new TelegramNotifier(finalConfig, telegramEnableMessages);
  } catch (err) {
    telegram = null;
  }
}

export function getMessagePrefix(): string | null {
  return messagePrefix;
}

export function isMessagesEnabled(): boolean {
  return messagesEnabled;
}

export { TelegramNotifier } from './TelegramNotifier';
export * from './types';
