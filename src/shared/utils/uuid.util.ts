/**
 * UUID validation utility
 * Validates UUID v4 format before database queries to prevent ORM exceptions
 */

// UUID v4 validation regex
const UUID_V4_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Validates if a string is a valid UUID v4 format
 * @param id - The string to validate
 * @returns true if valid UUID v4, false otherwise
 */
export function isValidUUID(id: string): boolean {
  if (!id || typeof id !== 'string') {
    return false;
  }
  return UUID_V4_REGEX.test(id.trim());
}

/**
 * Validates UUID and throws error if invalid
 * @param id - The UUID to validate
 * @param entityName - Name of the entity for error message (e.g., 'Workspace')
 * @throws Error if UUID is invalid
 */
export function validateUUID(id: string, entityName: string = 'Entity'): void {
  if (!isValidUUID(id)) {
    throw new Error(`${entityName} not found`);
  }
}

