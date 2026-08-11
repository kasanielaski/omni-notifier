export interface IDiscordConfig {
  discordToken?: string;
  discordEnableMessages?: boolean;
  /** Snowflake канала. Именно строка: 19-значный id не помещается в number без потери точности */
  discordChatID?: string;
}

/** Тело ошибки Discord: { message, code }, при 429 ещё retry_after */
export interface DiscordApiErrorBody {
  message?: string;
  code?: number;
  retry_after?: number;
}

export interface DiscordMessage {
  id: string;
  channel_id: string;
  content: string;
  timestamp: string;
  author: {
    id: string;
    username: string;
    bot?: boolean;
  };
}
