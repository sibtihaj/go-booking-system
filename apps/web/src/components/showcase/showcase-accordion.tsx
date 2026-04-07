"use client";

import type { ReactNode } from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { ShowcaseSection } from "@/content/showcase";
import { ShowcaseSectionContent } from "@/components/showcase/showcase-section-content";
import { cn } from "@/lib/utils";

type ShowcaseAccordionProps = {
  sections: ShowcaseSection[];
  title?: string;
  description?: ReactNode;
  /** First section ids expanded by default */
  defaultOpenIds?: string[];
  className?: string;
};

export function ShowcaseAccordion({
  sections,
  title,
  description,
  defaultOpenIds,
  className,
}: ShowcaseAccordionProps) {
  const initial =
    defaultOpenIds?.length ?
      defaultOpenIds
    : sections[0]?.id ?
      [sections[0].id]
    : [];

  return (
    <Card
      className={cn(
        "border-emerald-500/10 bg-white/60 shadow-sm backdrop-blur-md dark:bg-white/[0.04]",
        className,
      )}
    >
      {(title || description) && (
        <CardHeader className="pb-2">
          {title ? (
            <CardTitle className="text-lg text-emerald-950 dark:text-white">
              {title}
            </CardTitle>
          ) : null}
          {description ? (
            <CardDescription className="text-sm leading-relaxed">
              {description}
            </CardDescription>
          ) : null}
        </CardHeader>
      )}
      <CardContent className={cn(!title && !description ? "pt-6" : "pt-0")}>
        <Accordion
          multiple
          defaultValue={initial}
          className="w-full divide-y divide-emerald-500/10"
        >
          {sections.map((section) => (
            <AccordionItem key={section.id} value={section.id} className="py-1">
              <AccordionTrigger className="hover:no-underline">
                <span className="flex flex-col items-start gap-1.5 pr-4 text-left">
                  {section.badge ? (
                    <Badge
                      variant="outline"
                      className="border-emerald-500/20 bg-emerald-500/5 text-[10px] text-emerald-800 uppercase tracking-wide dark:text-emerald-300"
                    >
                      {section.badge}
                    </Badge>
                  ) : null}
                  <span className="text-foreground text-sm font-semibold">
                    {section.title}
                  </span>
                </span>
              </AccordionTrigger>
              <AccordionContent>
                <ShowcaseSectionContent
                  section={section}
                  className="pt-2 pb-4"
                  omitBadge
                />
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </CardContent>
    </Card>
  );
}
