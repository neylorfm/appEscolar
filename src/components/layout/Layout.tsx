import { Outlet } from "react-router-dom"
import { Sidebar } from "./Sidebar"

export function Layout() {
  return (
    <div className="flex min-h-screen w-full bg-background print:block print:min-h-0 print:bg-white">
      <div className="print:hidden">
        <Sidebar />
      </div>
      <div className="flex flex-1 flex-col overflow-hidden print:block print:overflow-visible">
        <main className="flex-1 overflow-auto p-4 md:p-6 lg:p-8 print:p-0 print:m-0 print:overflow-visible print:block">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
