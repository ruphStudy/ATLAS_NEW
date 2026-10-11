export interface IQueueConfig {
  readonly redis: {
    readonly host: string;
    readonly port: number;
    readonly password: string | undefined;
    readonly tls?: boolean;
  };
}
