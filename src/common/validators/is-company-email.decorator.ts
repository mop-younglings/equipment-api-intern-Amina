import {
  registerDecorator,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';
import {
  COMPANY_EMAIL_DOMAIN,
  COMPANY_EMAIL_MESSAGE,
} from '../constants/auth.constants';

@ValidatorConstraint({ name: 'isCompanyEmail', async: false })
export class IsCompanyEmailConstraint implements ValidatorConstraintInterface {
  validate(email: unknown): boolean {
    if (typeof email !== 'string') {
      return false;
    }

    const normalized = email.trim().toLowerCase();
    return normalized.endsWith(`@${COMPANY_EMAIL_DOMAIN}`);
  }

  defaultMessage(): string {
    return COMPANY_EMAIL_MESSAGE;
  }
}

export function IsCompanyEmail(
  validationOptions?: ValidationOptions,
): PropertyDecorator {
  return (object: object, propertyName: string | symbol) => {
    registerDecorator({
      target: object.constructor,
      propertyName: String(propertyName),
      options: validationOptions,
      constraints: [],
      validator: IsCompanyEmailConstraint,
    });
  };
}
