import { Axiom } from '@axiomhq/js';
import { Logger, AxiomJSTransport, ConsoleTransport } from '@axiomhq/logging';

const token = import.meta.env.VITE_AXIOM_TOKEN;
const dataset = import.meta.env.VITE_AXIOM_DATASET;

const transports = [];

if (token && dataset) {
  const axiom = new Axiom({ token });
  transports.push(new AxiomJSTransport({ axiom, dataset }));
}

transports.push(new ConsoleTransport({ prettyPrint: import.meta.env.DEV }));

export const logger = new Logger({ transports });

export function logError(message, errorOrContext) {
  logger.error(message, errorOrContext instanceof Error
    ? { message: errorOrContext.message, stack: errorOrContext.stack, name: errorOrContext.name }
    : errorOrContext
  );
}
