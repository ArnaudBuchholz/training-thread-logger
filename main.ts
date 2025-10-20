import { Worker } from 'node:worker_threads';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const NUM_APP_WORKERS = 3;

const __dirname = path.dirname(fileURLToPath(import.meta.url));

console.log('[Main] Starting logging system...');

const loggerPath = path.join(__dirname, 'logger.ts');
const loggerWorker = new Worker(loggerPath);
loggerWorker.on('exit', (code) => {
  console.log(`[Main] Logger worker exited with code ${code}`);
});
loggerWorker.on('error', (err) => {
    console.error('[Main] Logger worker encountered an error:', err);
});

console.log(`[Main] Started logger worker.`);
const appPath = path.join(__dirname, 'app.ts');
const appWorkers: Worker[] = [];
for (let i = 0; i < NUM_APP_WORKERS; i++) {
  const workerId = `App-${i + 1}`;
  const appWorker = new Worker(appPath, {
    workerData: { id: workerId }
  });

  appWorker.on('exit', (code) => {
    console.log(`[Main] Application worker ${workerId} exited with code ${code}`);
  });
  appWorker.on('error', (err) => {
    console.error(`[Main] Application worker ${workerId} encountered an error:`, err);
  });

  console.log(`[Main] Started application worker: ${workerId}`);
  appWorkers.push(appWorker);
}

console.log(`[Main] All ${NUM_APP_WORKERS} application workers are running.`);
console.log('[Main] System is running. Press Ctrl+C to stop.');

const gracefulShutdown = () => {
    console.log('[Main] Received signal to terminate. Shutting down logger worker...');
    loggerWorker.terminate();
    for (const appWorker of appWorkers) {
      appWorker.terminate();
    }
};

process.on('SIGINT', gracefulShutdown);
process.on('SIGTERM', gracefulShutdown);
