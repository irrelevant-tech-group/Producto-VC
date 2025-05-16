import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { PlusCircle, SlidersHorizontal } from "lucide-react";
import KpiCards from "@/components/dashboard/KpiCards";
import ActiveStartups from "@/components/dashboard/ActiveStartups";
import RecentActivity from "@/components/dashboard/RecentActivity";
import QuickActions from "@/components/dashboard/QuickActions";

export default function Dashboard() {
  return (
    <div className="py-8 px-4 sm:px-6 lg:px-8">
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-secondary-900">Dashboard</h1>
          <p className="mt-1 text-sm text-secondary-500">Overview of your pipeline and recent activity</p>
        </div>
        <div className="mt-4 sm:mt-0 flex">
          <Link href="/startups/new">
            <Button className="flex items-center mr-3">
              <PlusCircle className="h-5 w-5 mr-2" />
              New Startup
            </Button>
          </Link>
          <Button variant="outline" className="flex items-center">
            <SlidersHorizontal className="h-5 w-5 mr-2" />
            Filter
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <KpiCards />

      {/* Active Startups */}
      <ActiveStartups />

      {/* Recent Activity and Quick Actions */}
      <div className="mt-8 grid grid-cols-1 gap-5 lg:grid-cols-3">
        {/* Recent Activity - takes up 2/3 of the space on large screens */}
        <div className="lg:col-span-2">
          <RecentActivity />
        </div>

        {/* Quick Actions - takes up 1/3 of the space on large screens */}
        <div>
          <QuickActions />
        </div>
      </div>
    </div>
  );
}
