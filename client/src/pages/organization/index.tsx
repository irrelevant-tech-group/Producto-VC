import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// Datos de ejemplo
const organizationData = {
  name: "Mi Organización",
  admin: {
    name: "Juan Pérez",
    role: "Administrador"
  }
};

const users = [
  { id: 1, name: "María García", role: "Analista" },
  { id: 2, name: "Carlos López", role: "Inversor" },
  { id: 3, name: "Ana Martínez", role: "Analista" },
  { id: 4, name: "Pedro Sánchez", role: "Inversor" },
];

export default function OrganizationPage() {
  const [isModifyDialogOpen, setIsModifyDialogOpen] = useState(false);

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">{organizationData.name}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              {organizationData.admin.name}
            </p>
            <p className="text-sm font-medium">{organizationData.admin.role}</p>
          </div>
        </CardContent>
      </Card>

      {/* Users List Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Organization User Overview</CardTitle>
          <Button 
            variant="outline" 
            onClick={() => setIsModifyDialogOpen(true)}
          >
            Modify
          </Button>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {users.map((user) => (
              <div 
                key={user.id} 
                className="flex items-center justify-between py-2 border-b last:border-0"
              >
                <div>
                  <p className="font-medium">{user.name}</p>
                  <p className="text-sm text-muted-foreground">{user.role}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Modify Dialog */}
      <Dialog open={isModifyDialogOpen} onOpenChange={setIsModifyDialogOpen}>
        <DialogContent className="max-w-4xl p-0">
          <DialogHeader className="bg-gray-100 px-8 pt-6 pb-4 rounded-t-xl border-b">
            <DialogTitle className="flex justify-between items-center w-full text-xl font-bold">
              <span>Organization User Overview</span>
              <Button variant="default" size="sm">
                Add User
              </Button>
            </DialogTitle>
          </DialogHeader>
          <div className="px-8 pb-8 pt-4">
            <div className="divide-y divide-gray-200">
              {users.map((user) => (
                <div 
                  key={user.id} 
                  className="flex items-center justify-between py-4"
                >
                  <div>
                    <p className="font-medium text-base">{user.name}</p>
                    <p className="text-sm text-muted-foreground">{user.role}</p>
                  </div>
                  <Button variant="outline" size="sm">
                    Modify
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
} 