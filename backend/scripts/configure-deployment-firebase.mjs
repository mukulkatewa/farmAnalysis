import {readFile,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import app from '../src/config/firebase.js';
const project=app.options.projectId || process.env.FIREBASE_PROJECT_ID;
const {access_token}=await app.options.credential.getAccessToken();
const headers={Authorization:`Bearer ${access_token}`,'Content-Type':'application/json'};
async function request(url,method='GET',body){
  const response=await fetch(url,{method,headers,...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(20000)});
  if(!response.ok)throw new Error(`Firebase configuration ${method} failed with HTTP ${response.status}`);
  return response.json();
}
const authUrl=`https://identitytoolkit.googleapis.com/admin/v2/projects/${project}/config`;
const rulesBase=`https://firebaserules.googleapis.com/v1/projects/${project}`;
const mode=process.argv[2];
try {
  if(mode==='authorize-domain'){
    const hostname=new URL(process.argv[3]).hostname;
    const config=await request(authUrl),domains=config.authorizedDomains || [];
    if(!domains.includes(hostname))await request(authUrl+'?updateMask=authorizedDomains','PATCH',{authorizedDomains:[...domains,hostname]});
    console.info(JSON.stringify({authorizedDomain:hostname}));
  }else if(mode==='inspect-rules'){
    const release=await request(rulesBase+'/releases/cloud.firestore');
    const ruleset=await request('https://firebaserules.googleapis.com/v1/'+release.rulesetName);
    const files=ruleset.source.files;
    await writeFile('/tmp/farmAnalysis-firestore-rules-before-deployment.json',JSON.stringify({release,files},null,2),{mode:0o600});
    console.info(JSON.stringify({release:release.name,ruleFiles:files.map(f=>f.name),matchPaths:files.flatMap(f=>[...f.content.matchAll(/match\s+([^\s]+)\s*\{/g)].map(m=>m[1]))}));
  }else if(mode==='deploy-firestore-rules'){
    const content=await readFile(resolve(import.meta.dirname,'../../firestore.rules'),'utf8');
    const ruleset=await request(rulesBase+'/rulesets','POST',{source:{files:[{name:'firestore.rules',content}]}});
    await request(rulesBase+'/releases/cloud.firestore','PATCH',{release:{name:`projects/${project}/releases/cloud.firestore`,rulesetName:ruleset.name},updateMask:'rulesetName'});
    console.info(JSON.stringify({firestoreRulesDeployed:true,ruleset:ruleset.name}));
  }else throw new Error('Unknown deployment configuration operation');
}catch(error){console.error(JSON.stringify({error:error.message}));process.exitCode=1;}
