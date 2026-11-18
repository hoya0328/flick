import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { execFileSync, spawnSync } from 'node:child_process';
import { runInNewContext } from 'node:vm';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { hardenPicomatchSource, repeatedExtglobGuard } from '../scripts/security-picomatch.mjs';

const require = createRequire(import.meta.url);
const entries = ['picomatch', 'micromatch/node_modules/picomatch', 'jest-util/node_modules/picomatch'];
const resolveEntry = (entry: string) => path.resolve('node_modules', entry.replace(/^picomatch$/, 'picomatch'), 'lib/parse.js');

describe('reviewed fail-closed picomatch repeated-extglob boundary', () => {
  it('reproduces the original 4.0.7 ReDoS only in a timeout-limited child', () => {
    const entry = resolveEntry('picomatch');
    const source = `const fs=require('fs'),vm=require('vm'),m=require('module');const file=${JSON.stringify(entry)};const text=fs.readFileSync(file,'utf8').replace(${JSON.stringify(repeatedExtglobGuard)},'');const mod={exports:{}};vm.runInNewContext(text,{module:mod,exports:mod.exports,require:m.createRequire(file),process});const state=mod.exports('+(*a)',{fastpaths:false});new RegExp('^(?:'+state.output+')$').test('a'.repeat(40)+'!');`;
    const result = spawnSync(process.execPath, ['--max-old-space-size=96', '-e', source], { timeout:1000, encoding:'utf8', maxBuffer:5000 });
    expect((result.error as NodeJS.ErrnoException | undefined)?.code).toBe('ETIMEDOUT');
  });

  it.each(entries)('blocks advisory vectors and option-based bypass in %s', entry => {
    const matcher = require(path.resolve('node_modules', entry));
    for(const glob of ['+(*)','+(*a)','*(a*)','+(+(a))','+(a|aa)','+(a|a)','+(|a)','+({a,b})']) {
      for(const options of [{}, {maxExtglobRecursion:false}, {fastpaths:false}]) {
        expect(()=>matcher(glob,options)).toThrow(/Unsupported repeated extglob/);
      }
    }
  });

  it.each(entries)('preserves normal project globs and prefix-free literal extglobs in %s', entry => {
    const matcher = require(path.resolve('node_modules',entry));
    for(const [glob,yes,no] of [
      ['src/**/*.{ts,tsx}','src/app/welcome.tsx','src/app/photo.png'],
      ['**/!(*.test).ts','src/film.ts','src/film.test.ts'],
      ['**/?(*.)+(spec|test).[jt]s?(x)','src/film.test.tsx','src/film.ts'],
      ['@(movie|review)/*.ts','movie/detail.ts','profile/detail.ts'],
      ['+(abc|xyz)','abcxyzabc','abca'],
      ['+(영화|기록)','영화기록','영화감상'],
    ]) {
      expect(matcher(glob)(yes),glob).toBe(true);
      expect(matcher(glob)(no),glob).toBe(false);
    }
  });

  it('bounds large/empty repeated alternatives before regex compilation', () => {
    const match = require('picomatch');
    expect(()=>match('+('+Array.from({length:33},(_,n)=>'item'+n).join('|')+')')).toThrow();
    expect(()=>match('+('+'a'.repeat(4097)+')')).toThrow();
    expect(()=>match('+()')).toThrow();
  });
  it.each(entries)('prevents case-folded branch ambiguity in %s',entry=>{
    const match=require(path.resolve('node_modules',entry));
    for(const options of [{nocase:true},{flags:'i'},{flags:'iu'}]) {
      expect(()=>match('+(a|AA)',options)).toThrow(/Unsupported/);
      expect(()=>match('+(K|K)',options)).toThrow(/Unsupported/);
      expect(match('+(spec|test)',options)('SPECtest')).toBe(true);
    }
  });

  it('fails closed on altered upstream source and is idempotent for supported releases', () => {
    for(const entry of entries) {
      const file=resolveEntry(entry);
      const source=readFileSync(file,'utf8');
      const metadata=JSON.parse(readFileSync(path.resolve(path.dirname(file),'../package.json'),'utf8'));
      const original=source.replace(repeatedExtglobGuard,'');
      expect(hardenPicomatchSource(original,metadata.version)).toBe(source);
      expect(hardenPicomatchSource(source,metadata.version)).toBe(source);
      expect(()=>hardenPicomatchSource(original+'\n// changed',metadata.version)).toThrow(/differs/);
      expect(()=>hardenPicomatchSource(original,'9.0.0')).toThrow(/Review/);
    }
    expect(execFileSync(process.execPath,['scripts/security-picomatch.mjs','--check'],{encoding:'utf8'})).toContain('3 picomatch installations');
  });

  it('uses the consumer-facing parser and keeps registry versions truthful', () => {
    const entry=resolveEntry('picomatch');
    const source=readFileSync(entry,'utf8');
    const module={exports:undefined as unknown};
    runInNewContext(source,{module,require:createRequire(entry),process});
    expect(()=> (module.exports as (glob:string,options:object)=>unknown)('+(*a)',{})).toThrow();
    expect(JSON.parse(readFileSync('node_modules/picomatch/package.json','utf8')).version).toBe('4.0.7');
    const scripts=JSON.parse(readFileSync('package.json','utf8')).scripts;
    for(const command of ['postinstall','prestart','preweb','check','build:web']) expect(scripts[command]).toContain('security-picomatch.mjs');
  });
});

describe('official node-forge patched release through Expo signing consumer',()=>{
  it('installs 1.4.3 and keeps RSA certificate signing and verification working',()=>{
    const expoRequire=createRequire(require.resolve('expo/package.json'));
    const cliRequire=createRequire(expoRequire.resolve('@expo/cli/package.json'));
    const signingRequire=createRequire(cliRequire.resolve('@expo/code-signing-certificates'));
    const forge = signingRequire('node-forge');
    expect(signingRequire('node-forge/package.json').version).toBe('1.4.3');
    const keys=forge.pki.rsa.generateKeyPair({bits:2048,e:0x10001});
    const cert=forge.pki.createCertificate();
    cert.publicKey=keys.publicKey;cert.serialNumber='01';cert.validity.notBefore=new Date('2026-01-01');cert.validity.notAfter=new Date('2027-01-01');
    cert.setSubject([{name:'commonName',value:'Synthetic FLICK signing test'}]);cert.setIssuer(cert.subject.attributes);cert.sign(keys.privateKey,forge.md.sha256.create());
    expect(cert.verify(cert)).toBe(true);
    const pem=forge.pki.certificateToPem(cert);
    expect(forge.pki.certificateFromPem(pem).serialNumber).toBe('01');
    const signature=keys.privateKey.sign(forge.md.sha256.create().update('synthetic artifact'));
    expect(keys.publicKey.verify(forge.md.sha256.create().update('synthetic artifact').digest().bytes(),signature)).toBe(true);
    expect(keys.publicKey.verify(forge.md.sha256.create().update('modified artifact').digest().bytes(),signature)).toBe(false);
  });
});
