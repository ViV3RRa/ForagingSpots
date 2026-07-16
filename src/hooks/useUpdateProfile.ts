import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { usersApi, WrongPasswordError } from '../lib/api';
import { useAuth } from './useAuth';

export interface UpdateProfileInput {
  userId: string;
  email: string;
  /** Omitted → nothing to update on the record itself. */
  profile?: { name?: string; avatar?: File | null };
  /** Omitted → password untouched. */
  password?: { oldPassword: string; password: string };
}

/**
 * Saves the profile sheet: record update first, then the password change with
 * its silent re-auth (issues/004 §4–5). Profile editing is online-only — no
 * offline queue for user records, a failure just surfaces the error toast.
 */
export function useUpdateProfile() {
  const { refreshAuth } = useAuth();

  return useMutation({
    // Fail fast when offline instead of pausing the mutation (v5 default)
    networkMode: 'always',
    mutationFn: async (input: UpdateProfileInput) => {
      if (input.profile) {
        await usersApi.updateProfile(input.userId, input.profile);
      }
      if (input.password) {
        try {
          await usersApi.changePassword(input.userId, input.email, input.password);
        } catch (error) {
          // On a wrong current password the profile half is already saved —
          // reflect it in the auth store before surfacing the error (the sheet
          // stays open). Skipped for other failures: refreshAuth clears the
          // session when the server is unreachable.
          if (input.profile && error instanceof WrongPasswordError) {
            await refreshAuth();
          }
          throw error;
        }
      }
      return { passwordChanged: input.password !== undefined };
    },
    onSuccess: async ({ passwordChanged }) => {
      // Propagate name/avatar to the TopBar avatar and popover row
      await refreshAuth();
      toast.success(passwordChanged ? 'Profil og adgangskode opdateret' : 'Profil opdateret');
    },
    onError: (error) => {
      toast.error(
        error instanceof WrongPasswordError
          ? 'Forkert nuværende adgangskode'
          : 'Kunne ikke gemme — prøv igen'
      );
    },
  });
}
