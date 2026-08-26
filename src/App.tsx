import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Auth from "./pages/Auth";
import AppLayout from "./components/layout/AppLayout";
import Dashboard from "./pages/Dashboard";
import Students from "./pages/Students";
import StudentDetail from "./pages/StudentDetail";
import Lessons from "./pages/Lessons";
import Reports from "./pages/Reports";
import Settings from "./pages/Settings";
import MyProfile from "./pages/MyProfile";
import ResetPassword from "./pages/ResetPassword";
import { ProtectedRoute, RoleRedirect } from "./components/ProtectedRoute";
import Availability from "./pages/Availability";
import Bookings from "./pages/Bookings";
import BookLesson from "./pages/BookLesson";
import Schedule from "./pages/Schedule";
import StudentCalendar from "./pages/StudentCalendar";
import CefrTest from "./pages/CefrTest";
import Assessments from "./pages/Assessments";
import ToeicTest from "./pages/ToeicTest";
import ToeicResult from "./pages/ToeicResult";
import CefrResult from "./pages/CefrResult";
import AdminAssessments from "./pages/AdminAssessments";
import Renewals from "./pages/Renewals";
import Teachers from "./pages/Teachers";
import AdminCalendar from "./pages/AdminCalendar";
import AdminMaterials from "./pages/AdminMaterials";
import Materials from "./pages/Materials";
import AdminInvoices from "./pages/AdminInvoices";
import MyInvoices from "./pages/MyInvoices";
import Roadmap from "./pages/Roadmap";
import LatestNews from "./pages/LatestNews";
import Pricing from "./pages/Pricing";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/auth" element={<Auth />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/cefr-test" element={<CefrTest />} />
          <Route path="/" element={<RoleRedirect />} />
          <Route path="/index" element={<Index />} />

          <Route element={<ProtectedRoute />}>
            <Route element={<AppLayout />}>
              <Route path="/my-profile" element={<MyProfile />} />
              <Route path="/book" element={<BookLesson />} />
              <Route path="/schedule" element={<Schedule />} />
              <Route path="/calendar-view" element={<StudentCalendar />} />
              <Route path="/assessments" element={<Assessments />} />
              <Route path="/assessments/toeic" element={<ToeicTest />} />
              <Route path="/assessments/toeic/:id" element={<ToeicResult />} />
              <Route path="/assessments/cefr/:id" element={<CefrResult />} />
              <Route path="/materials" element={<Materials />} />
              <Route path="/my-invoices" element={<MyInvoices />} />
              <Route path="/roadmap" element={<Roadmap />} />
              <Route path="/news" element={<LatestNews />} />
              <Route path="/pricing" element={<Pricing />} />
            </Route>
          </Route>

          <Route element={<ProtectedRoute roles={["admin", "teacher"]} />}>
            <Route element={<AppLayout />}>
              <Route path="/students" element={<Students />} />
              <Route path="/students/:id" element={<StudentDetail />} />
              <Route path="/lessons" element={<Lessons />} />
              <Route path="/availability" element={<Availability />} />
            </Route>
          </Route>

          <Route element={<ProtectedRoute adminOnly />}>
            <Route element={<AppLayout />}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/reports" element={<Reports />} />
              <Route path="/bookings" element={<Bookings />} />
              <Route path="/admin/assessments" element={<AdminAssessments />} />
              <Route path="/renewals" element={<Renewals />} />
              <Route path="/teachers" element={<Teachers />} />
              <Route path="/calendar" element={<AdminCalendar />} />
              <Route path="/admin/materials" element={<AdminMaterials />} />
              <Route path="/admin/invoices" element={<AdminInvoices />} />
              <Route path="/settings" element={<Settings />} />
            </Route>
          </Route>

          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
