// Extend Express Request to include custom properties.
// Add fields here as needed (e.g., userId for auth)

declare namespace Express {
  interface Request {
    apiClient?: {
      keyId: string;
      serviceName: string;
      status: 'active' | 'inactive';
    };
  }
}
