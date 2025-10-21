import { BroadcastChannel } from 'worker_threads';
// import path from 'node:path';
// import { fileURLToPath } from 'node:url';
// import fs from 'fs';
// import zlib from 'zlib';

console.log(`[Logger Worker] Started.`);

const intervalId = setInterval(() => {
  console.log(`[Logger Worker] is alive`);
}, 1000);

// const LOG_FILE_NAME = `app.log.gz`;
// const __dirname = path.dirname(fileURLToPath(import.meta.url));
// const logFilePath = path.join(__dirname, LOG_FILE_NAME);
// const fileStream = fs.createWriteStream(logFilePath);
// const gzipStream = zlib.createGzip();
// gzipStream.pipe(fileStream);
// console.log(`[Logger Worker] Writing logs to ${logFilePath}`);
// const loggingChannel = new BroadcastChannel('logging');

const workersChannel = new BroadcastChannel('workers');
workersChannel.onmessage = (event: any) => {
  console.log(`[Logger Worker] received ${JSON.stringify(event.data)}`);
  if (event.data.terminate) {
    console.log(`[Logger Worker] terminating...`);
    clearInterval(intervalId);
    workersChannel.close();
  }
}
