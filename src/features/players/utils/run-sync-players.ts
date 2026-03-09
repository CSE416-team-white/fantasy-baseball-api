import 'dotenv/config';

const baseUrl = process.env.FANTASY_BASEBALL_API_URL ?? 'http://localhost:3001';
const apiKey = process.env.FANTASY_BASEBALL_API_KEY;

async function main() {
  try {
    if (!apiKey) {
      throw new Error(
        'Missing FANTASY_BASEBALL_API_KEY in environment. Set it before running sync-players.',
      );
    }

    const response = await fetch(`${baseUrl}/api/players/sync`, {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
      },
    });

    const text = await response.text();
    if (!response.ok) {
      throw new Error(`Sync request failed (${response.status}): ${text}`);
    }

    console.log(text || 'Player sync triggered successfully');
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error(`Failed to trigger sync: ${message}`);
    process.exitCode = 1;
  }
}

main();
