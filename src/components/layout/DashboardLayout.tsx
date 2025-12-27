import { Sidebar } from "./Sidebar";
import { Header } from "./Header";

interface DashboardLayoutProps {
  children: React.ReactNode;
  breadcrumbs?: { label: string; href?: string }[];
  showNewQuery?: boolean;
  noPadding?: boolean;
}

export function DashboardLayout({
  children,
  breadcrumbs,
  showNewQuery,
  noPadding = false,
}: DashboardLayoutProps) {
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header breadcrumbs={breadcrumbs} showNewQuery={showNewQuery} />
        <main className={`flex-1 overflow-hidden bg-muted/30 ${noPadding ? '' : 'p-6'}`}>
          {children}
        </main>
      </div>
    </div>
  );
}









