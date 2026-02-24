// Input sanitization to prevent XSS and injection attacks

/**
 * Removes HTML tags and dangerous characters from user input
 */
export function sanitizeString(input: string): string {
  if (typeof input !== 'string') return '';

  return input
    .replace(/[<>]/g, '') // Remove < and >
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+\s*=/gi, '') // Remove event handlers like onclick=
    .trim();
}

/**
 * Sanitizes an object by recursively sanitizing all string values
 */
export function sanitizeObject<T extends Record<string, unknown>>(obj: T): T {
  const sanitized = { ...obj };

  for (const key in sanitized) {
    const value = sanitized[key];

    if (typeof value === 'string') {
      sanitized[key] = sanitizeString(value) as T[Extract<keyof T, string>];
    } else if (Array.isArray(value)) {
      sanitized[key] = value.map((item) =>
        typeof item === 'string' ? sanitizeString(item) : item,
      ) as T[Extract<keyof T, string>];
    } else if (value !== null && typeof value === 'object') {
      sanitized[key] = sanitizeObject(
        value as Record<string, unknown>,
      ) as T[Extract<keyof T, string>];
    }
  }

  return sanitized;
}

/**
 * Validates and sanitizes email addresses
 */
export function sanitizeEmail(email: string): string {
  const sanitized = sanitizeString(email).toLowerCase();
  // Basic email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(sanitized) ? sanitized : '';
}

/**
 * Sanitizes MongoDB query operators to prevent NoSQL injection
 */
export function sanitizeMongoQuery<T extends Record<string, unknown>>(
  query: T,
): T {
  const sanitized = { ...query };

  for (const key in sanitized) {
    // Remove keys starting with $ (MongoDB operators)
    if (key.startsWith('$')) {
      delete sanitized[key];
      continue;
    }

    const value = sanitized[key];

    // Recursively sanitize nested objects
    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      sanitized[key] = sanitizeMongoQuery(
        value as Record<string, unknown>,
      ) as T[Extract<keyof T, string>];
    }
  }

  return sanitized;
}
