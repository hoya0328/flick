export async function startCoreSpeech(_onText:(text:string)=>void, _onEnd:()=>void):Promise<()=>void> {
  throw new Error('이 환경은 무료 기기 내 음성 입력을 지원하지 않아요. 키보드의 음성 입력이나 직접 입력을 이용해 주세요.');
}
