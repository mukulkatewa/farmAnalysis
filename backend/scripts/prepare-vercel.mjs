// Transfer allowlisted settings without exposing secret values in shell arguments/logs.
import { readFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { resolve } from 'node:path';
import { parse } from 'dotenv';
const root=resolve(import.meta.dirname,'../..');
const credentials=JSON.parse(await readFile(resolve(homedir(),'.local/share/com.vercel.cli/auth.json'),'utf8'));
if(!credentials.token)throw new Error('Vercel login is required');
const mode=process.argv[2];
const folder=['frontend','inspect-frontend'].includes(mode)?'frontend':'backend';
const project=JSON.parse(await readFile(resolve(root,folder,'.vercel/project.json'),'utf8'));
async function api(path,method='GET',body){
  const response=await fetch(`https://api.vercel.com${path}${path.includes('?')?'&':'?'}teamId=${encodeURIComponent(project.orgId)}`,{method,headers:{Authorization:`Bearer ${credentials.token}`,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(30000)});
  if(!response.ok){const data=await response.json().catch(()=>({}));throw new Error(`Vercel ${method} failed: HTTP ${response.status}, ${data.error?.code || 'unknown'}`);}
  return response.json();
}
async function environment(values){
  if(Object.keys(values).length)await api(`/v10/projects/${project.projectId}/env?upsert=true`,'POST',Object.entries(values).map(([key,value])=>({key,value:String(value),target:['production'],type:key.startsWith('VITE_')||key==='CORS_ORIGINS'?'plain':'sensitive'})));
  console.info(JSON.stringify({project:project.projectName || folder,configuredVariables:Object.keys(values).length}));
}
const httpsUrl=value=>{const url=new URL(value);if(url.protocol!=='https:')throw new Error('HTTPS deployment URL required');return url.origin;};
if(mode==='backend'){
  const env=parse(await readFile(resolve(root,'backend/.env')));
  const allowed=['FIREBASE_PROJECT_ID','FIREBASE_PRIVATE_KEY','FIREBASE_CLIENT_EMAIL','FIREBASE_DATABASE_URL','SENTINEL_CLIENT_ID','SENTINEL_CLIENT_SECRET','GROQ_API_KEY','GROQ_MODEL','LSTM_API_URL','COLLECTOR_API_URL','DISEASE_API_URL','PEST_API_URL','CLOUD_RUN_AUTH','ANALYSIS_USER_DAILY_LIMIT','ANALYSIS_GLOBAL_DAILY_LIMIT','ANALYSIS_USER_CONCURRENCY','ANALYSIS_GLOBAL_CONCURRENCY','ANALYSIS_GUEST_DAILY_LIMIT','ANALYSIS_GUEST_GLOBAL_DAILY_LIMIT','ANALYSIS_GUEST_GLOBAL_CONCURRENCY','NOTIFICATION_WEBHOOK_URL','NOTIFICATION_WEBHOOK_SECRET'];
  for(const key of ['FIREBASE_PROJECT_ID','FIREBASE_PRIVATE_KEY','FIREBASE_CLIENT_EMAIL'])if(!env[key])throw new Error(`Missing ${key}`);
  await api(`/v9/projects/${project.projectId}`,'PATCH',{framework:null,nodeVersion:'22.x',installCommand:'npm ci --omit=dev',buildCommand:null,outputDirectory:null});
  // Vercel disables require(ESM) by default; Firebase Admin 14's JWKS dependency needs it.
  await environment({...Object.fromEntries(allowed.filter(key=>env[key]).map(key=>[key,env[key]])),NODE_OPTIONS:'--experimental-require-module'});
}else if(mode==='frontend'){
  const env=parse(await readFile(resolve(root,'frontend/.env')));
  const allowed=['VITE_FIREBASE_API_KEY','VITE_FIREBASE_AUTH_DOMAIN','VITE_FIREBASE_PROJECT_ID','VITE_FIREBASE_STORAGE_BUCKET','VITE_FIREBASE_MESSAGING_SENDER_ID','VITE_FIREBASE_APP_ID','VITE_FIREBASE_MEASUREMENT_ID','VITE_GOOGLE_MAPS_API_KEY','VITE_OPENWEATHER_API_KEY'];
  for(const key of ['VITE_FIREBASE_API_KEY','VITE_FIREBASE_PROJECT_ID','VITE_FIREBASE_APP_ID'])if(!env[key])throw new Error(`Missing ${key}`);
  await api(`/v9/projects/${project.projectId}`,'PATCH',{framework:'vite',nodeVersion:'22.x',installCommand:'npm ci',buildCommand:'npm run build',outputDirectory:'dist'});
  await environment({...Object.fromEntries(allowed.filter(key=>env[key]).map(key=>[key,env[key]])),VITE_API_BASE_URL:httpsUrl(process.argv[3])+'/api'});
}else if(mode==='cors'){
  await environment({CORS_ORIGINS:httpsUrl(process.argv[3])});
}else if(mode==='inspect' || mode==='inspect-frontend'){
  const result=await api(`/v9/projects/${project.projectId}`);
  const domains=await api(`/v9/projects/${project.projectId}/domains`);
  console.info(JSON.stringify({id:result.id,name:result.name,framework:result.framework,resourceConfig:result.resourceConfig,domains:domains.domains?.map(d=>d.name)}));
}else throw new Error('Use backend, frontend <api-url>, cors <frontend-url>, or inspect');
