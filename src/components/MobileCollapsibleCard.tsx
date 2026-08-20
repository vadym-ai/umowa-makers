import { ReactNode } from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { useIsMobile } from "@/hooks/use-mobile";

interface MobileCollapsibleCardProps {
  title: string;
  children: ReactNode;
  /** Open by default on mobile. */
  defaultOpen?: boolean;
  /** Hide the title on desktop (card had no visible heading before). */
  hideTitleOnDesktop?: boolean;
}

/**
 * A form card that stays a plain card on desktop (lg and up) but collapses into
 * an Accordion section on phones so the form is not one endless scroll.
 */
export function MobileCollapsibleCard({
  title,
  children,
  defaultOpen = false,
  hideTitleOnDesktop = false,
}: MobileCollapsibleCardProps) {
  const isMobile = useIsMobile();

  if (!isMobile) {
    return (
      <div className="bg-card rounded-xl border p-4 lg:p-5 space-y-4">
        {!hideTitleOnDesktop && <h2 className="font-semibold text-sm">{title}</h2>}
        {children}
      </div>
    );
  }

  return (
    <div className="bg-card rounded-xl border">
      <Accordion type="single" collapsible defaultValue={defaultOpen ? "item" : undefined}>
        <AccordionItem value="item" className="border-0">
          <AccordionTrigger className="px-4 py-3 text-sm font-semibold hover:no-underline">
            {title}
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-4">
            <div className="space-y-4">{children}</div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}
