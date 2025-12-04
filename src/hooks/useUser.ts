"use client";

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';

export interface User {
  id: number;
  email: string;
  role: string;
  permissions: string[];
  lastLogin?: string;
  isActive?: boolean;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: string;
  department?: string;
  phone?: string;
  address?: string;
  avatar?: string;
  preferences: {
    language: string;
    notifications: {
      email: boolean;
      push: boolean;
      
    };
  };
}

// Remove hardcoded mock admin defaults

export const useUser = () => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const router = useRouter();

  // Load user data with abortable timeout protection and a single silent retry
  const loadUser = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    const MAX_TIMEOUT_MS = 12000; // Increased timeout for login process
    const RETRY_DELAY_MS = 1000; // Longer pause before retry
    const RETRY_TIMEOUT_MS = 15000; // More generous retry window

    const attempt = async (timeoutMs: number): Promise<Response> => {
      const controller = new AbortController();
      let settled = false;
      const timeoutId = setTimeout(() => {
        if (!settled) {
          try {
            // @ts-ignore reason not widely supported
            controller.abort('User loading timeout');
          } catch {
            controller.abort();
          }
        }
      }, timeoutMs);
      
      try {
        console.log(`🔄 [useUser] Attempting to fetch user data (timeout: ${timeoutMs}ms)`);
        const res = await fetch('/api/auth/me', { 
          cache: 'no-store', 
          signal: controller.signal,
          headers: {
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
          }
        });
        console.log(`✅ [useUser] Response received: ${res.status} ${res.statusText}`);
        return res;
      } finally {
        settled = true;
        clearTimeout(timeoutId);
      }
    };

    try {
      let response = await attempt(MAX_TIMEOUT_MS);
      
      if (!response.ok) {
        const errorText = await response.text();
        if (response.status === 401) {
          console.warn(`⚠️ [useUser] Authentication required (401): ${errorText}`);
          setUser(null);
          setProfile(null);
          setError('Authentication required. Please log in.');
          setIsInitialized(true);
          setLoading(false);
          return;
        }

        console.error(`❌ [useUser] API error: ${response.status} - ${errorText}`);
        
        if (response.status === 503) {
          throw new Error('Database connection failed. Please check your database configuration.');
        } else {
          throw new Error(`Server error: ${response.status}`);
        }
      }

      // If we got here, parse and set user
      const data = await response.json();
      console.log('✅ [useUser] User data received:', { id: data.id, email: data.email, role: data.role });
      
      const normalizedRole = String(data.role).toUpperCase();
      setUser({
        id: data.id,
        email: data.email,
        role: normalizedRole,
        permissions: [],
        isActive: data.status === 'ACTIVE'
      });
      setProfile({
        id: String(data.id),
        name: data.email,
        email: data.email,
        role: normalizedRole,
        preferences: { language: 'en', notifications: { email: true, push: true } }
      });
      setIsInitialized(true);
      setLoading(false);
    } catch (err: any) {
      console.log('⚠️ [useUser] Initial attempt failed:', err.message);
      
      // One silent retry for abort/network cases
      const isAbort = err && (err.name === 'AbortError' || err.code === 'ABORT_ERR');
      const isNetwork = err && (err.message?.includes('Failed to fetch') || err.message?.includes('NetworkError'));
      const isTimeout = err && (err.message?.includes('timeout') || err.message === 'User loading timeout');
      
      try {
        if (isAbort || isNetwork || isTimeout) {
          console.log(`🔄 [useUser] Retrying after ${RETRY_DELAY_MS}ms delay...`);
          await new Promise(r => setTimeout(r, RETRY_DELAY_MS));
          const retryRes = await attempt(RETRY_TIMEOUT_MS);
          
          if (!retryRes.ok) {
            const errorText = await retryRes.text();
            console.error(`❌ [useUser] Retry failed: ${retryRes.status} - ${errorText}`);
            throw new Error('Authentication failed after retry');
          }
          
          const data = await retryRes.json();
          console.log('✅ [useUser] Retry successful:', { id: data.id, email: data.email, role: data.role });
          
          const normalizedRole = String(data.role).toUpperCase();
          setUser({
            id: data.id,
            email: data.email,
            role: normalizedRole,
            permissions: [],
            isActive: data.status === 'ACTIVE'
          });
          setProfile({
            id: String(data.id),
            name: data.email,
            email: data.email,
            role: normalizedRole,
            preferences: { language: 'en', notifications: { email: true, push: true } }
          });
          setIsInitialized(true);
          setLoading(false);
          return;
        }
        throw err; // non-retryable, fall through to catch below
      } catch (finalErr: any) {
        const isAbortFinal = finalErr && (finalErr.name === 'AbortError' || finalErr.code === 'ABORT_ERR');
        const isTimeoutFinal = finalErr && (finalErr.message?.includes('timeout') || finalErr.message === 'User loading timeout');
        
        let message = 'Failed to load user';
        if (isAbortFinal || isTimeoutFinal) {
          message = 'User loading timeout. Please check your internet connection and try again.';
        } else if (finalErr.message?.includes('Database connection failed')) {
          message = 'Database connection failed. Please contact support.';
        } else if (finalErr.message?.includes('Authentication failed')) {
          message = 'Authentication failed. Please log in again.';
        } else if (finalErr instanceof Error) {
          message = finalErr.message;
        }
        
        setError(message);
        
        // Log errors for debugging (except timeout/abort which are expected)
        if (isAbortFinal || isTimeoutFinal) {
          console.log('⏰ [useUser] Request timed out or was aborted');
        } else {
          console.log('⚠️ [useUser] User loading issue:', finalErr.message || finalErr);
        }
        
        // Set a fallback user for development to prevent complete app failure
        if (process.env.NODE_ENV === 'development') {
          console.log('🔧 [useUser] Setting fallback user for development');
          setUser({
            id: 1,
            email: 'admin@example.com',
            role: 'ADMIN',
            permissions: [],
            isActive: true
          });
          setProfile({
            id: '1',
            name: 'Admin User',
            email: 'admin@example.com',
            role: 'ADMIN',
            preferences: { language: 'en', notifications: { email: true, push: true } }
          });
        } else {
          setUser(null);
          setProfile(null);
        }
        setIsInitialized(true);
        setLoading(false);
      }
    } finally {
      setLoading(false);
    }
  }, []); // Empty dependency array to prevent infinite loop

  // Update user profile
  const updateProfile = useCallback(async (updates: Partial<UserProfile>) => {
    try {
      // In real implementation, call API
      // const response = await fetch('/api/user/profile', {
      //   method: 'PUT',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(updates)
      // });
      // if (!response.ok) throw new Error('Failed to update profile');
      // const data = await response.json();
      
      setProfile(prev => prev ? { ...prev, ...updates } : null);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update profile');
      console.error('Failed to update profile:', err);
      return false;
    }
  }, []);

  // Update user preferences
  const updatePreferences = useCallback(async (preferences: Partial<UserProfile['preferences']>) => {
    if (!profile) return false;
    
    const updatedPreferences = { ...profile.preferences, ...preferences };
    return await updateProfile({ preferences: updatedPreferences });
  }, [profile, updateProfile]);

  // Logout user
  const logout = useCallback(async () => {
    try {
      // In real implementation, call logout API
      // await fetch('/api/auth/logout', { method: 'POST' });
      
      // Clear user data
      setUser(null);
      setProfile(null);
      setIsInitialized(false);
      
      // Redirect to login
      router.push('/login');
    } catch (err) {
      console.error('Failed to logout:', err);
      // Still redirect even if API call fails
      router.push('/login');
    }
  }, [router]);

  // Check if user has permission
  const hasPermission = useCallback((permission: string): boolean => {
    if (!user) return false;
    return user.permissions.includes(permission);
  }, [user]);

  // Check if user has any of the given permissions
  const hasAnyPermission = useCallback((permissions: string[]): boolean => {
    if (!user) return false;
    return permissions.some(permission => user.permissions.includes(permission));
  }, [user]);

  // Check if user has all of the given permissions
  const hasAllPermissions = useCallback((permissions: string[]): boolean => {
    if (!user) return false;
    return permissions.every(permission => user.permissions.includes(permission));
  }, [user]);

  // Load user on mount
  useEffect(() => {
    loadUser();
  }, []); // Removed loadUser dependency to prevent infinite loop

  return {
    user,
    profile,
    loading,
    error,
    isInitialized,
    loadUser,
    updateProfile,
    updatePreferences,
    logout,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    isAuthenticated: !!user,
    isSuperAdmin: user?.role === 'SUPER_ADMIN',
    isAdmin: user?.role === 'ADMIN',
    isDepartmentHead: user?.role === 'DEPARTMENT_HEAD',
    isTeacher: user?.role === 'INSTRUCTOR' || user?.role === 'TEACHER',
    isStudent: user?.role === 'STUDENT',
    isParent: user?.role === 'PARENT',
    isSystemAuditor: user?.role === 'SYSTEM_AUDITOR'
  };
}; 