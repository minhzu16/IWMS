export type SecretName = 'JWT_SECRET' | 'JWT_REFRESH_SECRET';

/**
 * Reads a required token-signing secret. There is no built-in default: the API refuses to start
 * when a secret is missing or shorter than 32 characters (see .env.example).
 */
export function requireSecret(name: SecretName): string {
  const value = process.env[name];
  if (!value || value.length < 32) {
    throw new Error(`${name} must be set to at least 32 characters (see .env.example)`);
  }
  return value;
}
