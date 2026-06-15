import { AdminBanner } from "@/components/AdminBanner";
import { BottomNav } from "@/components/BottomNav";
import { Header } from "@/components/Header";
import { Outlet } from "@tanstack/react-router";

export function Layout() {
  return (
    <div className="min-h-screen bg-background flex flex-col overflow-x-hidden">
      <Header />
      <AdminBanner />
      <main className="flex-1 pb-20 overflow-y-auto">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  );
}
