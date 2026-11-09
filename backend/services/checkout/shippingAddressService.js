import AppError from '../../utils/AppError.js';
import { parsePositiveInteger } from '../../utils/parsePositiveInteger.js';

const NAME_PATTERN = /^\p{L}[\p{L}\p{M}]*(?:[ '-]\p{L}[\p{L}\p{M}]*)*$/u;
const PHONE_PATTERN = /^\+?[0-9](?:[0-9().\s-]*[0-9])?$/;
const EMAIL_PATTERN = /^[A-Z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[A-Z0-9!#$%&'*+/=?^_`{|}~-]+)*@[A-Z0-9](?:[A-Z0-9-]{0,61}[A-Z0-9])?(?:\.[A-Z0-9](?:[A-Z0-9-]{0,61}[A-Z0-9])?)+$/i;
const ALLOWED_COUNTRIES = new Set([
  'Vietnam', 'United States', 'Canada', 'United Kingdom', 'Australia'
]);

const validateAddressData = ({ recipientName, phone, address }, email, input) => {
  const normalizedName = String(recipientName ?? '').trim().replace(/\s+/g, ' ');
  const normalizedPhone = String(phone ?? '').trim();
  const normalizedEmail = typeof email === 'string' ? email.trim() : '';
  const digitCount = normalizedPhone.replace(/\D/g, '').length;
  const hasControlCharacters = (value) => /[\u0000-\u001f\u007f]/.test(value);

  if (!NAME_PATTERN.test(normalizedName) || normalizedName.length > 255) {
    throw new AppError('Recipient name must contain only letters, spaces, hyphens or apostrophes', 400, 'VALIDATION_ERROR');
  }
  if (!PHONE_PATTERN.test(normalizedPhone) || digitCount < 7 || digitCount > 15 || normalizedPhone.length > 32) {
    throw new AppError('Phone number must contain 7 to 15 digits and valid formatting characters', 400, 'VALIDATION_ERROR');
  }
  if (normalizedEmail.length > 254 || !EMAIL_PATTERN.test(normalizedEmail)) {
    throw new AppError('A valid email address is required', 400, 'VALIDATION_ERROR');
  }
  const streetAddress = typeof input.addressLine === 'string' ? input.addressLine.trim() : '';
  if (!streetAddress || streetAddress.length > 255 || hasControlCharacters(streetAddress)) {
    throw new AppError('Street address is required and must be 255 characters or fewer', 400, 'VALIDATION_ERROR');
  }
  if (address.length > 255) {
    throw new AppError('Combined shipping address must be 255 characters or fewer', 400, 'VALIDATION_ERROR');
  }

  for (const [field, value] of Object.entries({
    city: input.city,
    province: input.state,
    postalCode: input.postalCode,
    country: input.country
  })) {
    const text = typeof value === 'string' ? value.trim() : '';
    const maxLength = field === 'postalCode' ? 32 : 255;
    if (text.length > maxLength || hasControlCharacters(text)) {
      throw new AppError(`${field} contains invalid data`, 400, 'VALIDATION_ERROR');
    }
  }
  const country = typeof input.country === 'string' ? input.country.trim() : 'Vietnam';
  if (!ALLOWED_COUNTRIES.has(country)) {
    throw new AppError('Shipping country is not supported', 400, 'VALIDATION_ERROR');
  }
  if (!String(input.city ?? '').trim()) {
    throw new AppError('City or province is required', 400, 'VALIDATION_ERROR');
  }
  if (country === 'Vietnam' && !String(input.state ?? '').trim()) {
    throw new AppError('Ward or commune is required for Vietnam addresses', 400, 'VALIDATION_ERROR');
  }
  return {
    recipientName: normalizedName,
    phone: normalizedPhone,
    address
  };
};

const createShippingAddressService = ({ addressRepository }) => ({
  async resolve(userId, input, transaction) {
    if (input.addressId) {
      const address = await addressRepository.findAddress(
        userId,
        parsePositiveInteger(input.addressId, 'addressId'),
        transaction
      );
      if (!address) throw new AppError('Shipping address not found', 404, 'NOT_FOUND');
      const resolvedAddress = {
        recipientName: address.recipientName,
        phone: address.phone,
        address: [
          address.addressLine,
          address.ward,
          address.district,
          address.city,
          address.province,
          address.postalCode,
          address.country
        ].filter(Boolean).join(', ')
      };
      return validateAddressData(resolvedAddress, input.email, {
        addressLine: address.addressLine,
        city: address.city || address.province || '',
        state: address.ward || '',
        postalCode: address.postalCode || '',
        country: address.country || 'Vietnam'
      });
    }

    const addressLine = typeof input.address === 'string' ? input.address.trim() : '';
    const city = typeof input.city === 'string' ? input.city.trim() : '';
    const province = typeof input.state === 'string' ? input.state.trim() : '';
    const country = typeof input.country === 'string' ? input.country.trim() : 'Vietnam';
    const phone = typeof input.phone === 'string' ? input.phone.trim() : '';
    const recipientName = [input.firstName, input.lastName]
      .filter((name) => typeof name === 'string')
      .map((name) => name.trim())
      .filter(Boolean)
      .join(' ');
    const resolvedAddress = {
      recipientName,
      phone,
      address: [addressLine, city, province, input.postalCode, country].filter(Boolean).join(', ')
    };
    validateAddressData(resolvedAddress, input.email, {
      addressLine,
      city,
      state: province,
      postalCode: input.postalCode,
      country
    });
    return resolvedAddress;
  }
});

export { createShippingAddressService };
