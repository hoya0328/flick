type LocalRecognition = { lang:string; processLocally:boolean; continuous:boolean; interimResults:boolean; onresult:((event:{results: {isFinal:boolean; [key:number]:{transcript:string}}[]; resultIndex:number})=>void)|null; onend:(()=>void)|null; onerror:((event:{error:string})=>void)|null; start:()=>void; abort:()=>void };
type RecognitionConstructor = { new():LocalRecognition; available?:(options:{langs:string[];processLocally:true})=>Promise<string> };
export async function startCoreSpeech(onText:(text:string)=>void,onEnd:()=>void):Promise<()=>void> {
  const host=window as unknown as {SpeechRecognition?:RecognitionConstructor;webkitSpeechRecognition?:RecognitionConstructor};
  const Recognition=host.SpeechRecognition ?? host.webkitSpeechRecognition;
  const unavailable='이 브라우저는 한국어 무료 기기 내 인식을 지원하지 않아요. 음성을 외부 AI로 전송하지 않으며, 키보드 음성 입력이나 직접 입력을 이용할 수 있어요.';
  if(!Recognition || !('processLocally' in Recognition.prototype) || !Recognition.available) throw new Error(unavailable);
  if(await Recognition.available({langs:['ko-KR'],processLocally:true})!=='available') throw new Error(unavailable);
  const recognition=new Recognition();
  recognition.lang='ko-KR';recognition.processLocally=true;recognition.continuous=true;recognition.interimResults=false;
  recognition.onresult=(event)=>{for(let i=event.resultIndex;i<event.results.length;i++){if(event.results[i]?.isFinal)onText(event.results[i]![0]!.transcript);}};
  recognition.onend=onEnd;recognition.onerror=onEnd;
  recognition.start();
  return()=>{recognition.onresult=null;recognition.abort();onEnd();};
}
