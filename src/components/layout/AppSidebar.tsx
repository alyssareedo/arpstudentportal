import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard, Users, CalendarDays, FileBarChart, Settings,
  LogOut, UserCircle, CalendarClock, Inbox, CalendarPlus, CalendarRange, GraduationCap,
} from "lucide-react";
import logo from "@/assets/logo.png";
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent,
  SidebarGroupLabel, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { useAuth } from "@/hooks/useAuth";

const adminItems = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Schedule", url: "/schedule", icon: CalendarRange },
  { title: "Bookings", url: "/bookings", icon: Inbox },
  { title: "Availability", url: "/availability", icon: CalendarClock },
  { title: "Students", url: "/students", icon: Users },
  { title: "Lessons", url: "/lessons", icon: CalendarDays },
  { title: "Reports", url: "/reports", icon: FileBarChart },
  { title: "Settings", url: "/settings", icon: Settings },
];

const studentItems = [
  { title: "Book a lesson", url: "/book", icon: CalendarPlus },
  { title: "My schedule", url: "/schedule", icon: CalendarRange },
  { title: "Free CEFR test", url: "/cefr-test", icon: GraduationCap },
  { title: "My profile", url: "/my-profile", icon: UserCircle },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const { pathname } = useLocation();
  const { role, signOut } = useAuth();
  const isActive = (path: string) => pathname === path || pathname.startsWith(path + "/");
  const items = role === "admin" ? adminItems : studentItems;

  return (
    <Sidebar collapsible="icon" className="border-r">
      <SidebarHeader className="border-b">
        <div className="flex items-center gap-3 px-2 py-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white p-1 shadow-glow">
            <img src={logo} alt="ARP Speak English With Me" className="h-full w-full object-contain" />
          </div>
          {!collapsed && (
            <div className="flex flex-col leading-tight">
              <span className="text-sm font-bold tracking-tight text-sidebar-foreground">ARP Speak English</span>
              <span className="text-xs text-sidebar-foreground/70">With Me</span>
            </div>
          )}
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>{role === "admin" ? "Workspace" : "Menu"}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={isActive(item.url)} tooltip={item.title}>
                    <NavLink to={item.url} className="flex items-center gap-3">
                      <item.icon className="h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="border-t">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={signOut} tooltip="Sign out">
              <LogOut className="h-4 w-4" />
              {!collapsed && <span>Sign out</span>}
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
