import Agenda from 'agenda';
import { env } from '../config/env.js';

export const agenda = new Agenda({
  db: { address: env.mongodbUri, collection: 'jobs' },
  processEvery: '1 minute',
  maxConcurrency: 20,
});

agenda.on('ready', () => {
  console.log('Agenda started');
});

agenda.on('error', (error) => {
  console.error('Agenda error:', error);
});

export async function startAgenda(): Promise<void> {
  await agenda.start();
}

export async function stopAgenda(): Promise<void> {
  await agenda.stop();
}
