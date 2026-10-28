// Read-only by default. Enabling requires an explicit --enable argument.
import app from '../src/config/firebase.js';
const project=app.options.projectId || process.env.FIREBASE_PROJECT_ID;
if(!project)throw new Error('FIREBASE_PROJECT_ID is required');
try {
  const {access_token}=await app.options.credential.getAccessToken();
  const url=`https://identitytoolkit.googleapis.com/admin/v2/projects/${encodeURIComponent(project)}/config`;
  const headers={Authorization:`Bearer ${access_token}`,'Content-Type':'application/json'};
  const read=await fetch(url,{headers,signal:AbortSignal.timeout(15000)});
  if(!read.ok){console.error(JSON.stringify({status:read.status,error:'Cannot read Firebase auth configuration with the configured service account.'}));process.exitCode=1;}
  else {
    const config=await read.json();
    let enabled=config.signIn?.anonymous?.enabled === true;
    if(!enabled && process.argv.includes('--enable')) {
      const update=await fetch(url+'?updateMask=signIn.anonymous.enabled',{method:'PATCH',headers,body:JSON.stringify({signIn:{anonymous:{enabled:true}}}),signal:AbortSignal.timeout(15000)});
      if(!update.ok)throw new Error(`Cannot enable anonymous authentication (HTTP ${update.status})`);
      enabled=(await update.json()).signIn?.anonymous?.enabled === true;
    }
    console.info(JSON.stringify({project,anonymousEnabled:enabled}));
  }
}catch(error){console.error(JSON.stringify({error:error.message?.includes('HTTP')?error.message:'Could not verify Firebase anonymous authentication configuration.'}));process.exitCode=1;}
