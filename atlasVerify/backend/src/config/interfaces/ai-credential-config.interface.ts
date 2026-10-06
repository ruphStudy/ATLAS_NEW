export interface IAiCredentialConfig {
  readonly encryptionKeyPassphrase: string;
  readonly keyLength: number;
  readonly ivLength: number;
  readonly authTagLength: number;
}
