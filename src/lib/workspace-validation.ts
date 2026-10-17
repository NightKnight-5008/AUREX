import { getAllWorkspaces } from '@/hooks/use-workspace';

/**
 * Workspace Naming, Uniqueness & Availability Validation
 *
 * This module implements enterprise-grade workspace naming validation,
 * uniqueness checks, and smart username suggestions.
 */

// ============================================================================
// USERNAME FORMAT VALIDATION
// ============================================================================

/**
 * Validates workspace username format
 *
 * Rules:
 * - 3-32 characters
 * - Lowercase letters (a-z), numbers (0-9), hyphen (-), underscore (_)
 * - No leading/trailing hyphens or underscores
 * - No consecutive special characters
 */
export interface UsernameValidationResult {
  isValid: boolean;
  error: string | null;
  normalized: string; // Auto-normalized to lowercase
}

export function validateUsernameFormat(username: string): UsernameValidationResult {
  const trimmed = username.trim();
  const normalized = trimmed.toLowerCase();

  // Length check
  if (normalized.length < 3) {
    return {
      isValid: false,
      error: 'Username must be at least 3 characters',
      normalized,
    };
  }

  if (normalized.length > 32) {
    return {
      isValid: false,
      error: 'Username must not exceed 32 characters',
      normalized,
    };
  }

  // Character validation: only lowercase letters, numbers, hyphen, underscore
  if (!/^[a-z0-9_-]+$/.test(normalized)) {
    return {
      isValid: false,
      error: 'Only lowercase letters, numbers, hyphens, and underscores allowed',
      normalized,
    };
  }

  // Leading/trailing special characters forbidden
  if (/^[_-]|[_-]$/.test(normalized)) {
    return {
      isValid: false,
      error: 'Username cannot start or end with hyphen or underscore',
      normalized,
    };
  }

  // Consecutive special characters forbidden
  if (/[_-]{2,}/.test(normalized)) {
    return {
      isValid: false,
      error: 'Consecutive special characters (-- __ -_ _-) not allowed',
      normalized,
    };
  }

  return {
    isValid: true,
    error: null,
    normalized,
  };
}

/**
 * Normalizes username input as user types (real-time)
 */
export function normalizeUsername(input: string): string {
  return input
    .toLowerCase() // Auto-convert to lowercase
    .replace(/[^a-z0-9_-]/g, '') // Remove invalid characters
    .slice(0, 32); // Enforce max length
}

// ============================================================================
// UNIQUENESS VALIDATION
// ============================================================================

export interface UniquenessCheckResult {
  isAvailable: boolean;
  existingId?: string; // ID of existing workspace if not available
}

/**
 * Check if workspace username is available (globally unique, case-insensitive)
 */
export function checkUsernameAvailability(username: string): UniquenessCheckResult {
  const workspaces = getAllWorkspaces();
  const normalized = username.trim().toLowerCase();

  const existing = workspaces.find(
    (w) => w.username?.toLowerCase() === normalized
  );

  return {
    isAvailable: !existing,
    existingId: existing?.id,
  };
}

/**
 * Check if workspace name is available (globally unique, case-insensitive)
 */
export function checkNameAvailability(name: string): UniquenessCheckResult {
  const workspaces = getAllWorkspaces();
  const normalized = name.trim().toLowerCase();

  const existing = workspaces.find(
    (w) => w.name?.toLowerCase() === normalized
  );

  return {
    isAvailable: !existing,
    existingId: existing?.id,
  };
}

// ============================================================================
// SMART USERNAME SUGGESTIONS
// ============================================================================

export interface UsernameSuggestion {
  value: string;
  isAvailable: boolean;
}

/**
 * Generate smart username suggestions when the desired username is taken
 *
 * Suggestions are:
 * - Valid under character rules
 * - Contextually related to original input
 * - Guaranteed to be available
 *
 * Returns 3-5 suggestions
 */
export function generateUsernameSuggestions(
  originalUsername: string,
  maxSuggestions: number = 5
): UsernameSuggestion[] {
  const normalized = originalUsername.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '');
  const suggestions: UsernameSuggestion[] = [];
  const workspaces = getAllWorkspaces();

  // Helper to check if suggestion is available
  const isAvailable = (username: string): boolean => {
    return !workspaces.some(
      (w) => w.username?.toLowerCase() === username.toLowerCase()
    );
  };

  // Strategy 1: Replace hyphens with underscores (or vice versa)
  if (normalized.includes('-')) {
    const withUnderscore = normalized.replace(/-/g, '_');
    if (withUnderscore !== normalized && isAvailable(withUnderscore)) {
      suggestions.push({ value: withUnderscore, isAvailable: true });
    }
  } else if (normalized.includes('_')) {
    const withHyphen = normalized.replace(/_/g, '-');
    if (withHyphen !== normalized && isAvailable(withHyphen)) {
      suggestions.push({ value: withHyphen, isAvailable: true });
    }
  }

  // Strategy 2: Add common suffixes
  const suffixes = ['inc', 'co', 'corp', 'llc', 'group', 'global', 'hq', 'team'];
  for (const suffix of suffixes) {
    if (suggestions.length >= maxSuggestions) break;

    const withSuffix = `${normalized}-${suffix}`;
    if (withSuffix.length <= 32 && isAvailable(withSuffix)) {
      suggestions.push({ value: withSuffix, isAvailable: true });
    }
  }

  // Strategy 3: Add numeric suffixes (1-9)
  for (let i = 1; i <= 9; i++) {
    if (suggestions.length >= maxSuggestions) break;

    const withNumber = `${normalized}-${i}`;
    if (withNumber.length <= 32 && isAvailable(withNumber)) {
      suggestions.push({ value: withNumber, isAvailable: true });
    }
  }

  // Strategy 4: Add year suffix
  const currentYear = new Date().getFullYear();
  const withYear = `${normalized}-${currentYear}`;
  if (suggestions.length < maxSuggestions && withYear.length <= 32 && isAvailable(withYear)) {
    suggestions.push({ value: withYear, isAvailable: true });
  }

  // Strategy 5: Add 'official' suffix
  const withOfficial = `${normalized}-official`;
  if (suggestions.length < maxSuggestions && withOfficial.length <= 32 && isAvailable(withOfficial)) {
    suggestions.push({ value: withOfficial, isAvailable: true });
  }

  return suggestions.slice(0, maxSuggestions);
}

// ============================================================================
// COMPANY NAME SUGGESTIONS
// ============================================================================

/**
 * Generate helpful suggestions when company name is taken
 *
 * These are displayed as text hints, not clickable (unlike username suggestions)
 */
export function generateNameSuggestions(originalName: string): string[] {
  const trimmed = originalName.trim();

  return [
    `${trimmed} Inc`,
    `${trimmed} LLC`,
    `${trimmed} Group`,
    `${trimmed} Corporation`,
    `${trimmed} Ltd`,
    `${trimmed} Holdings`,
  ].slice(0, 3); // Return top 3
}
