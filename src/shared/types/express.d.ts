// Extend Express Request to include custom properties.
// Add fields here as needed (e.g., userId for auth)

declare namespace Express {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface Request {
    // Add custom properties here
  }
}
