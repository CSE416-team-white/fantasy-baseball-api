import { env } from '../config/env.js';
import type { Agenda } from 'agenda';

let agenda: Agenda | null = null;

export async function initAgenda() {
  const { Agenda: AgendaConstructor } = await import('agenda');
  const { MongoBackend } = await import('@agendajs/mongo-backend');

  agenda = new AgendaConstructor({
    backend: new MongoBackend({ address: env.mongodbUri, collection: 'jobs' }),
    processEvery: '1 minute',
    maxConcurrency: 20,
  });

  agenda.on('ready', () => {
    console.log('Agenda started');
  });

  agenda.on('error', (error: Error) => {
    console.error('Agenda error:', error);
  });

  return agenda;
}

export function getAgenda() {
  if (!agenda) {
    throw new Error('Agenda not initialized. Call initAgenda() first.');
  }
  return agenda;
}

export async function startAgenda(): Promise<void> {
  if (!agenda) {
    await initAgenda();
  }
  await agenda.start();
}

export async function stopAgenda(): Promise<void> {
  await agenda.stop();
}
