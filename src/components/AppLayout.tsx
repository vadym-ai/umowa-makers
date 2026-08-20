import { FileText, Settings, LogOut, History, Users, Video } from "lucide-react";
import DocGenLogo from "@/components/DocGenLogo";
import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useOrg } from "@/hooks/useOrg";
import { roleLabel } from "@/lib/roles";

const baseNav = [
  { to: "/generator/umowa-o-dzielo", label: "Generator Umowy", icon: FileText },
  { to: "/generator/zgoda-materialy", label: "Zgody", icon: Video },
  { to: "/historia", label: "Historia", icon: History },
  { to: "/dane-stron", label: "Dane Stron", icon: Settings },
];

export function AppLayout() {
  const { user, signOut } = useAuth();
  const { orgName, role, isOwner } = useOrg();
  const navigate = useNavigate();

  const navItems = isOwner
    ? [...baseNav, { to: "/organizacja", label: "Organizacja", icon: Users }]
    : baseNav;

  const handleSignOut = async () => {
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
            <span className="hidden xl:flex items-center gap-2 text-sm text-muted-foreground min-w-0">
              <span className="truncate max-w-[180px]">{orgName}</span>
              {role && (
                <span className="rounded-full bg-accent text-accent-foreground px-2 py-0.5 text-xs font-medium">
                  {roleLabel(role)}
                </span>
              )}
            </span>
          )}
          <div className="ml-auto flex items-center gap-3 order-2 lg:order-none shrink-0">
            <span className="text-sm text-muted-foreground hidden md:inline truncate max-w-[200px]">
              {user?.email}
            </span>
            <Button variant="outline" size="sm" onClick={handleSignOut}>
              <LogOut className="mr-2 h-4 w-4" />
              Wyloguj
            </Button>
          </div>
          <nav className="flex gap-1 order-3 w-full overflow-x-auto lg:order-none lg:w-auto lg:ml-0 lg:mr-auto">
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

      <main className="flex-1 max-w-[1400px] mx-auto w-full px-4 lg:px-6 py-4 lg:py-6">
        <Outlet />
      </main>
    </div>
  );
}
