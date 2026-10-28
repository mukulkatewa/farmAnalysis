import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../../firebase/firebase';
import { doContinueAsGuest } from '../../firebase/auth';
import { authErrorMessage } from './authErrors';

export function useGuestAccess(role) {
  const navigate=useNavigate();
  const [pending,setPending]=useState(false);
  const [error,setError]=useState('');
  const active=useRef(false);
  const continueAsGuest=async()=>{
    if(active.current)return;
    active.current=true;setPending(true);setError('');
    try {
      const {user}=await doContinueAsGuest();
      const userRef=doc(db,'users',user.uid),existing=await getDoc(userRef);
      const selectedRole=existing.data()?.userType || (role==='vendor'?'vendor':'farmer');
      if(!existing.exists() || !existing.data()?.userType)await setDoc(userRef,{userType:selectedRole,...(!existing.exists()?{createdAt:new Date().toISOString()}: {})},{merge:true});
      sessionStorage.setItem('userType',selectedRole);
      navigate('/home',{replace:true});
    }catch(failure){setError(authErrorMessage(failure));}
    finally{active.current=false;setPending(false);}
  };
  return {continueAsGuest,pending,error};
}
