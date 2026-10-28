import { test, expect } from '@playwright/test';
test.beforeEach(async({page})=>{
  // No real providers, backend, or map services are contacted by these UI tests.
  await page.route('**/api/**',route=>route.fulfill({contentType:'application/json',body:'null'}));
  await page.route('**/maps.googleapis.com/**',route=>route.abort());
  await page.route('**/*.tile.openstreetmap.org/**',route=>route.abort());
});
test('guest uses real anonymous auth, keeps its fields through signup, and never auto-analyzes',async({page})=>{
  const paid=[];page.on('request',request=>{if(request.method()==='POST' && /\/api\/(analyses|ai|analyze-ndvi)/.test(request.url()))paid.push(request.url());});
  await page.goto('/register');await expect(page.getByRole('heading',{name:'Create Account'})).toBeVisible();
  await page.screenshot({path:'/tmp/farm-signup-desktop.png',fullPage:true});
  await page.getByRole('button',{name:'Continue as guest'}).click();await expect(page).toHaveURL(/\/home$/);
  await expect(page.getByRole('button',{name:/Guest/})).toBeVisible();
  const uid=await page.evaluate(async()=>{
    const {auth,db}=await import('/src/firebase/firebase.js');const {setDoc,doc}=await import('/node_modules/.vite/deps/firebase_firestore.js');
    const uid=auth.currentUser.uid;
    await setDoc(doc(db,'users',uid,'fields','guest-field'),{fieldName:'Guest test field',coordinates:[{lat:0,lng:0},{lat:0,lng:.01},{lat:.01,lng:0}],lat:.003,lng:.003,createdAt:new Date().toISOString()});
    return uid;
  });
  await page.getByRole('button',{name:/Guest/}).click();await page.getByRole('button',{name:'Create an account'}).click();await expect(page.getByRole('heading',{name:'Create Account'})).toBeVisible();
  await page.getByPlaceholder('Enter Your Email').fill(`guest-${Date.now()}@example.com`);
  await page.getByPlaceholder('Enter Your Password').fill('Sample-password-84');await page.getByPlaceholder('Confirm Your Password').fill('Sample-password-84');
  await page.getByRole('button',{name:'SIGN UP',exact:true}).click();await expect(page).toHaveURL(/\/home$/);
  const result=await page.evaluate(async()=>{
    const {auth,db}=await import('/src/firebase/firebase.js');const {getDoc,doc}=await import('/node_modules/.vite/deps/firebase_firestore.js');
    return {uid:auth.currentUser.uid,isAnonymous:auth.currentUser.isAnonymous,hasField:(await getDoc(doc(db,'users',auth.currentUser.uid,'fields','guest-field'))).exists()};
  });
  expect(result).toEqual({uid,isAnonymous:false,hasField:true});expect(paid).toEqual([]);
});
test('mobile signup has no overflow, clear validation, and usable guest entry',async({page})=>{
  await page.setViewportSize({width:390,height:844});await page.goto('/register');
  await expect(page.getByRole('button',{name:'Continue as guest'})).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.getByPlaceholder('Enter Your Email').fill('farmer@example.com');await page.getByPlaceholder('Enter Your Password').fill('Password-123');await page.getByPlaceholder('Confirm Your Password').fill('Different-123');
  await page.getByRole('button',{name:'SIGN UP',exact:true}).click();await expect(page.getByRole('alert')).toContainText('Passwords do not match');
  await page.screenshot({path:'/tmp/farm-signup-mobile.png',fullPage:true});
});
test('login offers guest entry without requiring email fields',async({page})=>{
  await page.goto('/login');await expect(page.getByRole('heading',{name:'Login to AgriVision'})).toBeVisible();
  await page.getByRole('button',{name:'Continue as guest'}).click();await expect(page).toHaveURL(/\/home$/);
});
