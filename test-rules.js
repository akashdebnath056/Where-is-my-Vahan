import { readFileSync } from 'fs';
import { initializeTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing';

async function main() {
  const projectId = 'test-project-' + Date.now();
  const testEnv = await initializeTestEnvironment({
    projectId,
    firestore: {
      rules: readFileSync('firestore.rules', 'utf8'),
    },
  });

  const dbAuthed = testEnv.authenticatedContext('user123').firestore();
  const dbUnauthed = testEnv.unauthenticatedContext().firestore();

  // Test 1: Seed Routes
  try {
    await assertSucceeds(dbUnauthed.doc('routes/r1').set({ id: 'r1', name: 'Test' }, { merge: true }));
    console.log('Test 1 (Seed Routes) PASSED');
  } catch (e) {
    console.log('Test 1 FAILED', e);
  }

  // Test 2: Custom Route
  try {
    await assertSucceeds(dbAuthed.doc('routes/route-user123').set({ id: 'route-user123', name: 'Custom' }));
    console.log('Test 2 (Custom Route) PASSED');
  } catch (e) {
    console.log('Test 2 FAILED', e);
  }

  // Test 3: Driver Profile Create
  try {
    await assertSucceeds(dbAuthed.doc('drivers/user123').set({
      registrationNumber: 'TR01',
      driverName: 'John',
      routeId: 'r1',
      updatedAt: 123456789
    }, { merge: true }));
    console.log('Test 3 (Driver Profile Create) PASSED');
  } catch (e) {
    console.log('Test 3 FAILED', e.message);
  }

  // Test 4: Driver Bus Broadcast Create
  try {
    await assertSucceeds(dbAuthed.doc('buses/user123').set({
      id: 'TR01',
      routeId: 'r1',
      lat: 23.0,
      lng: 91.0,
      status: 'In Transit',
      driverId: 'user123',
      lastUpdated: 123456789
    }, { merge: true }));
    console.log('Test 4 (Bus Broadcast Create) PASSED');
  } catch (e) {
    console.log('Test 4 FAILED', e.message);
  }

  // Test 5: Crowdsourced Bus Broadcast
  try {
    await assertSucceeds(dbAuthed.doc('buses/TR01A').set({
      id: 'TR01A',
      routeId: 'r2',
      lat: 23.0,
      lng: 91.0,
      status: 'In Transit',
      driverId: 'crowdsourced',
      lastUpdated: 123456789
    }, { merge: true }));
    console.log('Test 5 (Crowdsourced Bus) PASSED');
  } catch (e) {
    console.log('Test 5 FAILED', e.message);
  }

  await testEnv.cleanup();
  process.exit(0);
}

main().catch(console.error);
