import { BroadcastChannel, threadId, isMainThread } from 'worker_threads';
import type { InternalLogAttributes, LogAttributes } from '../logger.ts';
import path from 'node:path';
import { writeFileSync, createWriteStream } from 'node:fs';
import zlib from 'zlib';

const LOG_FILE_NAME = `app-${new Date().toISOString().slice(0, 19).replaceAll(/[-:]/g, '').replace('T', '-')}.log`;
const txtLogFilePath = path.join(process.cwd(), LOG_FILE_NAME + '.jsonl');

const fileStream = createWriteStream(path.join(process.cwd(), LOG_FILE_NAME + '.gz'));
const gzipStream = zlib.createGzip({ flush: zlib.constants.Z_FULL_FLUSH });
gzipStream.pipe(fileStream);
const gzBuffer: (string | [string, object])[] = [];
let gzFlushTimeout: ReturnType<typeof setTimeout> | undefined;
const GZ_MAX_BUFFER_SIZE = 50;
const GZ_FLUSH_INTERVAL_MS = 200;

const gzFlushBuffer = () => {
  if (gzBuffer.length === 0) {
    return;
  }

  const dataToWrite = gzBuffer.map(log => JSON.stringify(log)).join('\n') + '\n';
  console.log('writing to stream', gzipStream.write(dataToWrite));

  gzBuffer.length = 0;
  clearTimeout(gzFlushTimeout);
  gzFlushTimeout = undefined;
};

const reduceNumber = (value: number) => Number(value).toString(36);

const log = (attributes: InternalLogAttributes & LogAttributes) => {
  writeFileSync(txtLogFilePath, JSON.stringify(attributes) + '\n', { encoding: 'utf8', flag: 'a' })
  const { level, timestamp, processId, threadId, isMainThread, source, message, data } = attributes;
  const compressed = `${level.charAt(0)}${reduceNumber(timestamp)}:${reduceNumber(processId)}:${reduceNumber(threadId)}${isMainThread ? '!' : ''}:${source}:${message}`;
  gzBuffer.push(data ? [compressed, data] : compressed);
  if (gzBuffer.length >= GZ_MAX_BUFFER_SIZE) {
    gzFlushBuffer();
  } else if (!gzFlushTimeout) {
    gzFlushTimeout = setTimeout(gzFlushBuffer, GZ_FLUSH_INTERVAL_MS);
  }
}

const _log = (attributes: LogAttributes) => log({
  timestamp: Date.now(),
  level: 'info',
  processId: process.pid,
  threadId,
  isMainThread,
  ...attributes
} satisfies InternalLogAttributes & LogAttributes);

const channel = new BroadcastChannel('logger');
channel.onmessage = (event: any) => {
  if (event.data.terminate) {
    _log({ source: 'logger', message: 'Logger terminating' });
    channel.close();
    gzFlushBuffer();
    gzipStream.end();
  } else if (event.data.isReady) {
    channel.postMessage({ ready: true });
  } else {
    log(event.data);
  }
}

_log({ source: 'logger', message: 'Logger ready' });
channel.postMessage({ ready: true });
