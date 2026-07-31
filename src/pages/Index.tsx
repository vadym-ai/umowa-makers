import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FileText, Settings, LogOut, History } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { GeneratorTab } from "@/components/GeneratorTab";
import { SettingsTab } from "@/components/SettingsTab";
import { HistoryTab } from "@/components/HistoryTab";
import { ContractRow } from "@/lib/contracts";

const tabs = [
  { id: "generator", label: "Generator Umowy", icon: FileText },
  { id: "history", label: "Historia", icon: History },
  { id: "settings", label: "Dane Stron", icon: Settings },
] as const;

type TabId = (typeof tabs)[number]["id"];

const Index = () => {
  const [activeTab, setActiveTab] = useState<TabId>("generator");
  const [editingContract, setEditingContract] = useState<ContractRow | null>(null);
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate("/login", { replace: true });
  };

  const handleOpenContract = (contract: ContractRow) => {
    setEditingContract(contract);
    setActiveTab("generator");
  };

  const handleTabChange = (id: TabId) => {
    if (id !== "generator") setEditingContract(null);
    setActiveTab(id);
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="max-w-[1400px] mx-auto px-4 lg:px-6 flex flex-wrap items-center gap-x-4 gap-y-2 py-2 lg:h-14 lg:flex-nowrap lg:gap-8 lg:py-0">
          <div className="flex items-center gap-2 font-bold text-foreground shrink-0">
            <FileText className="h-5 w-5 text-primary" />
            <span>UOD Generator</span>
          </div>
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
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-3 lg:px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                  activeTab === tab.id
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
              >
                <tab.icon className="h-4 w-4 shrink-0" />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </header>


      {/* Content */}
      <main className="flex-1 max-w-[1400px] mx-auto w-full px-4 lg:px-6 py-4 lg:py-6">
        {activeTab === "generator" ? <GeneratorTab /> : <SettingsTab />}
      </main>

    </div>
  );
};

export default Index;
