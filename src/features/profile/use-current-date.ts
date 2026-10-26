import { useEffect,useState } from 'react';
import { AppState } from 'react-native';
import { todayDate } from '@/features/reviews/review-logic';
import { millisecondsToLocalMidnight } from './profile-model';

export function useCurrentDate(){
  const [today,setToday]=useState(()=>todayDate());
  useEffect(()=>{
    let timer:ReturnType<typeof setTimeout>;
    const schedule=()=>{clearTimeout(timer);timer=setTimeout(()=>{setToday(todayDate());schedule();},millisecondsToLocalMidnight());};
    schedule();const listener=AppState.addEventListener('change',state=>{if(state==='active'){setToday(todayDate());schedule();}});
    return()=>{clearTimeout(timer);listener.remove();};
  },[]);
  return today;
}
