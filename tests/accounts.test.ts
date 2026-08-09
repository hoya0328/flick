import { describe, expect, it } from 'vitest';

import {
  accountErrorMessage,
  normalizeEmail,
  normalizeNickname,
  validateEmail,
  validateNickname,
  validatePassword,
  validatePasswordConfirmation,
} from '../src/features/session/account-logic';

describe('account validation', () => {
  it('normalizes email and nickname input', () => {
    expect(normalizeEmail('  User@Example.COM ')).toBe('user@example.com');
    expect(normalizeNickname('  영화   친구  ')).toBe('영화 친구');
  });

  it('accepts a normal signup payload', () => {
    expect(validateEmail('user@example.com')).toBeNull();
    expect(validateNickname('영화친구_01')).toBeNull();
    expect(validatePassword('flick2026')).toBeNull();
    expect(validatePasswordConfirmation('flick2026', 'flick2026')).toBeNull();
  });

  it('rejects invalid account fields', () => {
    expect(validateEmail('user')).toEqual(expect.objectContaining({ field: 'email' }));
    expect(validateNickname('a')).toEqual(expect.objectContaining({ field: 'nickname' }));
    expect(validateNickname('영화🎬')).toEqual(expect.objectContaining({ field: 'nickname' }));
    expect(validatePassword('password')).toEqual(expect.objectContaining({ field: 'password' }));
    expect(validatePasswordConfirmation('flick2026', 'flick2027')).toEqual(expect.objectContaining({ field: 'passwordConfirm' }));
  });

  it('turns Supabase login failures into useful Korean copy', () => {
    expect(accountErrorMessage(new Error('Invalid login credentials'))).toContain('이메일 또는 비밀번호');
    expect(accountErrorMessage(new Error('Email rate limit exceeded'))).toContain('발송 한도');
  });
});
