import {
  ITelegramConfig,
  TelegramApiResponse,
  TelegramMessage,
} from './types';

const TELEGRAM_API_BASE_URL = 'https://api.telegram.org';
const REQUEST_TIMEOUT_MS = 10000;

export class TelegramApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly body: string,
    public readonly url: string,
  ) {
    super(`Telegram API ${status} на ${url}: ${body}`);
    this.name = 'TelegramApiError';
  }
}

export class TelegramNotifier {
  private config: ITelegramConfig;
  private messagesEnabled: boolean;

  constructor(config: ITelegramConfig, messageEnabled: boolean = false) {
    this.config = config;
    this.messagesEnabled = messageEnabled;
  }

  setMessagesEnabled(enabled: boolean): void {
    this.messagesEnabled = enabled;
  }

  private async request<T>(method: string, payload?: object): Promise<T> {
    const safeUrl = `${TELEGRAM_API_BASE_URL}/bot<token>/${method}`;

    if (!this.config.telegramToken) {
      throw new TelegramApiError(0, 'telegramToken не задан', safeUrl);
    }

    const response = await fetch(
      `${TELEGRAM_API_BASE_URL}/bot${this.config.telegramToken}/${method}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: payload !== undefined ? JSON.stringify(payload) : undefined,
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      },
    );

    const text = await response.text();

    let parsed: TelegramApiResponse<T> | undefined;
    try {
      parsed = text ? (JSON.parse(text) as TelegramApiResponse<T>) : undefined;
    } catch {}

    if (!response.ok || !parsed?.ok) {
      throw new TelegramApiError(
        parsed?.error_code ?? response.status,
        parsed?.description ?? text,
        safeUrl,
      );
    }

    return parsed.result as T;
  }

  async sendMessage(
    text: string,
  ): Promise<TelegramMessage | undefined> {
    if (!this.messagesEnabled) {
      return;
    }

    const chat_id = this.config.telegramChatID;

    if (chat_id === undefined) {
      throw new TelegramApiError(0, 'chatId не задан ни в конфиге, ни в options', 'sendMessage');
    }

    return this.request<TelegramMessage>('sendMessage', {
      chat_id,
      text,
    });
  }
}
