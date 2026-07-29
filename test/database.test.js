// Integration tests for DatabaseService against the Firestore emulator.
//
// These hit a real Firestore, not a mock, per the testing rules in CLAUDE.md.
// The suite skips itself unless FIRESTORE_EMULATOR_HOST is set, so a plain
// `npm test` stays green without emulator tooling installed.
//
//   npx firebase emulators:start --only firestore --project demo-employment-bot
//   FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 npm test
//
// DEV_MODE is forced on so every write lands in `test_postings`.

import { generateKeyPairSync } from 'node:crypto';

const emulatorHost = process.env.FIRESTORE_EMULATOR_HOST;
const describeEmulator = emulatorHost ? describe : describe.skip;

const PROJECT_ID = 'demo-employment-bot';

// firebaseConfig.js calls cert(), which parses the private key even when the
// emulator makes it unused. A throwaway keypair satisfies it without shipping
// anything credential-shaped in the repo.
function fakeServiceAccount() {
  const { privateKey } = generateKeyPairSync('rsa', {
    modulusLength: 2048,
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    publicKeyEncoding: { type: 'spki', format: 'pem' },
  });
  return JSON.stringify({
    type: 'service_account',
    project_id: PROJECT_ID,
    client_email: `test@${PROJECT_ID}.iam.gserviceaccount.com`,
    private_key: privateKey,
  });
}

async function clearFirestore() {
  const res = await fetch(
    `http://${emulatorHost}/emulator/v1/projects/${PROJECT_ID}/databases/(default)/documents`,
    { method: 'DELETE' }
  );
  if (!res.ok) throw new Error(`Failed to clear emulator: ${res.status}`);
}

describeEmulator('DatabaseService', () => {
  let service;

  beforeAll(async () => {
    process.env.DEV_MODE = 'true';
    process.env.GCLOUD_PROJECT = PROJECT_ID;
    process.env.FIREBASE_ADMIN_CONFIG ??= fakeServiceAccount();

    const { DatabaseService } = await import('@repo/database');
    service = new DatabaseService();
  });

  beforeEach(clearFirestore);

  // A job in the shape the discord pipeline actually produces.
  const sampleJob = {
    jobTitle: 'Software Engineer Intern',
    companyName: 'Stripe',
    emailSubject: 'New internship postings',
    emailDate: '2026-07-22',
    scrapedData: {
      url: 'https://stripe.com/jobs/search?gh_jid=8031833',
      location: 'Bengaluru',
      skills: ['python', 'go'],
      postedDate: '2026-07-22T13:25:41-04:00',
    },
  };

  describe('write', () => {
    it('persists a job and defaults its status to pending', async () => {
      const docId = await service.write(sampleJob);
      const stored = await service.read(docId);

      expect(stored).toMatchObject({
        id: docId,
        title: 'Software Engineer Intern',
        company: 'Stripe',
        location: 'Bengaluru',
        skills: ['python', 'go'],
        status: 'pending',
        emailSubject: 'New internship postings',
      });
    });

    it('flattens nested scrapedData onto the stored document', async () => {
      const docId = await service.write(sampleJob);
      const stored = await service.read(docId);

      expect(stored.url).toBe('https://stripe.com/jobs/search?gh_jid=8031833');
      expect(stored.scrapedData).toBeUndefined();
    });

    it('drops fields that are not part of the Job model', async () => {
      const docId = await service.write({ ...sampleJob, internalDebugBlob: 'x'.repeat(50) });
      const stored = await service.read(docId);

      expect(stored.internalDebugBlob).toBeUndefined();
    });
  });

  describe('read', () => {
    it('returns null for a document that does not exist', async () => {
      expect(await service.read('does-not-exist')).toBeNull();
    });
  });

  describe('getPendingJobs', () => {
    it('returns only pending jobs', async () => {
      const pendingId = await service.write(sampleJob);
      const postedId = await service.write(sampleJob);
      await service.markJobAsPosted(postedId);

      const pending = await service.getPendingJobs();

      expect(pending.map((j) => j.id)).toEqual([pendingId]);
    });

    it('respects the limit argument', async () => {
      await Promise.all([1, 2, 3, 4, 5].map(() => service.write(sampleJob)));

      expect(await service.getPendingJobs(2)).toHaveLength(2);
    });

    it('returns an empty array when nothing is pending', async () => {
      expect(await service.getPendingJobs()).toEqual([]);
    });
  });

  describe('status transitions', () => {
    it('claims jobs as posting so a concurrent run will not pick them up', async () => {
      const ids = await Promise.all([service.write(sampleJob), service.write(sampleJob)]);

      await service.markJobsAsPosting(ids);

      expect(await service.getPendingJobs()).toEqual([]);
      for (const id of ids) {
        expect((await service.read(id)).status).toBe('posting');
      }
    });

    it('records postedAt when a job is marked posted', async () => {
      const docId = await service.write(sampleJob);

      await service.markJobAsPosted(docId);
      const stored = await service.read(docId);

      expect(stored.status).toBe('posted');
      expect(stored.postedAt.toDate()).toBeInstanceOf(Date);
    });

    it('returns a claimed job to pending when posting fails', async () => {
      const docId = await service.write(sampleJob);
      await service.markJobsAsPosting([docId]);

      await service.markJobAsFailed(docId);

      expect((await service.read(docId)).status).toBe('pending');
      expect(await service.getPendingJobs()).toHaveLength(1);
    });

    it('walks a job through the full pending -> posting -> posted lifecycle', async () => {
      const docId = await service.write(sampleJob);
      expect((await service.read(docId)).status).toBe('pending');

      await service.markJobsAsPosting([docId]);
      expect((await service.read(docId)).status).toBe('posting');

      await service.markJobAsPosted(docId);
      expect((await service.read(docId)).status).toBe('posted');

      expect(await service.getPendingJobs()).toEqual([]);
      expect(await service.getPostedJobs()).toHaveLength(1);
    });
  });
});
