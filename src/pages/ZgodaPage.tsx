import { useLocation, useNavigate } from "react-router-dom";
import { ZgodaTab } from "@/components/ZgodaTab";
import { ContractRow } from "@/lib/contracts";

const ZgodaPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const editingContract = (location.state as { contract?: ContractRow } | null)?.contract ?? null;

  return (
    <ZgodaTab
      editingContract={editingContract}
      onExitEdit={() => navigate(location.pathname, { replace: true, state: null })}
    />
  );
};

export default ZgodaPage;
