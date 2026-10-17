/**
 * Local storage implementation for user data
 * This is a fallback for when the Creao platform API is not available
 */

import type { UserModel } from '@/components/data/orm/orm_user';

const USERS_STORAGE_KEY = 'financial_dashboard_users';

/**
 * Get all users from local storage
 */
export function getLocalUsers(): UserModel[] {
  try {
    const stored = localStorage.getItem(USERS_STORAGE_KEY);
    if (!stored) {
      return [];
    }
    return JSON.parse(stored) as UserModel[];
  } catch (error) {
    console.error('Failed to load users from local storage:', error);
    return [];
  }
}

/**
 * Save users to local storage
 */
export function saveLocalUsers(users: UserModel[]): void {
  try {
    localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
  } catch (error) {
    console.error('Failed to save users to local storage:', error);
  }
}

/**
 * Get user by email
 */
export function getUserByEmail(email: string): UserModel | null {
  const users = getLocalUsers();
  return users.find(u => u.email === email) || null;
}

/**
 * Get user by auth token
 */
export function getUserByAuthToken(token: string): UserModel | null {
  const users = getLocalUsers();
  return users.find(u => u.auth_token === token) || null;
}

/**
 * Insert a new user
 */
export function insertUser(user: Omit<UserModel, 'id' | 'create_time' | 'update_time' | 'data_creator' | 'data_updater'>): UserModel {
  const users = getLocalUsers();

  // Check if user already exists
  if (users.some(u => u.email === user.email)) {
    throw new Error('User with this email already exists');
  }

  const now = new Date().toISOString();
  const newUser: UserModel = {
    ...user,
    id: crypto.randomUUID(),
    create_time: now,
    update_time: now,
    data_creator: 'system',
    data_updater: 'system',
  };

  users.push(newUser);
  saveLocalUsers(users);
  return newUser;
}

/**
 * Update user by email
 */
export function updateUserByEmail(email: string, updates: Partial<UserModel>): UserModel | null {
  const users = getLocalUsers();
  const index = users.findIndex(u => u.email === email);

  if (index === -1) {
    return null;
  }

  const now = new Date().toISOString();
  users[index] = {
    ...users[index],
    ...updates,
    update_time: now,
    data_updater: 'system',
  };

  saveLocalUsers(users);
  return users[index];
}

/**
 * Delete user by email
 */
export function deleteUserByEmail(email: string): boolean {
  const users = getLocalUsers();
  const filteredUsers = users.filter(u => u.email !== email);

  if (filteredUsers.length === users.length) {
    return false; // User not found
  }

  saveLocalUsers(filteredUsers);
  return true;
}

/**
 * Clear all users (for testing/development)
 */
export function clearAllUsers(): void {
  localStorage.removeItem(USERS_STORAGE_KEY);
}
