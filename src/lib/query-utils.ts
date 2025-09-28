/**
 * Utility functions for React Query operations
 */

/**
 * Normalizes filter objects by removing undefined, null, empty strings, and empty arrays
 * This helps create consistent query keys and prevents unnecessary cache entries
 *
 * @param filters - The filter object to normalize
 * @returns A partial object with only truthy/meaningful values
 *
 * @example
 * normalizeFilters({ name: "test", empty: "", users: [], id: undefined })
 * // Returns: { name: "test" }
 */
export const normalizeFilters = <T extends Record<string, unknown>>(
  filters: T,
): Partial<T> => {
  return Object.fromEntries(
    Object.entries(filters).filter(([, value]) => {
      if (value === undefined || value === null) return false;
      if (typeof value === "string" && value.trim() === "") return false;
      if (Array.isArray(value) && value.length === 0) return false;
      return true;
    }),
  ) as Partial<T>;
};
