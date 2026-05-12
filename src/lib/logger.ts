import { Axiom } from '@axiomhq/js';
import { Logger, AxiomJSTransport, ConsoleTransport, type Transport } from '@axiomhq/logging';

const token = import.meta.env.VITE_AXIOM_TOKEN as string | undefined;
const dataset = import.meta.env.VITE_AXIOM_DATASET as string | undefined;

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogContext {
  message?: string;
  stack?: string;
  componentStack?: string;
  userId?: string;
  boardId?: string;
  cardId?: string;
  description?: string;
  url?: string;
  [key: string]: unknown;
}

const transports: Transport[] = [];

if (token && dataset) {
  const axiom = new Axiom({ token });
  transports.push(new AxiomJSTransport({ axiom, dataset }));
}

transports.push(new ConsoleTransport({ prettyPrint: import.meta.env.DEV as boolean }));

export const logger = new Logger({ transports: transports as [Transport, ...Transport[]] });

export const logDebug = (event: string, ctx?: LogContext): void =>
  logger.debug(event, ctx as Record<string, unknown>);
export const logInfo = (event: string, ctx?: LogContext): void =>
  logger.info(event, ctx as Record<string, unknown>);
export const logWarn = (event: string, ctx?: LogContext): void =>
  logger.warn(event, ctx as Record<string, unknown>);

export function logError(event: string, errorOrContext?: Error | LogContext): void {
  logger.error(
    event,
    errorOrContext instanceof Error
      ? { message: errorOrContext.message, stack: errorOrContext.stack, name: errorOrContext.name }
      : (errorOrContext as Record<string, unknown>),
  );
}

// Satisfy LogLevel type usage to avoid unused-type lint errors
export type { LogLevel };
