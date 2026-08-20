import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { Maximize2, Minimize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/hooks/use-mobile";

/** Natural width of an .a4-page (210mm) in CSS pixels. */
export const A4_WIDTH_PX = 794;

export interface DocumentPreviewFrameHandle {
  /**
   * Renders the document at scale 1 (transform removed) for the duration of
   * `fn`, then restores the previous scale. html2pdf reads the live DOM, so the
   * preview scaling must never be active while exporting.
   */
  runUnscaled: <T>(fn: () => Promise<T>) => Promise<T>;
}

interface DocumentPreviewFrameProps {
  children: React.ReactNode;
  /**
   * Manual text editing: a scaled contentEditable breaks caret placement in
   * mobile Safari, so the frame is forced to 100% while editing.
   */
  editing?: boolean;
  className?: string;
}

/**
 * Wraps an A4 document preview and scales it down to the available width on
 * narrow screens. Because `transform` does not change the layout box, the frame
 * also mirrors the scaled height so no empty gap appears below the document.
 */
export const DocumentPreviewFrame = forwardRef<
  DocumentPreviewFrameHandle,
  DocumentPreviewFrameProps
>(function DocumentPreviewFrame({ children, editing = false, className = "" }, ref) {
  const isMobile = useIsMobile();
  const outerRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);

  const [fit, setFit] = useState(isMobile);
  const [available, setAvailable] = useState(0);
  const [contentHeight, setContentHeight] = useState(0);
  const [exporting, setExporting] = useState(false);

  // Default: fit on mobile, real size on desktop.
  const lastIsMobile = useRef(isMobile);
  useEffect(() => {
    if (lastIsMobile.current !== isMobile) {
      lastIsMobile.current = isMobile;
      setFit(isMobile);
    }
  }, [isMobile]);

  // Editing always happens at real size; leaving edit mode restores "Dopasuj".
  const wasEditing = useRef(editing);
  useEffect(() => {
    if (editing && !wasEditing.current) setFit(false);
    if (!editing && wasEditing.current) setFit(isMobile);
    wasEditing.current = editing;
  }, [editing, isMobile]);

  const measure = useCallback(() => {
    if (outerRef.current) setAvailable(outerRef.current.clientWidth);
    if (innerRef.current) setContentHeight(innerRef.current.offsetHeight);
  }, []);

  useLayoutEffect(() => {
    measure();
    const ro = new ResizeObserver(() => measure());
    if (outerRef.current) ro.observe(outerRef.current);
    if (innerRef.current) ro.observe(innerRef.current);
    return () => ro.disconnect();
  }, [measure]);

  // Content can change height without resizing (text edits, longer subject).
  useEffect(() => {
    const id = window.setTimeout(measure, 50);
    return () => window.clearTimeout(id);
  });

  const scale =
    !fit || exporting || available === 0 ? 1 : Math.min(1, available / A4_WIDTH_PX);

  useImperativeHandle(ref, () => ({
    async runUnscaled(fn) {
      const inner = innerRef.current;
      const prevTransform = inner?.style.transform ?? "";
      if (inner) inner.style.transform = "none";
      setExporting(true);
      try {
        return await fn();
      } finally {
        setExporting(false);
        if (inner) inner.style.transform = prevTransform;
      }
    },
  }));

  const scaled = scale < 1;

  return (
    <div className={`min-w-0 ${className}`}>
      <div className="mb-2 flex items-center gap-2">
        <div className="inline-flex rounded-lg border bg-card p-1">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            aria-pressed={fit}
            disabled={editing}
            onClick={() => setFit(true)}
            className={`h-8 px-2.5 ${fit ? "bg-accent text-accent-foreground" : "text-muted-foreground"}`}
          >
            <Minimize2 className="mr-1.5 h-3.5 w-3.5" />
            Dopasuj
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            aria-pressed={!fit}
            onClick={() => setFit(false)}
            className={`h-8 px-2.5 ${!fit ? "bg-accent text-accent-foreground" : "text-muted-foreground"}`}
          >
            <Maximize2 className="mr-1.5 h-3.5 w-3.5" />
            100%
          </Button>
        </div>
        {scaled && (
          <span className="text-xs text-muted-foreground">{Math.round(scale * 100)}%</span>
        )}
      </div>

      {editing && (
        <div className="mb-2 rounded-lg border bg-card px-3 py-2 text-xs text-muted-foreground lg:hidden">
          Edycja w rozmiarze rzeczywistym — przewiń w poziomie.
        </div>
      )}

      <div
        ref={outerRef}
        className={`min-w-0 ${fit ? "overflow-hidden" : "overflow-x-auto"}`}
      >
        <div
          style={{
            height: contentHeight && scale < 1 ? contentHeight * scale : undefined,
            width: scale < 1 ? A4_WIDTH_PX * scale : undefined,
          }}
        >
          <div
            ref={innerRef}
            className="w-fit"
            style={{
              transform: scale < 1 ? `scale(${scale})` : undefined,
              transformOrigin: "top left",
            }}
          >
            {children}
          </div>
        </div>
      </div>
    </div>
  );
});
