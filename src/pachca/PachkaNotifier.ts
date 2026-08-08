import * as crypto from 'crypto';

import { getMessagePrefix } from './index';
import {
  PachkaNotifierConfig,
  SendMessageOptions,
  WebhookMessage,
  PachkaApiMessageRequest,
  GetMessagesOptions,
  PachkaMessage,
  PachkaApiMessagesResponse,
  AddReactionRequest,
  CreateThreadResponse,
  PachkaThread,
} from './types';

const PACHKA_API_BASE_URL = 'https://api.pachca.com/api/shared/v1';
const REQUEST_TIMEOUT_MS = 10000;

/**
 * Ошибка HTTP-запроса к API Пачки
 */
export class PachkaApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly body: string,
    public readonly url: string,
  ) {
    super(`Pachca API ${status} на ${url}: ${body}`);
    this.name = 'PachkaApiError';
  }
}

export class PachkaNotifier {
  private config: PachkaNotifierConfig;
  private messagesEnabled: boolean;

  constructor(config: PachkaNotifierConfig, messagesEnabled: boolean = false) {
    this.config = config;
    this.messagesEnabled = messagesEnabled;
  }

  /**
   * Установить флаг включения отправки сообщений
   */
  setMessagesEnabled(enabled: boolean): void {
    this.messagesEnabled = enabled;
  }

