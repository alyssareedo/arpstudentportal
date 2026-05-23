import { Outlet, useLocation } from "react-router-dom";
import { Bell, Search } from "lucide-react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const titles: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/students": "Students",
  "/lessons": "Lessons",
  "/reports": "Reports",
  "/settings": "Settings",
};

export default function AppLayout() {
  const { pathname } = useLocation();
  const title =
    titles[pathname] ||
    (pathname.startsWith("/students/") ? "Student profile" : "LinguaDesk");

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-gradient-to-b from-secondary/40 to-background">
        <AppSidebar />
        <div className="flex flex-1 flex-col">
          <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b bg-background/80 px-4 backdrop-blur-md md:px-6">
            <SidebarTrigger />
            <div className="flex flex-1 items-center gap-3">
              <h1 className="text-lg font-semibold tracking-tight md:text-xl">{title}</h1>
              <div className="ml-auto hidden items-center gap-2 md:flex">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search students, lessons..."
                    className="h-9 w-72 rounded-full pl-9"
                  />
                </div>
                <Button variant="ghost" size="icon" className="rounded-full">
                  <Bell className="h-4 w-4" />
                </Button>
                <Avatar className="h-9 w-9 ring-2 ring-primary/10">
                  <AvatarImage src="https://api.dicebear.com/7.x/avataaars/svg?seed=Teacher" />
                  <AvatarFallback>T</AvatarFallback>
                </Avatar>
              </div>
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
