import { BroadcastChannel, Worker } from 'node:worker_threads';
import { logger, shutdown } from './logger.ts';
import { getNumberOfActiveThreads, start } from './threads.ts';

const NUM_APP_WORKERS = 3;

logger.info({ message: 'Starting applications...' });

const appWorkers: Worker[] = [];
for (let i = 0; i < NUM_APP_WORKERS; ++i) {
  const id = `App-${i + 1}`;
  const appWorker = start('app', { id });
  appWorker.on('exit', (code) => {
    logger.warn({ message: `Application worker ${id} exited with code ${code}` });
  });
  appWorker.on('error', (err) => {
    logger.warn({ message: `[Main] Application worker ${id} encountered an error:`, error: err });
  });
  appWorkers.push(appWorker);
  logger.info({ message: `Started application worker: ${id}` });
}

logger.info({ message: `All ${NUM_APP_WORKERS} application workers are running` });
logger.info({ message: `System is running. Press Ctrl+C to stop` });

const gracefulShutdown = async () => {
  logger.info({ message: `Received signal to terminate. Shutting down logger worker...` });
  const workersChannel = new BroadcastChannel('apps');
  workersChannel.postMessage({ terminate: true });
  let maxLoops = 20
  while (getNumberOfActiveThreads() > 1 && --maxLoops > 0) {
    await new Promise(resolve => setTimeout(resolve, 250));
  }
  if (getNumberOfActiveThreads() > 1) {
    logger.warn({ message: `Forcing shut down...` });
    for (const appWorker of appWorkers) {
      appWorker.terminate();
    }
  }
  workersChannel.close();
  shutdown();
};

// Only the main thread can handle SIGINT and SIGTERM
process.on('SIGINT', gracefulShutdown);
process.on('SIGTERM', gracefulShutdown);

process.on('exit', (code) => {
  console.log('terminated with', code);
});
