import { validateEmail, validateNickname, validatePassword, validatePasswordConfirmation } from './account-logic';

export type AuthMode = 'signIn' | 'signUp';
export type AuthValues = { nickname: string; email: string; password: string; passwordConfirm: string };

export function validateAuthForm(mode: AuthMode, values: AuthValues) {
  return mode === 'signUp'
    ? validateNickname(values.nickname) ?? validateEmail(values.email) ?? validatePassword(values.password) ?? validatePasswordConfirmation(values.password, values.passwordConfirm)
    : validateEmail(values.email) ?? (!values.password ? { field: 'password' as const, message: '비밀번호를 입력해야 합니다.' } : null);
}

// Figma 51:422 at 402 × 875. Keep the source's intentional 33/19px insets.
export const authDesign = {
  frameWidth: 402, baseHeight: 875, logoWidth: 234, logoHeight: 68, logoTop: 175,
  formTopGap: 112, leftInset: 33, rightInset: 19, controlHeight: 59, controlRadius: 50,
  fieldGap: 16, inputInset: 31.5166, fieldFontSize: 16, buttonFontSize: 20,
  background: '#FFFFFF', surface: '#F9FAFB', muted: '#99A1AF', primary: '#F8233C', text: '#17191C',
} as const;
