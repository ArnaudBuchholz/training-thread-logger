import { BroadcastChannel, workerData } from 'worker_threads';
import { logger } from '../logger.ts';

const workerId = workerData.id;
logger.info({ message: `[App Worker ${workerId}] started` });

const intervalId = setInterval(() => {
  logger.info({ message: `[App Worker ${workerId}] is alive` });
}, 1000);

const workersChannel = new BroadcastChannel('workers');
workersChannel.onmessage = (event: any) => {
  logger.warn({ message: `[App Worker ${workerId}] received ${JSON.stringify(event.data)}` });
  if (event.data.terminate) {
    logger.warn({ message: `[App Worker ${workerId}] terminating...` });
    clearInterval(intervalId);
    workersChannel.close();
  }
}
