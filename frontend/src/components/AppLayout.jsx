import Sidebar from './Sidebar';

export default function AppLayout({ children }) {
  return (
    <div className="h-screen bg-dark-950 bg-mesh flex overflow-hidden">
      <Sidebar />
      <div className="flex-1 overflow-auto md:pt-0 pt-14 flex flex-col min-h-0">
        {children}
      </div>
    </div>
  );
}
