import { Fragment, type ReactNode } from "react";
import type { PageSection, SectionConfig, TargetApp } from "@/lib/pageLayout";
import { usePageLayout } from "@/lib/pageLayout";

export type SectionRegistry = Record<string, (config: SectionConfig) => ReactNode>;

/** Renders the sections an admin arranged in the Visual Page Studio, in saved order. */
export function DynamicPageRenderer({
  app,
  page,
  registry,
}: {
  app: TargetApp;
  page: string;
  registry: SectionRegistry;
}) {
  const sections = usePageLayout(app, page);
  return <SectionList sections={sections} registry={registry} />;
}

export function SectionList({
  sections,
  registry,
}: {
  sections: PageSection[];
  registry: SectionRegistry;
}) {
  return (
    <>
      {[...sections]
        .sort((a, b) => a.order - b.order)
        .filter((s) => s.is_visible && registry[s.type])
        .map((s) => (
          <Fragment key={s.id}>{registry[s.type]!(s.config ?? {})}</Fragment>
        ))}
    </>
  );
}
