'use client';

import { createContext, useContext } from 'react';

export interface AdminUser {
  email: string;
  name: string;
  role: 'ADMIN' | 'OPS';
}

export const AdminCtx = createContext<AdminUser | null>(null);
export const useAdmin = () => useContext(AdminCtx)!;
