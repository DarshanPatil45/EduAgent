'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { TokenResponse } from '@/lib/types';

interface User {
  id: string;
  full_name: string;
  email: string;
}

interface AuthState {
  token: string | null;
  user: User | null;
  isAuthenticated: boolean;
  login: (data: TokenResponse) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      isAuthenticated: false,
      login: (data: TokenResponse) => {
        set({
          token: data.access_token,
          user: {
            id: data.user_id,
            full_name: data.full_name,
            email: data.email,
          },
          isAuthenticated: true,
        });
      },
      logout: () => {
        set({ token: null, user: null, isAuthenticated: false });
      },
    }),
    {
      name: 'edu-auth',
      partialize: (state) => ({
        token: state.token,
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
