import { BroadcastChannel } from 'worker_threads';
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

const channel = new BroadcastChannel('logger');
channel.onmessage = (event: any) => {
  if (event.data.terminate) {
    console.log(`[Logger Worker] terminating...`);
    channel.close();
  } else {
    const attributes = event.data as InternalLogAttributes & LogAttributes;
    const { level = 'info', processId = 0, threadId = 0, message }  = attributes;
    const icon = {
      debug: '🐞',
      info: '🛈',
      warn: '⚠️',
      error: '❌',
      fatal: '💣'
    }[level];
    console.log(icon, processId, threadId, message);
  }
}
