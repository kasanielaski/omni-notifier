import { DiscordNotifier } from './DiscordNotifier';
import type { IDiscordConfig } from './types';

// global instance
export let discord: DiscordNotifier | null = null;

let messagesEnabled = false;
let messagePrefix: string | null = null;

const DEFAULT_CONFIG: Partial<IDiscordConfig> = {
  discordToken: '',
  discordEnableMessages: false,
  discordChatID: '',
};

export function discordInit({
  discordToken,
  discordChatID,
  discordEnableMessages = false,
}: IDiscordConfig = {}): void {
  messagesEnabled = discordEnableMessages;

  const finalConfig: IDiscordConfig = {
    discordToken: discordToken ?? DEFAULT_CONFIG.discordToken,
    discordChatID: discordChatID ?? DEFAULT_CONFIG.discordChatID,
  };

  try {
    discord = new DiscordNotifier(finalConfig, discordEnableMessages);
  } catch (err) {
    discord = null;
  }
}

export function getMessagePrefix(): string | null {
  return messagePrefix;
}

export function isMessagesEnabled(): boolean {
  return messagesEnabled;
}

export { DiscordNotifier } from './DiscordNotifier';
export * from './types';
