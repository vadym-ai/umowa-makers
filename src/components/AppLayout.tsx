import { useState } from "react";
import { FileText, Settings, LogOut, History, Users, Video, MoreHorizontal } from "lucide-react";
import DocGenLogo from "@/components/DocGenLogo";
import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useAuth } from "@/hooks/useAuth";
import { useOrg } from "@/hooks/useOrg";
import { roleLabel } from "@/lib/roles";

const baseNav = [
  { to: "/generator/umowa-o-dzielo", label: "Generator Umowy", icon: FileText, shortLabel: "Generator" },
  { to: "/generator/zgoda-materialy", label: "Zgody", icon: Video, shortLabel: "Zgody" },
  { to: "/historia", label: "Historia", icon: History, shortLabel: "Historia" },
  { to: "/dane-stron", label: "Dane Stron", icon: Settings, shortLabel: "Dane" },
];

export function AppLayout() {
  const { user, signOut } = useAuth();
  const { orgName, role, isOwner } = useOrg();
  const navigate = useNavigate();
  const [moreOpen, setMoreOpen] = useState(false);

  const navItems = isOwner
    ? [...baseNav, { to: "/organizacja", label: "Organizacja", icon: Users, shortLabel: "Organizacja" }]
    : baseNav;

  const handleSignOut = async () => {
    setMoreOpen(false);
    await signOut();
    navigate("/login", { replace: true });
  };

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b bg-card">
        <div className="max-w-[1400px] mx-auto px-4 lg:px-6 flex flex-wrap items-center gap-x-4 gap-y-2 py-2 lg:h-14 lg:flex-nowrap lg:gap-8 lg:py-0">
          <Link
            to="/"
            className="flex items-center gap-2 shrink-0 hover:opacity-80 transition-opacity"
          >
            <DocGenLogo />
          </Link>
          {orgName && (
            <span className="hidden sm:flex items-center gap-2 text-sm text-muted-foreground min-w-0">
              <span className="truncate max-w-[140px] xl:max-w-[180px]">{orgName}</span>
              {role && (
                <span className="rounded-full bg-accent text-accent-foreground px-2 py-0.5 text-xs font-medium">
                  {roleLabel(role)}
                </span>
              )}
            </span>
          )}
          {/* Account controls live in the bottom "Więcej" sheet on mobile */}
          <div className="ml-auto hidden lg:flex items-center gap-3 order-2 lg:order-none shrink-0">
            <span className="text-sm text-muted-foreground hidden md:inline truncate max-w-[200px]">
              {user?.email}
            </span>
            <Button variant="outline" size="sm" onClick={handleSignOut}>
              <LogOut className="mr-2 h-4 w-4" />
              Wyloguj
            </Button>
          </div>
          <nav className="hidden lg:flex gap-1 order-3 w-full overflow-x-auto lg:order-none lg:w-auto lg:ml-0 lg:mr-auto">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `flex items-center gap-2 px-3 lg:px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                    isActive
                      ? "bg-accent text-accent-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  }`
                }
              >
                <item.icon className="h-4 w-4 shrink-0" />
                {item.label}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>

      <main className="flex-1 max-w-[1400px] mx-auto w-full px-4 lg:px-6 py-4 lg:py-6 pb-[calc(var(--bottom-nav-h)+env(safe-area-inset-bottom)+1rem)] lg:pb-6">
        <Outlet />
      </main>

      {/* Mobile bottom tab bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-card lg:hidden pb-[env(safe-area-inset-bottom)]">
        <div className="flex items-stretch">
          {baseNav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex-1 min-h-[44px] flex flex-col items-center justify-center gap-0.5 py-1.5 ${
                  isActive ? "text-primary" : "text-muted-foreground"
                }`
              }
            >
              <item.icon className="h-5 w-5" />
              <span className="text-[11px] leading-tight">{item.shortLabel}</span>
            </NavLink>
          ))}
          <button
            type="button"
            onClick={() => setMoreOpen(true)}
            aria-label="Więcej"
            className="flex-1 min-h-[44px] flex flex-col items-center justify-center gap-0.5 py-1.5 text-muted-foreground"
          >
            <MoreHorizontal className="h-5 w-5" />
            <span className="text-[11px] leading-tight">Więcej</span>
          </button>
        </div>
      </nav>

      <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
        <SheetContent side="bottom" className="lg:hidden pb-[calc(env(safe-area-inset-bottom)+1rem)]">
          <SheetHeader className="text-left">
            <SheetTitle>Konto</SheetTitle>
          </SheetHeader>
          <div className="mt-4 space-y-4">
            <div className="space-y-1">
              <p className="text-sm font-medium text-foreground break-all">{user?.email}</p>
              {orgName && (
                <p className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                  <span>{orgName}</span>
                  {role && (
                    <span className="rounded-full bg-accent text-accent-foreground px-2 py-0.5 text-xs font-medium">
                      {roleLabel(role)}
                    </span>
                  )}
                </p>
              )}
            </div>
            {isOwner && (
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => {
                  setMoreOpen(false);
                  navigate("/organizacja");
                }}
              >
                <Users className="mr-2 h-4 w-4" />
                Organizacja
              </Button>
            )}
            <Button variant="outline" className="w-full justify-start" onClick={handleSignOut}>
              <LogOut className="mr-2 h-4 w-4" />
              Wyloguj
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
