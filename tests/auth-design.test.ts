/// <reference types="node" />
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { authBrandAsset } from '../src/features/session/auth-brand-asset';
import { authDesign, validateAuthForm, type AuthValues } from '../src/features/session/welcome-model';

const valid: AuthValues = {nickname: '영화친구', email: 'viewer@example.test', password: 'sample2026', passwordConfirm: 'sample2026'};
const empty: AuthValues = {nickname: '', email: '', password: '', passwordConfirm: ''};

describe('Figma login and unified signup', () => {
  it('preserves the exact exported SVG rather than redrawing or rasterizing the logo', () => {
    expect(authBrandAsset.xml).toBe(readFileSync('assets/figma-auth/login-brand.svg','utf8').trim());
    expect(authBrandAsset.width).toBe(234); expect(authBrandAsset.height).toBe(68);
    expect(authBrandAsset.xml).toContain('viewBox="0 0 234 68"');
    expect(authBrandAsset.xml).not.toMatch(/<image|foreignObject|figma\.com|data:image/);
  });
  it('matches source dimensions, colors and typography with shared tokens', () => {
    expect(authDesign).toMatchObject({frameWidth:402,baseHeight:875,logoTop:175,formTopGap:112,leftInset:33,rightInset:19,controlHeight:59,controlRadius:50,fieldGap:16,fieldFontSize:16,buttonFontSize:20,background:'#FFFFFF',surface:'#F9FAFB',muted:'#99A1AF',primary:'#F8233C'});
    expect(authDesign.logoTop+authDesign.logoHeight+authDesign.formTopGap).toBe(355);
    expect(authDesign.frameWidth-authDesign.leftInset-authDesign.rightInset).toBe(350);
  });
  it('does not overflow at the supported small viewport widths', () => {
    for(const width of [320,375,390,402,430,1280]) {
      const frame = Math.min(width,authDesign.frameWidth);
      expect(frame-authDesign.leftInset-authDesign.rightInset).toBeGreaterThan(250);
      expect(authDesign.logoWidth).toBeLessThan(frame);
    }
  });
  it('keeps the login validation compatible with an existing account password', () => {
    expect(validateAuthForm('signIn',empty)?.field).toBe('email');
    expect(validateAuthForm('signIn',{...empty,email:valid.email})?.field).toBe('password');
    expect(validateAuthForm('signIn',{...empty,email:valid.email,password:'old'})).toBeNull();
  });
  it('reports the first missing signup field in screen order', () => {
    expect(validateAuthForm('signUp',empty)?.field).toBe('nickname');
    expect(validateAuthForm('signUp',{...empty,nickname:valid.nickname})?.field).toBe('email');
    expect(validateAuthForm('signUp',{...empty,nickname:valid.nickname,email:valid.email})?.field).toBe('password');
    expect(validateAuthForm('signUp',{...valid,passwordConfirm:''})?.field).toBe('passwordConfirm');
  });
  it('keeps password policy and confirmation checks on signup', () => {
    expect(validateAuthForm('signUp',valid)).toBeNull();
    expect(validateAuthForm('signUp',{...valid,password:'12345678'})?.field).toBe('password');
    expect(validateAuthForm('signUp',{...valid,passwordConfirm:'different'})?.field).toBe('passwordConfirm');
    expect(validateAuthForm('signUp',{...valid,nickname:'a'})?.field).toBe('nickname');
  });
  it('uses one shared input and button system for both modes, preserving actual guest entry', () => {
    const page=readFileSync('src/app/welcome.tsx','utf8'),ui=readFileSync('src/features/session/auth-ui.tsx','utf8');
    expect(page.match(/<AuthField /g)).toHaveLength(4);
    expect(page).toContain("authMode === 'signUp'"); expect(page).toContain('safeCommunityPath');
    expect(page).toContain('signUp(email, password, nickname)'); expect(page).toContain('signIn(email, password)');
    expect(page).toContain('sendPasswordReset(email)'); expect(page).toContain("router.push('/exhibition')");
    expect(page).not.toContain('BrandMark'); expect(page).not.toContain('어떻게 남겨야 할지');
    expect(ui).toContain('SvgXml xml={authBrandAsset.xml}'); expect(ui).toContain('fontFamily: homeFont');
  });
  it('keeps field guidance, password masking, duplicate-request guards and editable state', () => {
    const page=readFileSync('src/app/welcome.tsx','utf8'),ui=readFileSync('src/features/session/auth-ui.tsx','utf8');
    expect(page).toContain('inputs[issue.field].current?.focus()'); expect(page).toContain('scroll.current?.scrollTo');
    expect(page.match(/secureTextEntry/g)).toHaveLength(2); expect(page).toContain('if (lock.current || !backendConfigured) return;');
    expect(page).toContain('setPasswordConfirm(\'\')'); expect(ui).toContain('aria-invalid={Boolean(error)}');
    expect(page).toContain('confirmationRequired'); expect(page).toContain('editable={!busy}');
  });
});
