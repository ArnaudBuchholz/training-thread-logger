import { BroadcastChannel, Worker } from 'node:worker_threads';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const WORKER_FLAGS = ['--experimental-strip-types', '--disable-warning=ExperimentalWarning']
const NUM_APP_WORKERS = 3;

let activeWorkers = 0;

const __dirname = path.dirname(fileURLToPath(import.meta.url));

console.log('[Main] Starting logging system...');

const loggerPath = path.join(__dirname, 'logger.ts');
++activeWorkers;
const loggerWorker = new Worker(loggerPath, {
  execArgv: WORKER_FLAGS,
});
loggerWorker.on('exit', (code) => {
  --activeWorkers;
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
  ++activeWorkers;
  const appWorker = new Worker(appPath, {
    workerData: { id: workerId },
    execArgv: WORKER_FLAGS,
  });

  appWorker.on('exit', (code) => {
    --activeWorkers;
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

const gracefulShutdown = async () => {
  console.log('[Main] Received signal to terminate. Shutting down logger worker...');
  const workersChannel = new BroadcastChannel('workers');
  workersChannel.postMessage({ terminate: true });
  let maxLoops = 20
  while (activeWorkers > 0 && --maxLoops > 0) {
    await new Promise(resolve => setTimeout(resolve, 250));
  }
  if (activeWorkers > 0) {
    console.log('[Main] Forcing shut down...');
    loggerWorker.terminate();
    for (const appWorker of appWorkers) {
      appWorker.terminate();
    }
  }
  process.exit(0);
};

process.on('SIGINT', gracefulShutdown);
process.on('SIGTERM', gracefulShutdown);