  /**
   * Общий HTTP-хелпер над нативным fetch.
   * Бросает PachkaApiError на не-2xx, TimeoutError при превышении таймаута.
   */
  private async request<T>(
    path: string,
    init: {
      method: 'GET' | 'POST';
      json?: unknown;
      query?: Record<string, string | number>;
    } = { method: 'GET' },
  ): Promise<T> {
    const url = new URL(`${PACHKA_API_BASE_URL}${path}`);
    if (init.query) {
      for (const [key, value] of Object.entries(init.query)) {
        url.searchParams.set(key, String(value));
      }
    }

    const response = await fetch(url, {
      method: init.method,
      headers: {
        Authorization: `Bearer ${this.config.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: init.json !== undefined ? JSON.stringify(init.json) : undefined,
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      throw new PachkaApiError(response.status, body, url.toString());
    }

    // 204 и пустое тело — валидный ответ для методов без полезной нагрузки
    const text = await response.text();
    return (text ? JSON.parse(text) : undefined) as T;
  }

  /**
   * Получение списка сообщений из чата
   */
  async getMessages(
    chatId: number,
    options?: GetMessagesOptions,
  ): Promise<PachkaMessage[]> {
    const per = options?.per || 50;
    const page = options?.page || 1;

    const response = await this.request<PachkaApiMessagesResponse>(
      '/messages',
      {
        method: 'GET',
        query: { chat_id: chatId, per, page },
      },
    );

    return response?.data || [];
  }

  /**
   * Добавление реакции к сообщению
   */
  async addReaction(messageId: number, emojiCode: string): Promise<void> {
    const requestBody: AddReactionRequest = {
      code: emojiCode,
    };

    await this.request<void>(`/messages/${messageId}/reactions`, {
      method: 'POST',
      json: requestBody,
    });
  }

  /**
   * Создание треда к сообщению
   * Если тред уже существует, API вернет информацию о существующем треде
   */
  async createThread(messageId: number): Promise<PachkaThread> {
    const response = await this.request<CreateThreadResponse>(
      `/messages/${messageId}/thread`,
      {
        method: 'POST',
      },
    );

    return response.data;
  }

  /**
   * Отправка сообщения через API Пачки с проверкой дубликатов по названию группы
   * Метод не бросает исключения и имеет таймаут 1 секунда
   *
   * @overload
   * @param groupName - название группы для группировки сообщений
   * @param content - текст сообщения
   * @param options - дополнительные опции (опционально)
   */
  async sendMessage(
    groupName: string,
    content: string,
    options?: SendMessageOptions,
  ): Promise<void>;
  /**
   * @overload
   * @param content - текст сообщения (без группировки)
   * @param options - дополнительные опции (опционально)
   */
  async sendMessage(
    content: string,
    options?: SendMessageOptions,
  ): Promise<void>;
  async sendMessage(
    groupNameOrContent: string,
    contentOrOptions?: string | SendMessageOptions,
    options?: SendMessageOptions,
  ): Promise<void> {
    // Проверяем, включена ли отправка сообщений
    if (!this.messagesEnabled) {
      return; // Отправка сообщений отключена - библиотека молчаливая
    }

    try {
      // Получаем префикс из библиотеки
      const prefix = getMessagePrefix();

      // Применяем префикс к сообщению
      let finalGroupNameOrContent = groupNameOrContent;
      let finalContentOrOptions = contentOrOptions;

      if (prefix) {
        if (typeof contentOrOptions === 'string') {
          // Вариант 1: sendMessage(groupName, content, options?)
          // Префикс добавляется к groupName
          finalGroupNameOrContent = `${prefix} ${groupNameOrContent}`;
        } else {
          // Вариант 2: sendMessage(content, options?)
          // Префикс добавляется к content (сообщению)
          finalGroupNameOrContent = `${prefix} ${groupNameOrContent}`;
        }
      }

      // Создаем таймаут на 1 секунду
      const timeoutPromise = new Promise<void>((_, reject) => {
        setTimeout(
          () =>
            reject(
              new Error('Timeout: отправка сообщения заняла более 1 секунды'),
            ),
          1000,
        );
      });

      // Выполняем отправку с таймаутом - если не успело за 1 секунду, просто отпускаем обещание
      await Promise.race([
        this._sendMessageInternal(
          finalGroupNameOrContent,
          finalContentOrOptions,
          options,
        ),
        timeoutPromise,
      ]);
    } catch (error) {
      // Игнорируем ошибку (включая таймаут) - не бросаем исключение
      // Запрос может продолжить выполняться в фоне, но мы уже не ждем
    }
  }

  /**
   * Внутренний метод отправки сообщения (без обработки ошибок и таймаута)
   */
  private async _sendMessageInternal(
    groupNameOrContent: string,
    contentOrOptions?: string | SendMessageOptions,
    options?: SendMessageOptions,
  ): Promise<void> {
    // Определяем, какой вариант вызова используется
    let groupName: string | undefined;
    let content: string;
    let finalOptions: SendMessageOptions | undefined;

    if (typeof contentOrOptions === 'string') {
      // Вариант 1: sendMessage(groupName, content, options?)
      groupName = groupNameOrContent;
      content = contentOrOptions;
      finalOptions = options;
    } else {
      // Вариант 2: sendMessage(content, options?)
      content = groupNameOrContent;
      finalOptions = contentOrOptions as SendMessageOptions | undefined;
    }

    const entityType = finalOptions?.entityType || 'discussion';
    // Используем options.chatId если указан, иначе this.config.chatId (дефолт 33533150)
    const chatIdForDiscussion = finalOptions?.chatId ?? this.config.chatId;
    const entityId =
      finalOptions?.entityId ??
      (entityType === 'user' ? this.config.userId : chatIdForDiscussion);

    // Форматирование сообщения: если groupName указан, форматируем как "`{groupName}`: {content}"
    const formattedContent = groupName
      ? `\`${groupName}\`: ${content}`
      : content;

    // Проверка дубликатов только для сообщений в чаты (discussion) и только если groupName указан
    if (entityType === 'discussion' && groupName !== undefined) {
      const chatId = chatIdForDiscussion;

      try {
        // Получаем последние 50 сообщений из чата
        const messages = await this.getMessages(chatId, { per: 50 });

        // Вычисляем время 5 минут назад
        const now = Date.now();
        const fiveMinutesAgo = now - 5 * 60 * 1000; // 5 минут в миллисекундах

        // Ищем дубликат: сообщение начинается с "{groupName}: " и не более 5 минут назад
        const duplicate = messages.find((msg) => {
          const messageTime = Date.parse(msg.created_at);
          if (isNaN(messageTime)) {
            return false;
          }

          const isRecent = messageTime >= fiveMinutesAgo;

          // Проверяем, начинается ли сообщение с groupName (формат: `{groupName}`: {content})
          const messageContent = msg.content.trim();
          const expectedPrefix = `\`${groupName}\`: `;
          const startsWithGroupName = messageContent.startsWith(expectedPrefix);

          return isRecent && startsWithGroupName;
        });

        if (duplicate) {
          // Найден дубликат - создаем тред и отправляем сообщение туда
          try {
            let thread: PachkaThread;

            // Проверяем, есть ли уже тред у сообщения
            if (duplicate.thread && duplicate.thread.id) {
              // Используем существующий тред
              thread = {
                id: duplicate.thread.id,
                chat_id: duplicate.thread.chat_id,
              };
            } else {
              // Создаем новый тред
              thread = await this.createThread(duplicate.id);
            }

            // Отправляем сообщение в тред (с форматированием)
            const threadRequestBody: PachkaApiMessageRequest = {
              message: {
                entity_type: 'thread',
                entity_id: thread.id,
                content: formattedContent,
              },
            };

            await this.request<void>('/messages', {
              method: 'POST',
              json: threadRequestBody,
            });

            return; // Не отправляем новое сообщение в чат
          } catch (threadError) {
            // Если не удалось создать тред или отправить в тред, продолжаем отправку сообщения в чат
          }
        }
      } catch (error) {
        // Если ошибка при проверке дубликатов, продолжаем отправку сообщения
      }
    }

    // Отправляем новое сообщение (если не найден дубликат, произошла ошибка, или groupName не указан)
    const requestBody: PachkaApiMessageRequest = {
      message: {
        entity_type: entityType,
        entity_id: entityId,
        content: formattedContent,
      },
    };

    if (finalOptions?.parentMessageId) {
      requestBody.message.parent_message_id = finalOptions.parentMessageId;
    }

    await this.request<void>('/messages', {
      method: 'POST',
      json: requestBody,
    });
  }

  /**
   * Проверка подписи webhook'а и валидация timestamp
   */
  verifyWebhookSignature(
    rawBody: string,
    signature: string,
    timestamp?: number,
  ): boolean {
    if (!this.config.webhookSecret) {
      return true;
    }

    // Проверка подписи
    const expectedSignature = crypto
      .createHmac('sha256', this.config.webhookSecret)
      .update(rawBody)
      .digest('hex');

    if (expectedSignature !== signature) {
      return false;
    }

    // Проверка timestamp (защита от replay attacks)
    if (timestamp !== undefined) {
      const currentTime = Math.floor(Date.now() / 1000);
      const timeDiff = Math.abs(currentTime - timestamp);

      // Timestamp должен быть в пределах 1 минуты
      if (timeDiff > 60) {
        return false;
      }
    }

    return true;
  }

  /**
   * Обработка входящего webhook'а от Пачки
   */
  handleWebhook(body: any): WebhookMessage | null {
    if (!body || typeof body !== 'object') {
      return null;
    }

    // Проверяем, что это сообщение
    if (body.type === 'message' && body.event === 'new') {
      return {
        event: body.event,
        type: body.type,
        id: body.id,
        content: body.content || '',
        user_id: body.user_id,
        chat_id: body.chat_id,
        entity_type: body.entity_type,
        entity_id: body.entity_id,
        parent_message_id: body.parent_message_id || null,
        webhook_timestamp: body.webhook_timestamp,
        created_at: body.created_at,
      };
    }

    return null;
  }
}
