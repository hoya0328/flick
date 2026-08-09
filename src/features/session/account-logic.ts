export type AccountField = 'nickname' | 'email' | 'password' | 'passwordConfirm';

export type AccountValidation = {
  field: AccountField;
  message: string;
} | null;

export function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

export function normalizeNickname(value: string) {
  return value.trim().replace(/\s+/g, ' ');
}

export function validateEmail(value: string): AccountValidation {
  const email = normalizeEmail(value);
  if (!email) return { field: 'email', message: '이메일을 입력해야 합니다.' };
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { field: 'email', message: '올바른 이메일 형식을 입력해야 합니다.' };
  }
  return null;
}

export function validateNickname(value: string): AccountValidation {
  const nickname = normalizeNickname(value);
  if (!nickname) return { field: 'nickname', message: '닉네임을 입력해야 합니다.' };
  if (nickname.length < 2 || nickname.length > 20) {
    return { field: 'nickname', message: '닉네임은 2~20자로 입력해야 합니다.' };
  }
  if (!/^[\p{L}\p{N}._ -]+$/u.test(nickname)) {
    return { field: 'nickname', message: '닉네임에는 글자, 숫자, 공백, ., _, -만 사용할 수 있습니다.' };
  }
  return null;
}

export function validatePassword(value: string): AccountValidation {
  if (!value) return { field: 'password', message: '비밀번호를 입력해야 합니다.' };
  if (value.length < 8 || value.length > 72) {
    return { field: 'password', message: '비밀번호는 8~72자로 입력해야 합니다.' };
  }
  if (!/[A-Za-z]/.test(value) || !/\d/.test(value)) {
    return { field: 'password', message: '비밀번호에 영문과 숫자를 각각 1개 이상 포함해야 합니다.' };
  }
  return null;
}

export function validatePasswordConfirmation(password: string, confirmation: string): AccountValidation {
  if (!confirmation) return { field: 'passwordConfirm', message: '비밀번호 확인을 입력해야 합니다.' };
  if (password !== confirmation) return { field: 'passwordConfirm', message: '두 비밀번호가 서로 같아야 합니다.' };
  return null;
}

export function accountErrorMessage(error: unknown) {
  const raw = error instanceof Error ? error.message : String(error ?? '');
  const message = raw.toLowerCase();

  if (message.includes('invalid login credentials')) return '이메일 또는 비밀번호가 올바르지 않습니다.';
  if (message.includes('user already registered') || message.includes('already been registered')) {
    return '이미 가입된 이메일입니다. 로그인하거나 비밀번호를 재설정해 주세요.';
  }
  if (message.includes('email rate limit')) return '이메일 발송 한도에 도달했습니다. 잠시 후 다시 시도해 주세요.';
  if (message.includes('password should be different')) return '기존과 다른 비밀번호를 입력해 주세요.';
  if (message.includes('auth session missing') || message.includes('session not found')) {
    return '로그인 정보가 만료되었습니다. 다시 로그인해 주세요.';
  }
  return raw || '계정 요청을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.';
}
