import { onRequest } from 'firebase-functions/v2/https';
import { setGlobalOptions } from 'firebase-functions/v2';
import { createApp } from './app.js';

setGlobalOptions({ region: 'us-central1', maxInstances: 5 });

const app = createApp();

export const api = onRequest(
  {
    memory: '512MiB',
    timeoutSeconds: 60,
    cpu: 1,
    invoker: 'public',
  },
  app
);
