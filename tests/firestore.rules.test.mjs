import assert from 'node:assert/strict';
import test, { after, afterEach, before } from 'node:test';
import { readFile } from 'node:fs/promises';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';

const projectId = 'sitamarhi-cab-rules-test';
const ids = { customer: 'customer-1', stranger: 'customer-2', driver: 'driver-1', admin: 'admin-1' };
let env;

const profile = (uid, role, status) => ({ uid, role, status, name: uid });
const ride = (overrides = {}) => ({
  userId: ids.customer,
  driverId: '',
  status: 'pending',
  paymentStatus: 'pending',
  fare: 120,
  ...overrides,
});

function db(uid, token = {}) {
  return env.authenticatedContext(uid, token).firestore();
}

async function seed() {
  await env.withSecurityRulesDisabled(async (context) => {
    const adminDb = context.firestore();
    await Promise.all([
      setDoc(doc(adminDb, 'users', ids.customer), profile(ids.customer, 'user', 'approved')),
      setDoc(doc(adminDb, 'users', ids.stranger), profile(ids.stranger, 'user', 'approved')),
      setDoc(doc(adminDb, 'users', ids.driver), profile(ids.driver, 'driver', 'approved')),
      setDoc(doc(adminDb, 'rides', 'ride-1'), ride({ driverId: ids.driver, status: 'assigned' })),
      setDoc(doc(adminDb, 'rides', 'ride-2'), ride({ userId: ids.stranger })),
    ]);
  });
}

before(async () => {
  env = await initializeTestEnvironment({
    projectId,
    firestore: { rules: await readFile(new URL('../firestore.rules', import.meta.url), 'utf8') },
  });
});

afterEach(async () => {
  if (env) await env.clearFirestore();
});
after(async () => {
  if (env) await env.cleanup();
});

test('end-to-end: customer registration, booking, assignment, ride completion, and private tracking', async () => {
  await assertSucceeds(setDoc(doc(db(ids.customer), 'users', ids.customer), profile(ids.customer, 'user', 'approved')));
  await assertSucceeds(setDoc(doc(db(ids.driver), 'users', ids.driver), profile(ids.driver, 'driver', 'pending')));

  // Approval is a privileged operation; seed it as the trusted back office would.
  await env.withSecurityRulesDisabled(async (context) => {
    await updateDoc(doc(context.firestore(), 'users', ids.driver), { status: 'approved' });
  });

  await assertSucceeds(setDoc(doc(db(ids.customer), 'rides', 'ride-e2e'), ride()));
  await assertSucceeds(updateDoc(doc(db(ids.customer), 'rides', 'ride-e2e'), {
    driverId: ids.driver, status: 'assigned', assignedAt: new Date(),
  }));
  await assertSucceeds(updateDoc(doc(db(ids.driver), 'rides', 'ride-e2e'), { status: 'accepted' }));

  await assertSucceeds(setDoc(doc(db(ids.driver), 'driver_locations', ids.driver), {
    driverId: ids.driver, activeRideId: 'ride-e2e', latitude: 26.12, longitude: 85.35,
  }));
  await assertSucceeds(getDoc(doc(db(ids.customer), 'driver_locations', ids.driver)));
  await assertFails(getDoc(doc(db(ids.stranger), 'driver_locations', ids.driver)));

  await assertSucceeds(updateDoc(doc(db(ids.driver), 'rides', 'ride-e2e'), { status: 'ongoing' }));
  await assertSucceeds(updateDoc(doc(db(ids.driver), 'rides', 'ride-e2e'), { status: 'completed' }));
  await assertFails(getDoc(doc(db(ids.customer), 'driver_locations', ids.driver)));
});

test('end-to-end: privilege escalation, data snooping, payment forgery, and forged earnings are blocked', async () => {
  await seed();
  await assertFails(updateDoc(doc(db(ids.customer), 'users', ids.customer), { role: 'admin' }));
  await assertFails(getDoc(doc(db(ids.stranger), 'users', ids.customer)));
  await assertFails(getDoc(doc(db(ids.stranger), 'rides', 'ride-1')));
  await assertFails(updateDoc(doc(db(ids.customer), 'rides', 'ride-1'), { paymentStatus: 'paid' }));
  await assertFails(setDoc(doc(db(ids.driver), 'earnings', 'fake'), { driverId: ids.driver, amount: 999999 }));
});

test('an admin custom claim—not a Firestore role field—grants back-office access', async () => {
  await seed();
  await assertSucceeds(getDoc(doc(db(ids.admin, { admin: true }), 'users', ids.customer)));
  await assertSucceeds(updateDoc(doc(db(ids.admin, { admin: true }), 'users', ids.driver), { status: 'approved' }));
  assert.ok(true);
});
