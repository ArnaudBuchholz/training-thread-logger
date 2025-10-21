import { BroadcastChannel } from 'worker_threads';

// const intervalId = setInterval(() => {}, 1 << 30);

const workersChannel = new BroadcastChannel('workers');
workersChannel.onmessage = (event: any) => {
  if (event.terminate) {
    // clearInterval(intervalId);
  }
}
