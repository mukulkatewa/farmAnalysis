import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  initializeTestEnvironment,
  assertSucceeds,
  assertFails,
} from "@firebase/rules-unit-testing";
const env = await initializeTestEnvironment({
  projectId: "demo-farm-analysis",
  firestore: {
    rules: await readFile(
      new URL("../../firestore.rules", import.meta.url),
      "utf8",
    ),
  },
  database: {
    rules: await readFile(
      new URL("../../database.rules.json", import.meta.url),
      "utf8",
    ),
  },
});
test.after(() => env.cleanup());
const field = {
  coordinates: [
    { lat: 0, lng: 0 },
    { lat: 0, lng: 0.01 },
    { lat: 0.01, lng: 0 },
  ],
};
test("owners can manage their fields, other users and anonymous clients cannot", async () => {
  const alice = env.authenticatedContext("alice").firestore(),
    bob = env.authenticatedContext("bob").firestore();
  await assertSucceeds(alice.doc("users/alice/fields/farm").set(field));
  await assertFails(bob.doc("users/alice/fields/farm").get());
  await assertFails(bob.doc("users/alice/fields/farm").set(field));
  await assertFails(
    env
      .unauthenticatedContext()
      .firestore()
      .doc("users/alice/fields/farm")
      .get(),
  );
});
test("clients cannot change quotas or forge saved analyses, even for themselves", async () => {
  const db = env.authenticatedContext("alice").firestore();
  for (const path of [
    "analysisUsage/global",
    "users/alice/analysisRuns/fake",
    "users/alice/analysisKeys/fake",
    "users/alice/analysisRequests/fake",
  ])
    await assertFails(db.doc(path).set({ used: 0, status: "complete" }));
  await assertFails(db.doc("users/alice").set({ role: "admin" }));
});
test("private profiles cannot be enumerated", async () => {
  const alice = env.authenticatedContext("alice").firestore();
  await assertSucceeds(
    alice.doc("users/alice").set({ firstName: "Alice", directoryOptIn: false }),
  );
  await assertFails(
    env.authenticatedContext("bob").firestore().doc("users/alice").get(),
  );
  await assertFails(alice.collection("users").get());
});
test("chat messages require membership and the real sender identity", async () => {
  const alice = env.authenticatedContext("alice").firestore(),
    bob = env.authenticatedContext("bob").firestore(),
    eve = env.authenticatedContext("eve").firestore();
  await assertSucceeds(alice.doc("conversations/alice_bob").get());
  await assertSucceeds(
    alice
      .doc("conversations/alice_bob")
      .set({ participants: ["alice", "bob"] }),
  );
  await assertSucceeds(
    bob
      .doc("conversations/alice_bob/messages/one")
      .set({ text: "Hello", senderId: "bob" }),
  );
  await assertFails(
    alice
      .doc("conversations/alice_bob/messages/two")
      .set({ text: "forged", senderId: "bob" }),
  );
  await assertFails(eve.doc("conversations/alice_bob/messages/one").get());
});
test("sensor readings require the owning identity and sensor claim; legacy shared data is blocked", async () => {
  const path = "users/alice/fields/farm/soil/reading";
  const sensor = env.authenticatedContext("alice", { sensor: true }).database();
  await assertSucceeds(sensor.ref(path).set({ nitrogen: 12 }));
  await assertSucceeds(
    env.authenticatedContext("alice").database().ref(path).once("value"),
  );
  await assertFails(
    env.authenticatedContext("bob").database().ref(path).once("value"),
  );
  await assertFails(
    env
      .authenticatedContext("alice")
      .database()
      .ref(path)
      .set({ nitrogen: 999 }),
  );
  await assertFails(sensor.ref("soil/reading").set({ nitrogen: 12 }));
  await assertSucceeds(
    env.authenticatedContext("alice").database().ref(path).remove(),
  );
});
