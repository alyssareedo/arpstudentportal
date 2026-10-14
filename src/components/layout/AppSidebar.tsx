import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard, Users, CalendarDays, FileBarChart, Settings,
  LogOut, UserCircle, CalendarClock, Inbox, CalendarPlus, CalendarRange, GraduationCap, Award, RefreshCcw, UserCog, BookOpen, Receipt, Map, Newspaper, Tag, Video,
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
  { title: "Calendar", url: "/calendar", icon: CalendarRange },
  { title: "Bookings", url: "/bookings", icon: Inbox },
  { title: "Availability (list)", url: "/availability", icon: CalendarClock },
  { title: "Students", url: "/students", icon: Users },
  { title: "Teachers", url: "/teachers", icon: UserCog },
  { title: "Lessons", url: "/lessons", icon: CalendarDays },
  { title: "Curriculum Plan", url: "/curriculum-plan", icon: Map },
  { title: "Materials", url: "/admin/materials", icon: BookOpen },
  { title: "Latest News", url: "/news", icon: Newspaper },
  { title: "Videos", url: "/videos", icon: Video },
  { title: "Invoices", url: "/admin/invoices", icon: Receipt },
  { title: "Instalment plans", url: "/admin/instalments", icon: CalendarClock },
  { title: "Promotions & Pricing", url: "/pricing", icon: Tag },
  { title: "Reports", url: "/reports", icon: FileBarChart },
  { title: "Language Assessments", url: "/assessments", icon: Award },
  { title: "Settings", url: "/settings", icon: Settings },
];

const teacherItems = [
  { title: "My Schedule", url: "/schedule", icon: CalendarRange },
  { title: "Teacher calendar", url: "/calendar-view", icon: CalendarDays },
  { title: "My Students", url: "/students", icon: Users },
  { title: "Lessons", url: "/lessons", icon: CalendarDays },
  { title: "Curriculum Plan", url: "/curriculum-plan", icon: Map },
  { title: "Materials", url: "/admin/materials", icon: BookOpen },
  { title: "Latest News", url: "/news", icon: Newspaper },
  { title: "Videos", url: "/videos", icon: Video },
  { title: "Availability", url: "/availability", icon: CalendarClock },
  { title: "My Profile", url: "/my-profile", icon: UserCircle },
];

const studentItems = [
  { title: "My roadmap", url: "/roadmap", icon: Map },
  { title: "Book a lesson", url: "/book", icon: CalendarPlus },
  { title: "My schedule", url: "/schedule", icon: CalendarRange },
  { title: "Teacher calendar", url: "/calendar-view", icon: CalendarDays },
  { title: "Materials", url: "/materials", icon: BookOpen },
  { title: "Latest News", url: "/news", icon: Newspaper },
  { title: "Videos", url: "/videos", icon: Video },
  { title: "Invoices", url: "/my-invoices", icon: Receipt },
  { title: "Courses & Pricing", url: "/pricing", icon: Tag },
  { title: "Language Assessments", url: "/assessments", icon: Award },
  { title: "My profile", url: "/my-profile", icon: UserCircle },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const { pathname } = useLocation();
  const { role, signOut } = useAuth();
  const isActive = (path: string) => pathname === path || pathname.startsWith(path + "/");
  const items = role === "admin" ? adminItems : role === "teacher" ? teacherItems : studentItems;

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
