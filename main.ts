import { BroadcastChannel, Worker } from 'node:worker_threads';
import { logger } from './logger.ts';
import { start } from './threads.ts';

const NUM_APP_WORKERS = 10;

logger.info({ source: 'main', message: 'Starting console...' });
start('console');

logger.info({ source: 'main', message: 'Starting applications...' });

let appActiveCount = 0;
const appWorkers: Worker[] = [];
for (let i = 0; i < NUM_APP_WORKERS; ++i) {
  const id = `App-${i + 1}`;
  const appWorker = start('app', { id });
  appWorker.on('exit', (code) => {
    logger.warn({ source: 'main', message: `Application worker ${id} exited with code ${code}` });
    --appActiveCount;
  });
  appWorker.on('error', (err) => {
    logger.warn({ source: 'main', message: `Application worker ${id} encountered an error:`, error: err });
  });
  appWorkers.push(appWorker);
  ++appActiveCount;
  logger.info({ source: 'main', message: `Started application worker: ${id}` });
}

logger.info({ source: 'main', message: `All ${NUM_APP_WORKERS} application workers are running` });
logger.info({ source: 'main', message: `System is running. Press Ctrl+C to stop` });

const gracefulShutdown = async () => {
  logger.info({ source: 'main', message: `Received signal to terminate. Shutting down logger worker...` });
  const workersChannel = new BroadcastChannel('apps');
  workersChannel.postMessage({ terminate: true });
  let maxLoops = 20
  while (appActiveCount > 0 && --maxLoops > 0) {
    await new Promise(resolve => setTimeout(resolve, 250));
    logger.info({ source: 'main', message: `Number of active apps: ${appActiveCount}` });
  }
  if (appActiveCount > 0) {
    logger.warn({ source: 'main', message: `Forcing shut down...` });
    for (const appWorker of appWorkers) {
      appWorker.terminate();
    }
  }
  workersChannel.close();
  await logger.close();
};

// Only the main thread can handle SIGINT and SIGTERM
process.on('SIGINT', gracefulShutdown);
process.on('SIGTERM', gracefulShutdown);

process.on('exit', (code) => {
  console.log('terminated with', code);
});
