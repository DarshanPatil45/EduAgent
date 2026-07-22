'use client';

import { create } from 'zustand';
import type { DocumentResponse } from '@/lib/types';

interface UIState {
  sidebarCollapsed: boolean;
  activeDocument: DocumentResponse | null;
  activeChatSession: string | null;
  setSidebarCollapsed: (v: boolean) => void;
  toggleSidebar: () => void;
  setActiveDocument: (doc: DocumentResponse | null) => void;
  setActiveChatSession: (id: string | null) => void;
}

export const useUIStore = create<UIState>((set) => ({
  sidebarCollapsed: false,
  activeDocument: null,
  activeChatSession: null,
  setSidebarCollapsed: (v) => set({ sidebarCollapsed: v }),
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
  setActiveDocument: (doc) => set({ activeDocument: doc }),
  setActiveChatSession: (id) => set({ activeChatSession: id }),
}));
