import {
  sanitizeString,
  sanitizeObject,
  sanitizeEmail,
  sanitizeMongoQuery,
} from './sanitize';

describe('Sanitization Utilities', () => {
  describe('sanitizeString', () => {
    it('should remove HTML tags', () => {
      expect(sanitizeString('<script>alert("xss")</script>')).toBe(
        'scriptalert("xss")/script',
      );
      expect(sanitizeString('Hello <b>World</b>')).toBe('Hello bWorld/b');
    });

    it('should remove javascript: protocol', () => {
      expect(sanitizeString('javascript:alert(1)')).toBe('alert(1)');
    });

    it('should remove event handlers', () => {
      expect(sanitizeString('onclick=alert(1)')).toBe('alert(1)');
      expect(sanitizeString('onload=malicious()')).toBe('malicious()');
    });

    it('should trim whitespace', () => {
      expect(sanitizeString('  hello  ')).toBe('hello');
    });

    it('should handle non-string input', () => {
      expect(sanitizeString(123 as unknown as string)).toBe('');
    });
  });

  describe('sanitizeObject', () => {
    it('should sanitize string values in object', () => {
      const input = {
        name: '<script>evil</script>',
        email: 'test@example.com',
      };
      const result = sanitizeObject(input);
      expect(result.name).toBe('scriptevil/script');
      expect(result.email).toBe('test@example.com');
    });

    it('should sanitize nested objects', () => {
      const input = {
        user: {
          name: '<b>Test</b>',
          bio: 'Hello <script>',
        },
      };
      const result = sanitizeObject(input);
      expect(result.user.name).toBe('bTest/b');
      expect(result.user.bio).toBe('Hello script');
    });

    it('should sanitize arrays of strings', () => {
      const input = {
        tags: ['<script>', 'normal', 'onclick=bad'],
      };
      const result = sanitizeObject(input);
      expect(result.tags).toEqual(['script', 'normal', 'bad']);
    });
  });

  describe('sanitizeEmail', () => {
    it('should sanitize and lowercase valid emails', () => {
      expect(sanitizeEmail('Test@Example.COM')).toBe('test@example.com');
    });

    it('should reject invalid emails', () => {
      expect(sanitizeEmail('not-an-email')).toBe('');
      expect(sanitizeEmail('missing@domain')).toBe('');
      expect(sanitizeEmail('@nodomain.com')).toBe('');
    });

    it('should remove dangerous characters from emails', () => {
      expect(sanitizeEmail('test<script>@example.com')).toBe(
        'testscript@example.com',
      );
    });
  });

  describe('sanitizeMongoQuery', () => {
    it('should remove MongoDB operators', () => {
      const input = {
        username: 'john',
        $where: 'malicious code',
        $gt: 100,
      };
      const result = sanitizeMongoQuery(input);
      expect(result.username).toBe('john');
      expect(result.$where).toBeUndefined();
      expect(result.$gt).toBeUndefined();
    });

    it('should sanitize nested query objects', () => {
      const input = {
        user: {
          name: 'john',
          $or: [{ age: 20 }, { age: 30 }],
        },
      };
      const result = sanitizeMongoQuery(input);
      expect(result.user.name).toBe('john');
      expect(result.user.$or).toBeUndefined();
    });

    it('should preserve valid query fields', () => {
      const input = {
        username: 'john',
        age: 25,
        active: true,
      };
      const result = sanitizeMongoQuery(input);
      expect(result).toEqual(input);
    });
  });
});
