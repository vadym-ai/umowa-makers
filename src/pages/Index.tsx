import { useState } from "react";
import { FileText, Settings } from "lucide-react";
import { GeneratorTab } from "@/components/GeneratorTab";
import { SettingsTab } from "@/components/SettingsTab";

const tabs = [
  { id: "generator", label: "Generator Umowy", icon: FileText },
  { id: "settings", label: "Dane Stron", icon: Settings },
] as const;

type TabId = (typeof tabs)[number]["id"];

const Index = () => {
  const [activeTab, setActiveTab] = useState<TabId>("generator");

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="max-w-[1400px] mx-auto px-6 flex items-center h-14 gap-8">
          <div className="flex items-center gap-2 font-bold text-foreground">
            <FileText className="h-5 w-5 text-primary" />
            <span>UOD Generator</span>
          </div>
          <nav className="flex gap-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
              >
                <tab.icon className="h-4 w-4" />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 max-w-[1400px] mx-auto w-full px-6 py-6">
        {activeTab === "generator" ? <GeneratorTab /> : <SettingsTab />}
      </main>
    </div>
  );
};

export default Index;
