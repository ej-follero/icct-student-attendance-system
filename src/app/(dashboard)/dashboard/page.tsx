"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@/hooks/useUser";
import { Loader2 } from "lucide-react";

export default function DashboardRedirectPage() {
  const router = useRouter();
  const { user, loading } = useUser();

  useEffect(() => {
    if (loading) return;

    if (!user) {
      router.push('/login');
      return;
    }

    // Redirect based on user role
    const role = user.role?.toUpperCase();
    
    switch (role) {
      case 'SUPER_ADMIN':
      case 'ADMIN':
      case 'DEPARTMENT_HEAD':
        router.push('/dashboard/admin');
        break;
      case 'INSTRUCTOR':
        router.push('/dashboard/teacher');
        break;
      case 'STUDENT':
        // For now, redirect students to admin dashboard
        // You can create a student dashboard later if needed
        router.push('/dashboard/admin');
        break;
      default:
        router.push('/dashboard/admin');
    }
  }, [user, loading, router]);

  // Show loading state while determining redirect
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#f8fafc] via-[#ffffff] to-[#f8fafc]">
      <div className="text-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
        <p className="text-gray-600">Loading dashboard...</p>
      </div>
    </div>
  );
}
