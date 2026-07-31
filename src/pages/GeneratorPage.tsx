import { useLocation, useNavigate } from "react-router-dom";
import { GeneratorTab } from "@/components/GeneratorTab";
import { ContractRow } from "@/lib/contracts";

const GeneratorPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const editingContract = (location.state as { contract?: ContractRow } | null)?.contract ?? null;

  return (
    <GeneratorTab
      editingContract={editingContract}
      onExitEdit={() => navigate(location.pathname, { replace: true, state: null })}
    />
  );
};

export default GeneratorPage;
