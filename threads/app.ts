import { BroadcastChannel, workerData } from 'worker_threads';
import { logger, LogLevel } from '../logger.ts';

const LOG_LEVELS = Object.values(LogLevel);

const workerId = workerData.id;
logger.info({ source: 'app', message: `[App Worker ${workerId}] started` });

let timeoutId: ReturnType<typeof setInterval>;
function scheduleNextLog() {
    const interval = Math.random() * 500 + 100; // Random interval between 100ms and 500ms
    timeoutId = setTimeout(() => {
      const level = LOG_LEVELS[Math.floor(Math.random() * LOG_LEVELS.length)];
      logger[level]({ source: 'app', message: `This is a sample ${level} message from worker ${workerId}. Random number: ${Math.random()}` });
      scheduleNextLog();
    }, interval);
}
scheduleNextLog();

const workersChannel = new BroadcastChannel('apps');
workersChannel.onmessage = async (event: any) => {
  logger.info({ source: 'app', message: `[App Worker ${workerId}] received ${JSON.stringify(event.data)}` });
  if (event.data.terminate) {
    logger.warn({ source: 'app', message: `[App Worker ${workerId}] terminating...` });
    clearInterval(timeoutId);
    workersChannel.close();
    await logger.close();
  }
}
