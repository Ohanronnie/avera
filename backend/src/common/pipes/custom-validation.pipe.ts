import {
  ValidationPipe,
  ValidationError,
  BadRequestException,
} from '@nestjs/common';

export class CustomValidationPipe extends ValidationPipe {
  protected flattenValidationErrors(validationErrors: ValidationError[]): any {
    const field_errors: Record<string, string[]> = {};
    for (const error of validationErrors) {
      if (error.constraints) {
        field_errors[error.property] = Object.values(error.constraints);
      }
      // Handle nested validation errors if needed
      if (error.children && error.children.length > 0) {
        for (const child of error.children) {
          if (child.constraints) {
            field_errors[`${error.property}.${child.property}`] = Object.values(
              child.constraints,
            );
          }
        }
      }
    }
    return { fieldErrors: field_errors };
  }

  createExceptionFactory() {
    return (validationErrors: ValidationError[] = []) => {
      return new BadRequestException(
        this.flattenValidationErrors(validationErrors),
      );
    };
  }
}
