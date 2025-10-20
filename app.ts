import { workerData } from 'worker_threads';

const workerId = workerData.id;
console.log(`[App Worker ${workerId}] Started.`);

setInterval(() => {
  console.log(`[App Worker ${workerId}] is alive`);
}, 1000);
