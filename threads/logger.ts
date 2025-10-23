import { BroadcastChannel, threadId, isMainThread } from 'worker_threads';
import type { InternalLogAttributes, LogAttributes } from '../logger.ts';

// import path from 'node:path';
// import { fileURLToPath } from 'node:url';
// import fs from 'fs';
// import zlib from 'zlib';

// const LOG_FILE_NAME = `app.log.gz`;
// const __dirname = path.dirname(fileURLToPath(import.meta.url));
// const logFilePath = path.join(__dirname, LOG_FILE_NAME);
// const fileStream = fs.createWriteStream(logFilePath);
// const gzipStream = zlib.createGzip();
// gzipStream.pipe(fileStream);
// console.log(`[Logger Worker] Writing logs to ${logFilePath}`);
// const loggingChannel = new BroadcastChannel('logging');

let uid = 0

const log = (attributes: InternalLogAttributes & LogAttributes) => {
  const { level, timestamp, processId = 0, threadId = 0, message }  = attributes;
  const icon = {
    debug: '🐞',
    info: '🛈',
    warn: '⚠️',
    error: '❌',
    fatal: '💣'
  }[level];
  console.log(++uid, icon, timestamp, processId, threadId, message);
}

const _log = (attributes: LogAttributes) => log({
  timestamp: Date.now(),
  level: 'info',
  processId: process.pid,
  threadId,
  isMainThread,
  ...attributes
});

const channel = new BroadcastChannel('logger');
channel.onmessage = (event: any) => {
  if (event.data.terminate) {
    _log({ message: 'Logger terminating' });
    channel.close();
  } else if (event.data.isReady) {
    channel.postMessage({ ready: true });
  } else {
    log(event.data as InternalLogAttributes & LogAttributes);
  }
}

_log({ message: 'Logger ready' });
channel.postMessage({ ready: true });
