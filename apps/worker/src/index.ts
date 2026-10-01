import { Worker, Queue } from 'bullmq';
import { Redis } from 'ioredis';
import dotenv from 'dotenv';
import { resolve } from 'path';
import { processLowStockAlert } from './processors/alert.processor.js';
import { processNightlyReconcile } from './processors/reconcile.processor.js';

dotenv.config({ path: resolve(__dirname, '../../../.env') });
dotenv.config();

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
const connection = new Redis(redisUrl, {
  maxRetriesPerRequest: null,
  lazyConnect: true,
});

async function startWorker() {
  console.log('[IWMS Worker] Connecting to Redis queue at:', redisUrl);

  try {
    await connection.connect();
    console.log('[IWMS Worker] Connected to Redis successfully.');

    // 1. Alert Worker
    const alertWorker = new Worker('inventory-alerts', processLowStockAlert, { connection });
    alertWorker.on('completed', (job) => {
      console.log(`[Worker] Alert job ${job.id} completed.`);
    });
    alertWorker.on('failed', (job, err) => {
      console.error(`[Worker] Alert job ${job?.id} failed:`, err);
    });

    // 2. Reconcile Worker
    const reconcileWorker = new Worker('inventory-reconcile', processNightlyReconcile, { connection });
    reconcileWorker.on('completed', (job) => {
      console.log(`[Worker] Reconcile job ${job.id} completed.`);
    });

    // 3. Schedule Recurring Nightly Reconcile Job
    const reconcileQueue = new Queue('inventory-reconcile', { connection });
    await reconcileQueue.add(
      'nightly-reconcile',
      {},
      {
        repeat: {
          pattern: '0 2 * * *', // 02:00 AM every night
        },
      },
    );
    console.log('[IWMS Worker] Scheduled recurring nightly reconcile job (0 2 * * *).');

    console.log('[IWMS Worker] All BullMQ workers listening for jobs.');
  } catch (err: any) {
    console.warn('[IWMS Worker] Redis unavailable in local environment (running in fallback standby mode):', err.message);
  }
}

startWorker();
