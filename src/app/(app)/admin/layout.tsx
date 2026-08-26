"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { isSuperAdmin } from "@/lib/permissions";
import { Lock } from "lucide-react";
import Card from "@/components/ui/Card";
import { useI18n } from "@/contexts/I18nContext";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { t } = useI18n();
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const allowed = isSuperAdmin(user);

  useEffect(() => {
    if (isLoading) return;
    if (!allowed) router.replace("/dashboard");
  }, [isLoading, allowed, router]);

  if (!allowed) {
    return (
      <Card className="flex flex-col items-center gap-3 py-16 text-center">
        <Lock size={32} className="text-zinc-400" />
        <p className="text-sm text-zinc-500">{t("admin.reservedSuperAdmin")}</p>
      </Card>
    );
  }

  return <>{children}</>;
}
