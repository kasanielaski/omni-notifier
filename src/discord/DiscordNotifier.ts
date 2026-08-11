import { IDiscordConfig, DiscordApiErrorBody, DiscordMessage } from './types';

const DISCORD_API_BASE_URL = 'https://discord.com/api/v10';
const REQUEST_TIMEOUT_MS = 10000;

class DiscordApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly body: string,
    public readonly url: string,
  ) {
    super(`Discord API ${status} на ${url}: ${body}`);
    this.name = 'DiscordApiError';
  }
}

export class DiscordNotifier {
  private config: IDiscordConfig;
  private messagesEnabled: boolean;

  constructor(config: IDiscordConfig, messagesEnabled: boolean = false) {
    this.config = config;
    this.messagesEnabled = messagesEnabled;
  }

  setMessagesEnabled(enabled: boolean): void {
    this.messagesEnabled = enabled;
  }

  private async request<T>(path: string, payload?: object): Promise<T> {
    const url = `${DISCORD_API_BASE_URL}${path}`;

    if (!this.config.discordToken) {
      throw new DiscordApiError(0, 'discordToken не задан', url);
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bot ${this.config.discordToken}`,
        'Content-Type': 'application/json',
      },
      body: payload !== undefined ? JSON.stringify(payload) : undefined,
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });

    const text = await response.text();

    if (!response.ok) {
      let parsed: DiscordApiErrorBody | undefined;
      try {
        parsed = text ? (JSON.parse(text) as DiscordApiErrorBody) : undefined;
      } catch {}
      throw new DiscordApiError(response.status, parsed?.message ?? text, url);
    }

    return (text ? JSON.parse(text) : undefined) as T;
  }

  async sendMessage(content: string): Promise<DiscordMessage | undefined> {
    if (!this.messagesEnabled) {
      return;
    }

    const channelId = this.config.discordChatID;

    if (!channelId) {
      throw new DiscordApiError(0, 'discordChatID не задан', 'sendMessage');
    }

    return this.request<DiscordMessage>(`/channels/${channelId}/messages`, {
      content,
    });
  }
}
