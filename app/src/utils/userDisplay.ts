import { getContactNameStatic, getContactAvatarStatic } from '@/store/contacts.store';

/**
 * Returns the best display name for a user.
 * Prioritizes the local phonebook contact name. If not found, falls back to the server display name,
 * and finally falls back to the userId (phone number) or a generic label.
 */
export const getSmartDisplayName = (userId?: string, serverDisplayName?: string | null): string => {
  const fallback = serverDisplayName || userId || 'Usuario';
  if (!userId) return fallback;
  
  // If the user is saved in the local phonebook, this returns their local name.
  // Otherwise, it returns the fallback (server name or phone).
  return getContactNameStatic(userId, fallback);
};

/**
 * Returns the best avatar URL for a user.
 * Prioritizes the server avatar if it exists. If not, falls back to the local contact avatar.
 */
export const getSmartAvatarUrl = (userId?: string, serverAvatarUrl?: string | null): string | undefined => {
  if (serverAvatarUrl) return serverAvatarUrl;
  if (!userId) return undefined;
  
  return getContactAvatarStatic(userId);
};
