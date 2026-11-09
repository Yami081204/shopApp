const EMAIL_PATTERN = /^[A-Z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[A-Z0-9!#$%&'*+/=?^_`{|}~-]+)*@[A-Z0-9](?:[A-Z0-9-]{0,61}[A-Z0-9])?(?:\.[A-Z0-9](?:[A-Z0-9-]{0,61}[A-Z0-9])?)+$/i;
const PHONE_PATTERN = /^\+?[0-9](?:[0-9().\s-]*[0-9])?$/;
const NAME_PATTERN = /^\p{L}[\p{L}\p{M}]*(?:[ '-]\p{L}[\p{L}\p{M}]*)*$/u;
const hasControlCharacters = (value: string) => Array.from(value).some((character) => {
  const code = character.charCodeAt(0);
  return code < 32 || code === 127;
});

const normalizeName = (value: string) => value.trim().replace(/\s+/g, ' ');
const sanitizeNameInput = (value: string) => value.replace(/[^\p{L}\p{M} '-]/gu, '');

const getNameError = (value: string) => {
  const name = normalizeName(value);
  if (!name) return 'Vui lòng nhập họ tên.';
  if (name.length > 255) return 'Họ tên không được vượt quá 255 ký tự.';
  if (!NAME_PATTERN.test(name)) return 'Họ tên chỉ được chứa chữ cái, khoảng trắng, dấu nối hoặc dấu nháy.';
  return null;
};

const getEmailError = (value: string) => {
  const email = value.trim();
  if (!email) return 'Vui lòng nhập email.';
  const localPart = email.split('@')[0];
  if (email.length > 254 || localPart.length > 64 || !EMAIL_PATTERN.test(email)) {
    return 'Email không đúng định dạng.';
  }
  return null;
};

const getPhoneError = (value: string) => {
  const phone = value.trim();
  if (!phone) return null;
  const digitCount = phone.replace(/\D/g, '').length;
  if (!PHONE_PATTERN.test(phone) || hasControlCharacters(phone) || phone.length > 32 || digitCount < 7 || digitCount > 15) {
    return 'Số điện thoại phải có từ 7 đến 15 chữ số và chỉ chứa ký tự định dạng thông dụng.';
  }
  return null;
};

const getAddressError = (value: string) => {
  const address = value.trim();
  if (address.length > 255) return 'Địa chỉ không được vượt quá 255 ký tự.';
  if (hasControlCharacters(address)) return 'Địa chỉ chứa ký tự không hợp lệ.';
  return null;
};

const getPasswordError = (value: string) => {
  if (value.length < 8) return 'Mật khẩu phải có ít nhất 8 ký tự.';
  if (new TextEncoder().encode(value).length > 72) return 'Mật khẩu không được vượt quá 72 byte.';
  if (!/[A-Z]/.test(value) || !/\d/.test(value)) {
    return 'Mật khẩu phải có ít nhất một chữ in hoa và một chữ số.';
  }
  return null;
};

const getLoginPasswordError = (value: string) => {
  if (!value) return 'Vui lòng nhập mật khẩu.';
  return null;
};

export {
  getAddressError,
  getEmailError,
  getLoginPasswordError,
  getNameError,
  normalizeName,
  getPasswordError,
  getPhoneError,
  sanitizeNameInput
};
