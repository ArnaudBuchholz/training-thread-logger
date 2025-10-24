import { BroadcastChannel, threadId, isMainThread } from 'worker_threads';
import type { InternalLogAttributes, LogAttributes } from '../logger.ts';
import path from 'node:path';
import { writeFileSync, createWriteStream } from 'fs';
import { DatabaseSync } from 'node:sqlite';
import zlib from 'zlib';

const LOG_FILE_NAME = `app-${new Date().toISOString().slice(0, 19).replaceAll(/[-:]/g, '').replace('T', '-')}.log`;
console.log(LOG_FILE_NAME);
const txtLogFilePath = path.join(process.cwd(), LOG_FILE_NAME + '.jsonl');

const db = new DatabaseSync(path.join(process.cwd(), LOG_FILE_NAME + '.db'));
db.exec(`
CREATE TABLE logs (
  uid INT,
  level TEXT,
  timestamp DATE,
  processId INT,
  threadId INT,
  isMainThread BOOL,
  message TEXT
)
`);
const dbLog = db.prepare(`
INSERT INTO logs(
  uid,
  level,
  timestamp,
  processId,
  threadId,
  isMainThread,
  message
) VALUES (
  :uid,
  :level,
  :timestamp,
  :processId,
  :threadId,
  :isMainThread,
  :message
)
`);

const fileStream = createWriteStream(path.join(process.cwd(), LOG_FILE_NAME + '.gz'));
const gzipStream = zlib.createGzip();
gzipStream.pipe(fileStream);
const gzBuffer: object[] = [];
let gzFlushTimeout: ReturnType<typeof setTimeout> | undefined;
const GZ_MAX_BUFFER_SIZE = 50;
const GZ_FLUSH_INTERVAL_MS = 200;

const gzFlushBuffer = () => {
  if (gzBuffer.length === 0) {
    return;
  }

  const dataToWrite = gzBuffer.map(log => JSON.stringify(log)).join('\n') + '\n';
  gzipStream.write(dataToWrite);

  gzBuffer.length = 0;
  clearTimeout(gzFlushTimeout);
  gzFlushTimeout = undefined;
};


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
  writeFileSync(txtLogFilePath, JSON.stringify({ uid, ...attributes }) + '\n', { encoding: 'utf8', flag: 'a' })
  const { error, ...otherAttributes } = attributes;
  dbLog.run({ uid, ...otherAttributes, isMainThread: attributes.isMainThread ? 'true' : 'false' });
  gzBuffer.push(attributes);
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
});

const channel = new BroadcastChannel('logger');
channel.onmessage = (event: any) => {
  if (event.data.terminate) {
    _log({ message: 'Logger terminating' });
    channel.close();
    db.close();
    gzFlushBuffer();
    gzipStream.end(() => fileStream.end());
  } else if (event.data.isReady) {
    channel.postMessage({ ready: true });
  } else {
    log(event.data as InternalLogAttributes & LogAttributes);
  }
}

_log({ message: 'Logger ready' });
channel.postMessage({ ready: true });
