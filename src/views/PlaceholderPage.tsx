"use client";

import { usePathname } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Construction } from "lucide-react";

const PlaceholderPage = () => {
  const pathname = usePathname() ?? "";
  const pageName = pathname
    .split("/")
    .filter(Boolean)
    .map(s => s.replace(/-/g, " "))
    .map(s => s.charAt(0).toUpperCase() + s.slice(1))
    .join(" > ");

  return (
    <div className="animate-fade-in">
      <h1 className="text-2xl font-semibold text-foreground mb-6">{pageName}</h1>
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-20">
          <Construction className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium text-foreground">Coming Soon</h3>
          <p className="text-muted-foreground text-sm mt-1">This section is under development</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default PlaceholderPage;
