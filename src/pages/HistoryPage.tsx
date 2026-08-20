import { useNavigate } from "react-router-dom";
import { HistoryTab } from "@/components/HistoryTab";
import { ContractRow } from "@/lib/contracts";

const HistoryPage = () => {
  const navigate = useNavigate();
  return (
    <HistoryTab
      onOpenContract={(contract: ContractRow) =>
        navigate(
          contract.contract_type === "zgoda_materialy"
            ? "/generator/zgoda-materialy"
            : "/generator/umowa-o-dzielo",
          { state: { contract } },
        )
      }
    />
  );
};

export default HistoryPage;
