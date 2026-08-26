import { Outlet, useLocation, Link } from "react-router-dom";
import { Bell, LogOut } from "lucide-react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/UserAvatar";
import { useAuth } from "@/hooks/useAuth";
import logo from "@/assets/logo.png";

const titles: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/students": "Students",
  "/lessons": "Lessons",
  "/reports": "Reports",
  "/settings": "Settings",
  "/my-profile": "My profile",
  "/schedule": "Schedule",
  "/bookings": "Bookings",
  "/availability": "Availability",
  "/book": "Book a lesson",
  "/calendar-view": "Teacher calendar",
};

export default function AppLayout() {
  const { pathname } = useLocation();
  const { user, signOut } = useAuth();
  const title = titles[pathname] || (pathname.startsWith("/students/") ? "Student profile" : "ARP Speak English With Me");

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-gradient-to-b from-secondary/40 to-background">
        <AppSidebar />
        <div className="flex flex-1 flex-col">
          <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b bg-background/80 px-4 backdrop-blur-md md:px-6">
            <SidebarTrigger />
            <img src={logo} alt="ARP" className="h-9 w-auto md:hidden" />
            <h1 className="text-lg font-semibold tracking-tight md:text-xl">{title}</h1>
            <div className="ml-auto flex items-center gap-2">
              <Button variant="ghost" size="icon" className="rounded-full">
                <Bell className="h-4 w-4" />
              </Button>
              <UserAvatar className="h-9 w-9 ring-2 ring-primary/10" name={user?.email} fallbackText={user?.email?.[0]?.toUpperCase() ?? "?"} />
              <Button variant="ghost" size="icon" className="rounded-full" onClick={signOut} asChild>
                <Link to="/auth"><LogOut className="h-4 w-4" /></Link>
              </Button>
            </div>
          </header>
          <main className="flex-1 p-4 md:p-6 lg:p-8">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
