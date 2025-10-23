import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Worker } from 'node:worker_threads';

const WORKER_FLAGS = ['--experimental-strip-types', '--disable-warning=ExperimentalWarning']

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const start = (name: string, data?: unknown) => {
  // TODO: switch extension & execArgv based on current file extension
  const workerPath = path.join(__dirname, `threads/${name}.ts`);
  const worker = new Worker(workerPath, {
    workerData: data,
    execArgv: WORKER_FLAGS,
  });
  return worker;
}