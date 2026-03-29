import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import NotFound from "./pages/NotFound";
import PublicLayout from "./layouts/PublicLayout";
import AdminLayout from "./layouts/AdminLayout";
import AdminProtectedRoute from "./components/admin/AdminProtectedRoute";
import HomePage from "./pages/public/HomePage";
import PublicBudgetRequestPage from "./pages/public/PublicBudgetRequestPage";
import PublicOSStatusPage from "./pages/public/PublicOSStatusPage";
import PublicChatPage from "./pages/public/PublicChatPage";
import AdminDashboardPage from "./pages/admin/AdminDashboardPage";
import TopCellServiceOrders from "./pages/admin/TopCellServiceOrders";
import AdminProductsPage from "./pages/admin/AdminProductsPage";
import AdminSalesPage from "./pages/admin/AdminSalesPage";
import AdminSupportPage from "./pages/admin/AdminSupportPage";
import AdminLoginPage from "./pages/admin/AdminLoginPage";
import AdminSecurityPage from "./pages/admin/AdminSecurityPage";
import { AdminBudgetsPage, AdminFinancePage } from "./pages/admin/AdminModulePages";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route element={<PublicLayout />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/orcamento" element={<PublicBudgetRequestPage />} />
            <Route path="/consultar-os" element={<PublicOSStatusPage />} />
            <Route path="/atendimento" element={<PublicChatPage />} />
          </Route>

          <Route path="/admin/login" element={<AdminLoginPage />} />

          <Route path="/admin" element={<AdminProtectedRoute />}>
            <Route element={<AdminLayout />}>
              <Route index element={<Navigate to="dashboard" replace />} />
              <Route path="dashboard" element={<AdminDashboardPage />} />
              <Route path="ordens-servico" element={<TopCellServiceOrders />} />
              <Route path="orcamentos" element={<AdminBudgetsPage />} />
              <Route path="produtos" element={<AdminProductsPage />} />
              <Route path="vendas" element={<AdminSalesPage />} />
              <Route path="financeiro" element={<AdminFinancePage />} />
              <Route path="atendimento" element={<AdminSupportPage />} />
              <Route path="seguranca" element={<AdminSecurityPage />} />
            </Route>
          </Route>

          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
