import { readFile } from 'node:fs/promises';
import { getApps, initializeApp, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

const [uid] = process.argv.slice(2);
const credentialPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;

if (!uid) {
  throw new Error('Usage: npm run set-admin:claim -- <Firebase Auth UID>');
}

if (!credentialPath) {
  throw new Error('Set GOOGLE_APPLICATION_CREDENTIALS to the local service-account JSON file path.');
}

const serviceAccount = JSON.parse(await readFile(credentialPath, 'utf8'));
const app = getApps()[0] ?? initializeApp({ credential: cert(serviceAccount) });

await getAuth(app).setCustomUserClaims(uid, { admin: true });
console.log(`Admin custom claim set for UID: ${uid}`);
console.log('Sign out and sign back in to refresh the account ID token.');
