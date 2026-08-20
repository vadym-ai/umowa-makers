import { useEffect, useRef, useState } from "react";
import { handlePlainTextPaste } from "@/lib/documentHtml";

interface EditableDocumentProps {
  editing: boolean;
  html: string | null;
  onHtmlChange: (html: string) => void;
  exportRef: React.RefObject<HTMLDivElement>;
  children: React.ReactNode;
}

/**
 * Frozen editable surface. The initial HTML is captured ONCE on mount so React
 * never rewrites innerHTML while the user types (which would reset the caret).
 */
function EditableSurface({
  initialHtml,
  onHtmlChange,
  exportRef,
}: {
  initialHtml: string;
  onHtmlChange: (html: string) => void;
  exportRef: React.RefObject<HTMLDivElement>;
}) {
  const [frozenHtml] = useState(initialHtml);
  return (
    <div
      ref={exportRef}
      className="a4-page"
      contentEditable
      suppressContentEditableWarning
      spellCheck={false}
      onPaste={(e) => handlePlainTextPaste(e)}
      onBlur={() => {
        if (exportRef.current) onHtmlChange(exportRef.current.innerHTML);
      }}
      dangerouslySetInnerHTML={{ __html: frozenHtml }}
    />
  );
}

export function EditableDocument({
  editing,
  html,
  onHtmlChange,
  exportRef,
  children,
}: EditableDocumentProps) {
  // A stable id per edit session: bumped only when edit mode is (re)entered.
  const [editSessionId, setEditSessionId] = useState(0);
  const wasEditing = useRef(editing);

  useEffect(() => {
    if (editing && !wasEditing.current) setEditSessionId((n) => n + 1);
    wasEditing.current = editing;
  }, [editing]);

  if (!editing) return <>{children}</>;

  return (
    <EditableSurface
      key={editSessionId}
      initialHtml={html ?? ""}
      onHtmlChange={onHtmlChange}
      exportRef={exportRef}
    />
  );
}
