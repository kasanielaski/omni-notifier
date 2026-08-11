# omni-notifier

Отправка уведомлений в **Пачку**, **Telegram** и **Discord** из одной библиотеки.

- Ноль рантайм-зависимостей — только нативный `fetch`
- TypeScript, типы в комплекте
- Молчаливая по умолчанию: пока `*EnableMessages` не выставлен, ничего никуда не уходит

> **Статус: 0.x.** Библиотека в разработке, публичный API может меняться в минорных версиях. Готовность провайдеров различается — см. [Что умеет каждый провайдер](#что-умеет-каждый-провайдер).

## Установка

```bash
npm install omni-notifier
```

Требуется **Node.js 18+** — используются глобальный `fetch` и `AbortSignal.timeout()`.

## Быстрый старт

```ts
import { telegramInit, telegram } from 'omni-notifier';

telegramInit({
  telegramToken: process.env.TG_TOKEN,
  telegramChatID: Number(process.env.TG_CHAT_ID),
  telegramEnableMessages: true,
});

await telegram?.sendMessage('деплой прошёл');
```

Каждый провайдер живёт отдельно: своя функция `*Init`, свой глобальный инстанс. Инициализировать нужно только те, которыми пользуешься.

### Импорт одного провайдера

Чтобы не тянуть остальные, импортируй по подпути:

```ts
import { discordInit, discord } from 'omni-notifier/discord';
```

Доступны `omni-notifier/telegram`, `omni-notifier/discord`, `omni-notifier/pachca`.

### CommonJS: не деструктурируй инстанс

Инстансы (`telegram`, `discord`, `pachca`) создаются внутри `*Init` и до вызова равны `null`. В ESM это живые биндинги, и пример выше работает как есть. В CommonJS деструктуризация копирует значение в момент `require` — то есть `null` навсегда:

```js
// ❌ не работает: telegram навсегда останется null
const { telegramInit, telegram } = require('omni-notifier/telegram');
telegramInit({ ... });
await telegram.sendMessage('привет'); // TypeError: Cannot read properties of null

// ✅ обращайся через объект модуля
const tg = require('omni-notifier/telegram');
tg.telegramInit({ ... });
await tg.telegram.sendMessage('привет');
```

Функции `*Init` деструктурировать можно — они не переприсваиваются.

## Telegram

```ts
import { telegramInit, telegram } from 'omni-notifier/telegram';

telegramInit({
  telegramToken: '123456:ABC-DEF...',
  telegramChatID: -1001156290569,
  telegramEnableMessages: true,
});

const message = await telegram?.sendMessage('привет');
console.log(message?.message_id);
```

| Параметр | Тип | Описание |
| --- | --- | --- |
| `telegramToken` | `string` | Токен бота от [@BotFather](https://t.me/BotFather) |
| `telegramChatID` | `number` | Id чата или канала |
| `telegramEnableMessages` | `boolean` | По умолчанию `false` — отправка выключена |

**Где взять `telegramChatID`.** Написать боту `/start` (или добавить его в группу), затем:

```bash
curl -s "https://api.telegram.org/bot<TOKEN>/getUpdates" | jq '.result[].message.chat'
```

Бот не может написать первым. Если получатель не отправлял `/start`, придёт `403 Forbidden: bot can't initiate conversation with a user`.

## Discord

```ts
import { discordInit, discord } from 'omni-notifier/discord';

discordInit({
  discordToken: 'MTIzNDU2...',
  discordChatID: '1156290569123456789',
  discordEnableMessages: true,
});

await discord?.sendMessage('сборка упала');
```

| Параметр | Тип | Описание |
| --- | --- | --- |
| `discordToken` | `string` | Токен бота из Developer Portal |
| `discordChatID` | `string` | Snowflake канала — **строкой** |
| `discordEnableMessages` | `boolean` | По умолчанию `false` |

**`discordChatID` — только строка.** Snowflake занимает 18–19 знаков и не помещается в `Number.MAX_SAFE_INTEGER` (16 знаков). Числом id молча округлится, и сообщение уйдёт в несуществующий канал:

```ts
Number('1156290569123456789'); // 1156290569123456800 — не тот канал
```

Боту нужны права **View Channel** и **Send Messages** в целевом канале, иначе `403 Missing Access`. Лимит длины сообщения — 2000 символов.

## Пачка

Самый полный провайдер: помимо отправки умеет группировать сообщения в треды, ставить реакции и разбирать вебхуки.

```ts
import { pachcaInit, pachca } from 'omni-notifier/pachca';

pachcaInit({
  pachcaAccessToken: '...',
  pachcaUserId: 671435,
  pachcaChatId: 33533150,
  pachcaPrefix: '[prod]',
  pachcaEnableMessages: true,
});

// с группировкой: повторы той же группы за 5 минут уходят в тред к первому
await pachca?.sendMessage('деплой', 'начали');
await pachca?.sendMessage('деплой', 'закончили');

// без группировки
await pachca?.sendMessage('просто сообщение');
```

| Параметр | Тип | Описание |
| --- | --- | --- |
| `pachcaAccessToken` | `string` | Токен доступа к API |
| `pachcaUserId` | `number` | Id пользователя для личных сообщений |
| `pachcaChatId` | `number` | Чат по умолчанию |
| `pachcaWebhookSecret` | `string` | Секрет для проверки подписи вебхуков |
| `pachcaPrefix` | `string` | Префикс ко всем сообщениям |
| `pachcaEnableMessages` | `boolean` | По умолчанию `false` |

Прочие методы: `getMessages`, `addReaction`, `createThread`, `verifyWebhookSignature`, `handleWebhook`.

## Что умеет каждый провайдер

| | Пачка | Telegram | Discord |
| --- | :---: | :---: | :---: |
| Отправка сообщений | ✅ | ✅ | ✅ |
| Префикс | ✅ | — | — |
| Группировка в треды | ✅ | — | — |
| Реакции | ✅ | — | — |
| Вебхуки | ✅ | — | — |
| Поведение при ошибке | глотает | бросает | бросает |

Telegram и Discord пока умеют только отправку — это осознанный этап, а не недосмотр. Остальное добавляется по одному провайдеру за раз.

## Обработка ошибок

Поведение **различается между провайдерами** и будет унифицировано до 1.0.

`pachca.sendMessage()` ошибку не бросает: у него внутренний таймаут в 1 секунду, и при любом сбое он молча возвращает `undefined`. Приложение не упадёт из-за недоступного мессенджера, но и не узнает о проблеме.

`telegram.sendMessage()` и `discord.sendMessage()` бросают ошибку — `TelegramApiError` / `DiscordApiError` с полями `status`, `body`, `url`:

```ts
try {
  await telegram?.sendMessage('привет');
} catch (err) {
  console.error(err.message);
  // Telegram API 400 на https://api.telegram.org/bot<token>/sendMessage: Bad Request: chat not found
}
```

Токен в текст ошибки не попадает — в сообщении он заменён на `<token>`, поэтому `console.error(err)` безопасно писать в логи.

Классы ошибок пока не экспортируются, ловить приходится по `err.name`.

## Выключатель отправки

Флаг `*EnableMessages` — главный предохранитель. Пока он `false` (значение по умолчанию), `sendMessage` возвращает `undefined`, не делая ни одного сетевого запроса. Удобно, чтобы в тестах и локальной разработке не спамить боевой чат:

```ts
telegramInit({
  telegramToken: process.env.TG_TOKEN,
  telegramChatID: Number(process.env.TG_CHAT_ID),
  telegramEnableMessages: process.env.NODE_ENV === 'production',
});
```

Переключается и на лету: `telegram?.setMessagesEnabled(true)`.

## Токены

Токены — это учётные данные. Держи их в переменных окружения, не в коде и не в репозитории. Утёкший токен бота позволяет писать во все доступные ему чаты от твоего имени; отзывать его придётся вручную через BotFather или Developer Portal.

## Разработка

```bash
yarn install
yarn build
```

## Лицензия

ISC
