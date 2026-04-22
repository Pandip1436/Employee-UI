import { useState } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";

export default function MainLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="relative flex h-screen overflow-hidden bg-gray-50 dark:bg-gray-950 transition-colors">
      {/* Ambient background — soft aurora blobs for depth, pointer-events disabled */}
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-32 -left-20 h-80 w-80 rounded-full bg-indigo-300/20 blur-3xl dark:bg-indigo-500/10" />
        <div className="absolute top-1/3 -right-24 h-96 w-96 rounded-full bg-purple-300/15 blur-3xl dark:bg-purple-500/10" />
        <div className="absolute -bottom-32 left-1/3 h-80 w-80 rounded-full bg-sky-300/15 blur-3xl dark:bg-sky-500/10" />
      </div>

      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="relative flex flex-1 flex-col overflow-hidden">
        <Topbar onMenuClick={() => setSidebarOpen(true)} />
        <main className="relative flex-1 overflow-y-auto">
          {/* Gradient fade at top edge for seamless scroll into content */}
          <div
            aria-hidden
            className="pointer-events-none sticky top-0 z-10 -mb-6 h-6 bg-gradient-to-b from-gray-50 to-transparent dark:from-gray-950"
          />
          <div className="mx-auto w-full max-w-[1600px] px-4 py-6 lg:px-8 lg:py-8">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
