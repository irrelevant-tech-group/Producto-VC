import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { User, Building2 } from "lucide-react";

interface AccountSettingsProps {
  user: any;
}

export const AccountSettings = ({ user }: AccountSettingsProps) => {
  return (
    <>
      <Card className="border-slate-200 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5 text-slate-600" />
            Account Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Name</Label>
              <Input value={user?.fullName || ""} disabled className="bg-slate-50" />
            </div>
            <div>
              <Label>Email</Label>
              <Input value={user?.primaryEmailAddress?.emailAddress || ""} disabled className="bg-slate-50" />
            </div>
          </div>
          
          <div className="pt-4 border-t border-slate-200">
            <p className="text-sm text-slate-500">
              Account information is managed through your organization's authentication system.
              Contact your administrator to make changes.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card className="border-slate-200 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-slate-600" />
            Organization
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-slate-800">Current Organization</p>
              <p className="text-sm text-slate-500">Manage organization settings and members</p>
            </div>
            <Button variant="outline" disabled>
              Manage Organization
            </Button>
          </div>
        </CardContent>
      </Card>
    </>
  );
};