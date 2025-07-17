import { useEffect } from "react";
import { useRouter } from "next/router";
import { getCurrentUser } from "../lib/auth";

export default function RequireAuth({ children, role }: { children: React.ReactNode, role?: string }) {
  const router = useRouter();

  useEffect(() => {
    const user = getCurrentUser();
    if (!user) {
      router.replace("/login");
    } else if (role && user.role !== role) {
      // Optionally redirect if role doesn't match
      router.replace("/login");
    }
  }, [router, role]);

  return <>{children}</>;
}