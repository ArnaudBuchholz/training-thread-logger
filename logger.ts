import { BroadcastChannel, threadId, isMainThread } from 'node:worker_threads';
import { start } from './threads.ts';

export type LogAttributes = {
  message: string;
  error?: unknown;
};

type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal';

export type InternalLogAttributes = {
  /** Time stamp (UNIX epoch) */
  timestamp: number;
  /** level */
  level: LogLevel;
  /** process id */
  processId: number;
  /** thread id */
  threadId: number;
  /** indicates if this is the main thread */
  isMainThread: boolean;
};

const channel = new BroadcastChannel('logger');
const worker = start('logger');

const log = (level: LogLevel, attributes: LogAttributes) => {
  channel.postMessage({
    timestamp: Date.now(),
    level,
    processId: process.pid,
    threadId,
    isMainThread,
    ...attributes
  } satisfies InternalLogAttributes & LogAttributes)
}

export const logger = {
  debug(attributes: LogAttributes) { log('debug', attributes); },
  info(attributes: LogAttributes) { log('info', attributes); },
  warn(attributes: LogAttributes) { log('warn', attributes); },
  error(attributes: LogAttributes) { log('error', attributes); },
  fatal(attributes: LogAttributes) { log('fatal', attributes); }
};

export const shutdown = async () => {
  const { promise, resolve } = Promise.withResolvers();
  worker.on('exit', resolve);
  channel.postMessage({ terminate: true });
  await promise;
  channel.close();
};
