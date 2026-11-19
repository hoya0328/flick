// Isolated browser QA. Supabase is intercepted: no real login, signup or email.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
const require = createRequire(import.meta.url);
const runtime = process.env.FLICK_PLAYWRIGHT_DIR ?? path.join(os.homedir(), '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const { chromium } = require(runtime);
const base = process.argv[2] ?? 'http://localhost:8086';
const allowed = new URL(base);
assert.ok((allowed.protocol === 'http:' && ['localhost','127.0.0.1'].includes(allowed.hostname)) || (allowed.protocol === 'https:' && allowed.hostname === 'flick-film-journal--beta.expo.app'));
const smoke = process.argv.includes('--smoke');
const evidence = path.resolve('tmp/auth-design-20261120', smoke ? 'beta' : 'local');
await mkdir(evidence,{recursive:true});
const browser = await chromium.launch({headless:true,channel: process.env.FLICK_BROWSER_CHANNEL ?? 'chrome'});
const context = await browser.newContext({viewport:{width:402,height:875},deviceScaleFactor:1,serviceWorkers:'block'});
const calls=[]; const errors=[]; let signedIn=false, hold=0;
const fixtureUser={id:'00000000-0000-4000-8000-000000000001',aud:'authenticated',role:'authenticated',email:'viewer@example.test',user_metadata:{display_name:'테스트사용자'},app_metadata:{provider:'email',providers:['email']},created_at:'2026-11-20T00:00:00Z'};
await context.route('https://*.supabase.co/**', async route => {
  const request=route.request(), endpoint=new URL(request.url()).pathname;
  calls.push({endpoint,method:request.method()});
  const headers={'content-type':'application/json','access-control-allow-origin':'*'};
  if(endpoint.endsWith('/exhibition_status')) return route.fulfill({status:200,headers,body:JSON.stringify({open:true,aiAvailable:true,closesAt:'2026-11-23T15:00:00Z',verifiedUntil:'2026-11-23T15:00:00Z',dailyRemaining:100,minuteRemaining:10,guestRemaining:8})});
  if(hold)await new Promise(resolve=>setTimeout(resolve,hold));
  if(endpoint.endsWith('/signup')) return route.fulfill({status:200,headers,body:JSON.stringify({...fixtureUser,identities:[{id:'fixture'}]})});
  if(endpoint.endsWith('/recover')) return route.fulfill({status:200,headers,body:'{}'});
  if(endpoint.endsWith('/token') && signedIn) {
    const encode=value=>Buffer.from(JSON.stringify(value)).toString('base64url');
    const dummy=[encode({alg:'HS256',typ:'JWT'}),encode({sub:fixtureUser.id,role:'authenticated',aud:'authenticated',exp:Math.floor(Date.now()/1000)+3600}), 'test-signature-not-valid'].join('.');
    return route.fulfill({status:200,headers,body:JSON.stringify({access_token:dummy,refresh_token:'test-refresh-not-valid',token_type:'bearer',expires_in:3600,user:fixtureUser})});
  }
  if(endpoint.endsWith('/user') && signedIn) return route.fulfill({status:200,headers,body:JSON.stringify(fixtureUser)});
  if(endpoint.endsWith('/profiles') && signedIn) return route.fulfill({status:200,headers,body:JSON.stringify({id:fixtureUser.id,display_name:'테스트사용자',onboarding_at:'2026-11-20T00:00:00Z'})});
  if(endpoint.endsWith('/user_keywords') && signedIn) return route.fulfill({status:200,headers,body:JSON.stringify([{keyword_id:'warm'},{keyword_id:'romantic'},{keyword_id:'immersive'}])});
  if(endpoint.endsWith('/reviews') && signedIn) return route.fulfill({status:200,headers,body:'null'});
  return route.fulfill({status:400,headers,body:JSON.stringify({error:'invalid_grant',error_description:'Invalid login credentials',message:'Invalid login credentials'})});
});
const page=await context.newPage();
page.on('pageerror',error=>errors.push(String(error.message)));
async function ready(url='/welcome') {
  await page.goto(base+url,{waitUntil:'networkidle'});
  await page.evaluate(()=>document.fonts.ready);
  await page.getByLabel('이메일',{exact:true}).waitFor();
}
const near=(actual,expected,name)=>assert.ok(Math.abs(actual-expected)<1.1,`${name}: ${actual}, expected ${expected}`);
const box=async locator=>{const bounds=await locator.boundingBox();assert.ok(bounds);return bounds;};
const focused=label=>page.waitForFunction(value=>document.activeElement?.getAttribute('aria-label')===value,label);
try {
await ready();
const logo=await box(page.getByTestId('auth-brand')), email=await box(page.getByLabel('이메일',{exact:true})), password=await box(page.getByLabel('비밀번호',{exact:true})), login=await box(page.getByRole('button',{name:'로그인',exact:true})), guest=await box(page.getByRole('button',{name:'게스트로 로그인',exact:true}));
for(const [name,bounds,x,y,width,height] of [['logo',logo,84,175,234,68],['email',email,33,355,350,59],['password',password,33,430,350,59],['login',login,33,505,350,59],['guest',guest,33,744,350,59]]) {
  near(bounds.x,x,name+' x');near(bounds.y,y,name+' y');near(bounds.width,width,name+' width');near(bounds.height,height,name+' height');
}
assert.equal(await page.getByLabel('비밀번호',{exact:true}).getAttribute('type'),'password');
await page.screenshot({path:path.join(evidence,'login-402.png'),fullPage:true});
await page.getByRole('button',{name:'로그인',exact:true}).click();
await page.getByRole('alert').filter({hasText:'이메일을 입력해야 합니다.'}).waitFor();
await focused('이메일');assert.equal(calls.length,0);
await page.getByLabel('이메일',{exact:true}).fill('viewer@example.test');
await page.getByRole('button',{name:'로그인',exact:true}).click();
await page.getByRole('alert').filter({hasText:'비밀번호를 입력해야 합니다.'}).waitFor();
await focused('비밀번호');assert.equal(calls.length,0);
await page.getByRole('button',{name:'회원가입 화면 열기',exact:true}).click();
await page.getByLabel('닉네임',{exact:true}).waitFor();
assert.equal(await page.getByLabel('이메일',{exact:true}).inputValue(),'viewer@example.test');
assert.equal(await page.getByLabel('비밀번호',{exact:true}).inputValue(),'');
await page.getByLabel('이메일',{exact:true}).fill('');
await page.getByTestId('auth-brand').click();
await page.setViewportSize({width:402,height:1100});
await page.screenshot({path:path.join(evidence,'signup-402.png'),fullPage:true});
await page.setViewportSize({width:402,height:875});
await page.getByLabel('이메일',{exact:true}).fill('viewer@example.test');
await page.getByRole('button',{name:'회원가입',exact:true}).click();
await page.getByRole('alert').filter({hasText:'닉네임을 입력해야 합니다.'}).waitFor();
await focused('닉네임');
await page.getByLabel('닉네임',{exact:true}).fill('테스트사용자');
await page.getByLabel('비밀번호',{exact:true}).fill('sample2026');
await page.getByLabel('비밀번호 확인',{exact:true}).fill('different2026');
await page.getByRole('button',{name:'회원가입',exact:true}).click();
await page.getByRole('alert').filter({hasText:'두 비밀번호가 서로 같아야 합니다.'}).waitFor();
await focused('비밀번호 확인');assert.equal(calls.length,0);
if(!smoke) {
  await page.getByLabel('비밀번호 확인',{exact:true}).fill('sample2026'); hold=200;
  await page.getByRole('button',{name:'회원가입',exact:true}).click({clickCount:2});
  await page.getByText('가입 확인 메일을 보냈습니다. 이메일 인증 후 로그인해 주세요.',{exact:true}).waitFor();
  assert.equal(calls.filter(c=>c.endpoint.endsWith('/signup')).length,1); hold=0;
  assert.equal(await page.getByLabel('비밀번호',{exact:true}).inputValue(),'');
  await page.getByLabel('비밀번호',{exact:true}).fill('sample2026');
  await page.getByRole('button',{name:'로그인',exact:true}).click();
  await page.getByRole('alert').filter({hasText:'이메일 또는 비밀번호가 올바르지 않습니다.'}).waitFor();
  assert.ok(await page.getByLabel('비밀번호',{exact:true}).isEditable());
  await page.getByRole('button',{name:'비밀번호 찾기',exact:true}).click();
  await page.getByText('비밀번호 설정 링크를 이메일로 보냈습니다. 메일에서 새 비밀번호를 설정해 주세요.',{exact:true}).waitFor();
  assert.equal(calls.filter(c=>c.endpoint.endsWith('/recover')).length,1);
}
for(const width of [320,375,390,402,430,1280]) {
  await page.setViewportSize({width,height:740});await ready();
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth),width);
  const frame=await box(page.getByTestId('auth-frame'));near(frame.width,Math.min(width,402),'responsive frame');
  await page.getByRole('button',{name:'회원가입 화면 열기',exact:true}).click();
  await page.getByLabel('닉네임',{exact:true}).waitFor();
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth),width);
  await page.getByRole('button',{name:'회원가입',exact:true}).click();
  await page.getByRole('alert').filter({hasText:'닉네임을 입력해야 합니다.'}).waitFor();
  await focused('닉네임');
  if(width===320)await page.screenshot({path:path.join(evidence,'signup-error-320.png'),fullPage:true});
}
await ready('/welcome?returnTo='+encodeURIComponent('/review?id=00000000-0000-4000-8000-000000000001'));
assert.ok(await page.getByRole('button',{name:'로그인',exact:true}).isVisible());
// Visiting the guest landing must not create an anonymous account by itself.
const beforeGuest=calls.length;
await page.getByRole('button',{name:'게스트로 로그인',exact:true}).click();
await page.waitForURL('**/exhibition');
await page.waitForLoadState('networkidle');
assert.ok(calls.slice(beforeGuest).every(call=>call.endpoint.endsWith('/exhibition_status')));
if(!smoke) {
  await ready('/welcome?returnTo='+encodeURIComponent('/review?id=00000000-0000-4000-8000-000000000001'));
  await page.getByLabel('이메일',{exact:true}).fill('viewer@example.test');
  await page.getByLabel('비밀번호',{exact:true}).fill('sample2026');signedIn=true;
  await page.getByRole('button',{name:'로그인',exact:true}).click();
  await page.waitForURL('**/review?id=00000000-0000-4000-8000-000000000001');
}
assert.deepEqual(errors,[]);
await writeFile(path.join(evidence,'result.json'),JSON.stringify({passed:true,mockedAuthRequests:calls.length,realAuthRequests:0,errors,geometry:{logo,email,password,login,guest}},null,2));
console.log(`PASS auth design, signup, field focus, responsive widths and ${smoke?'read-only beta':'mocked account'} flow; no real auth writes.`);
} finally { await browser.close(); }
