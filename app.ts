import { BroadcastChannel, workerData } from 'worker_threads';

const workerId = workerData.id;
console.log(`[App Worker ${workerId}] Started.`);

const intervalId = setInterval(() => {
  console.log(`[App Worker ${workerId}] is alive`);
}, 1000);

const workersChannel = new BroadcastChannel('workers');
workersChannel.onmessage = (event: any) => {
  console.log(`[App Worker ${workerId}] received ${JSON.stringify(event.data)}`);
  if (event.data.terminate) {
    console.log(`[App Worker ${workerId}] terminating...`);
    clearInterval(intervalId);
    workersChannel.close();
  }
}
