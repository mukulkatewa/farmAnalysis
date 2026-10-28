import test from 'node:test';
import assert from 'node:assert/strict';
import { createAuthActions } from '../src/firebase/authActions.js';
import { authErrorMessage } from '../src/components/auth/authErrors.js';

function fixture(user = null) {
  const calls=[];
  const auth={currentUser:user};
  const account={uid:user?.uid || 'new-user',isAnonymous:false,getIdToken:async force=>calls.push(['token',force])};
  const sdk={
    signInAnonymously:async()=>{calls.push(['anonymous']);return {user:{uid:'guest',isAnonymous:true}};},
    createUserWithEmailAndPassword:async()=>{calls.push(['create']);return {user:account};},
    linkWithCredential:async current=>{calls.push(['link-email',current.uid]);return {user:account};},
    linkWithPopup:async current=>{calls.push(['link-google',current.uid]);return {user:account};},
    signInWithPopup:async()=>{calls.push(['sign-in-google']);return {user:account};},
    EmailAuthProvider:{credential:(email,password)=>({email,password})},
    GoogleAuthProvider:class {},
  };
  return {auth,sdk,calls,actions:createAuthActions(auth,sdk)};
}
test('guest continuation reuses an existing identity instead of resetting quotas',async()=>{
  const existing={uid:'guest-owned-fields',isAnonymous:true};const f=fixture(existing);
  assert.equal((await f.actions.guest()).user,existing);assert.deepEqual(f.calls,[]);
});
test('only an explicit guest action creates an anonymous identity',async()=>{
  const f=fixture();assert.deepEqual(f.calls,[]);assert.equal((await f.actions.guest()).user.uid,'guest');assert.deepEqual(f.calls,[['anonymous']]);
});
test('email upgrade links credentials to the guest UID and refreshes its token',async()=>{
  const f=fixture({uid:'guest-owned-fields',isAnonymous:true});
  assert.equal((await f.actions.createAccount('farmer@example.com','password')).user.uid,'guest-owned-fields');
  assert.deepEqual(f.calls,[['link-email','guest-owned-fields'],['token',true]]);
});
test('Google upgrade links the guest; collision never silently switches accounts',async()=>{
  const f=fixture({uid:'guest-owned-fields',isAnonymous:true});await f.actions.google();assert.equal(f.calls[0][0],'link-google');
  f.sdk.linkWithPopup=async()=>{throw Object.assign(new Error('collision'),{code:'auth/credential-already-in-use'});};
  await assert.rejects(f.actions.google(),{code:'auth/credential-already-in-use'});
  assert.ok(!f.calls.some(([name])=>name==='sign-in-google'));
});
test('explicit login can switch to an existing Google account',async()=>{
  const f=fixture({uid:'guest',isAnonymous:true});await f.actions.google({upgrade:false});assert.deepEqual(f.calls,[['sign-in-google']]);
});
test('auth failures are readable and never expose provider internals',()=>{
  assert.match(authErrorMessage({code:'auth/credential-already-in-use'}),/keep this guest workspace/);
  assert.ok(!authErrorMessage({message:'sensitive provider response'}).includes('sensitive'));
});
