import * as Sentry from "@sentry/nextjs";

/**
 * Observabilidade de servidor (doc 8 §8.5). Ativa apenas quando
 * SENTRY_DSN estiver configurado — em dev local fica inerte.
 */
export async function register() {
  if (!process.env.SENTRY_DSN) return;
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    tracesSampleRate: 0.1,
    enableLogs: false,
  });
}

export const onRequestError = Sentry.captureRequestError;
