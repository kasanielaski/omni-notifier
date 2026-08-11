import { TelegramNotifier } from './TelegramNotifier';
import { ITelegramConfig } from './types';

export let telegram: TelegramNotifier | null = null;

let messagesEnabled = false;
let messagePrefix: string | null = null;

const DEFAULT_CONFIG: ITelegramConfig = {
  telegramToken: '',
  telegramEnableMessages: false,
  telegramChatID: 0,
};


export function telegramInit({
  telegramToken,
  telegramChatID,
  telegramEnableMessages = false,
}: ITelegramConfig = {}): void {
  messagesEnabled = telegramEnableMessages;

  const finalConfig: ITelegramConfig = {
    telegramToken: telegramToken ?? DEFAULT_CONFIG.telegramToken,
    telegramChatID: telegramChatID ?? DEFAULT_CONFIG.telegramChatID,
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
