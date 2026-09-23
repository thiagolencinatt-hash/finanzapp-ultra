"use client";

import { useEffect, useState } from "react";
import { Header } from "@/components/layout/Header";
import { AccountsList } from "@/components/accounts/AccountsList";

export default function AccountsPage() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="flex flex-col animate-fade-in min-h-screen">
      <Header
        title="Mis Cuentas 💳"
        subtitle="Administra tus billeteras, bancos y efectivos"
      />

      <div className="flex-1 w-full max-w-7xl mx-auto p-4 md:p-6 lg:p-8 pt-0 md:pt-0">
        {mounted && <AccountsList />}
      </div>
    </div>
  );
}
