import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { createAnalysisStore } from '../src/services/analysisStore.js';
import { memoryFirestore } from './memoryFirestore.js';
import { isGuestIdentity } from '../src/utils/identity.js';
const input=(uid,extra={})=>({uid,key:'forecast',kind:'forecast',input:{},isGuest:true,refresh:true,idempotencyKey:randomUUID(),...extra});
test('guest status comes only from Firebase verified claims',()=>{
  assert.equal(isGuestIdentity({isGuest:true,isAnonymous:true}),false);
  assert.equal(isGuestIdentity({firebase:{sign_in_provider:'anonymous'}}),true);
  assert.equal(isGuestIdentity({firebase:{sign_in_provider:'password'}}),false);
});
test('guest quota is smaller and upgrading keeps prior usage for the same UID',async()=>{
  const db=memoryFirestore(),store=createAnalysisStore(db);let calls=0;
  for(let i=0;i<3;i++)await store.execute(input('guest'),async()=>({value:++calls}));
  await assert.rejects(store.execute(input('guest'),async()=>assert.fail('guest quota bypass')),{status:429});
  await store.execute(input('guest',{isGuest:false}),async()=>({value:++calls}));assert.equal(calls,4);
  const guestUsage=[...db.docs.entries()].find(([key])=>key.endsWith('_guests'))[1];assert.equal(guestUsage.used,3);assert.deepEqual(guestUsage.active,{});
});
test('new anonymous UIDs cannot reset the shared guest budget',async()=>{
  const db=memoryFirestore(),store=createAnalysisStore(db),day=new Date().toISOString().slice(0,10);
  db.docs.set(`analysisUsage/${day}_guests`,{used:50,active:{}});
  await assert.rejects(store.execute(input('new-guest-id'),async()=>assert.fail('shared budget bypass')),{status:429});
  assert.equal(db.docs.has(`analysisUsage/${day}_global`),false);
});
test('guest leases release on provider failure without refunding potentially billable work',async()=>{
  const db=memoryFirestore(),store=createAnalysisStore(db);
  await assert.rejects(store.execute(input('failed-guest'),async()=>{throw new Error('timeout');}),/timeout/);
  const usage=[...db.docs.entries()].find(([key])=>key.endsWith('_guests'))[1];assert.equal(usage.used,1);assert.deepEqual(usage.active,{});
});
