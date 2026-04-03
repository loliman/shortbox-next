"use client";

import React from "react";
import Typography from "@mui/material/Typography";
import List from "@mui/material/List";
import Box from "@mui/material/Box";
import Collapse from "@mui/material/Collapse";
import IconButton from "@mui/material/IconButton";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { StoryArcChips } from "../StoryArcChips";
import { StoryPeopleSection } from "../sections/StoryPeopleSection";
import { StoryAppearanceSection } from "../sections/StoryAppearanceSection";
import { StoryIssueListItem } from "../StoryIssueListItem";
import type { StoryIssue, StoryIssueRelation } from "../utils/storyIssueUtils";
import { isSameIssue, toChildAddinfo, toIssueRowKey } from "../utils/storyIssueUtils";

interface IssueReference extends Omit<StoryIssueRelation, "issue" | "parent"> {
  [key: string]: unknown;
  issue?: StoryIssue | null;
  number?: string | number;
  addinfo?: string;
  parent?: {
    issue?: StoryIssue | null;
    number?: string | number;
  } | null;
}

interface StoryLike extends IssueReference {
  reprintOf?: IssueReference | null;
  reprints?: IssueReference[];
  children?: IssueReference[];
}

interface IssueDetailsUSStoryDetailsProps {
  item?: {
    parent?: StoryLike | null;
    reprintOf?: IssueReference | null;
    reprints?: IssueReference[];
    children?: IssueReference[];
  } & StoryLike;
  issue?: StoryIssue;
  us?: boolean;
  session?: unknown;
  [key: string]: unknown;
}

type StoryArc = { title?: string | null; type?: string | null };

type StoryItemWithArcs = StoryLike & {
  issue?: (StoryIssue & { arcs?: StoryArc[] | null }) | null;
  parent?: (StoryLike & { issue?: (StoryIssue & { arcs?: StoryArc[] | null }) | null }) | null;
};

function readStoryArcs(item: StoryItemWithArcs): StoryArc[] {
  const parentArcs = item.parent?.issue?.arcs;
  if (Array.isArray(parentArcs)) {
    return parentArcs.filter((arc): arc is StoryArc => Boolean(arc && typeof arc === "object"));
  }

  const issueArcs = item.issue?.arcs;
  if (Array.isArray(issueArcs)) {
    return issueArcs.filter((arc): arc is StoryArc => Boolean(arc && typeof arc === "object"));
  }

  return [];
}

function toStoryIssueRelation(value: IssueReference): StoryIssueRelation {
  return {
    ...value,
    issue: value.issue ?? undefined,
    parent: value.parent
      ? {
          ...value.parent,
          issue: value.parent.issue ?? undefined,
        }
      : undefined,
  };
}

function StorySectionLabel(props: Readonly<{ children: React.ReactNode }>) {
  return (
    <Typography
      sx={{
        fontFamily: 'Roboto, "Helvetica Neue", Arial, sans-serif',
        fontSize: "0.78rem",
        lineHeight: 1.5,
        fontWeight: 600,
        textTransform: "uppercase",
        letterSpacing: "0.16em",
        color: "text.secondary",
        display: "block",
        mb: 0.5,
      }}
    >
      {props.children}
    </Typography>
  );
}

function StoryCollapsibleHeader(props: Readonly<{
  label: string;
  expanded: boolean;
  collapseLabel: string;
  expandLabel: string;
  onToggle: () => void;
}>) {
  const ariaLabel = props.expanded ? props.collapseLabel : props.expandLabel;

  return (
    <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 0.5 }}>
      <StorySectionLabel>{props.label}</StorySectionLabel>
      <IconButton
        size="small"
        aria-label={ariaLabel}
        onClick={props.onToggle}
        sx={{
          ml: 1,
          transform: props.expanded ? "rotate(0deg)" : "rotate(-90deg)",
          transition: "transform 180ms ease",
        }}
      >
        <ExpandMoreIcon fontSize="small" />
      </IconButton>
    </Box>
  );
}

function StoryReprintOfSection(props: Readonly<{ reprintOf: IssueReference | null | undefined }>) {
  if (!props.reprintOf?.issue) return null;

  return (
    <Box sx={{ mt: 2.5 }}>
      <StorySectionLabel>Nachdruck von</StorySectionLabel>
      <List sx={{ p: 0 }}>
        <StoryIssueListItem
          issue={props.reprintOf.issue}
          number={props.reprintOf.number}
          subtitle={props.reprintOf.addinfo ?? null}
          routeUs={true}
          coverUs={true}
        />
      </List>
    </Box>
  );
}

function StoryReprintsSection(props: Readonly<{ reprints: IssueReference[] }>) {
  if (props.reprints.length === 0) return null;

  return (
    <Box sx={{ mt: 2.5 }}>
      <StorySectionLabel>Nachgedruckt in</StorySectionLabel>
      <List sx={{ p: 0 }}>
        {props.reprints.map((child, idx) => {
          if (!child.issue) return null;
          const relation = toStoryIssueRelation(child);

          return (
            <StoryIssueListItem
              key={toIssueRowKey(relation, idx)}
              issue={child.issue}
              number={child.number}
              subtitle={child.addinfo ?? null}
              routeUs={true}
              coverUs={true}
              divider={props.reprints.length - 1 !== idx}
            />
          );
        })}
      </List>
    </Box>
  );
}

function buildGermanParentLink(
  child: IssueReference,
  currentIssue: StoryIssue | undefined
): {
  issue: StoryIssue;
  number?: string | number;
  prefix: string;
  routeUs: boolean;
  coverUs: boolean;
} | null {
  if (!child.parent?.issue) return null;
  if (isSameIssue(child.parent.issue, currentIssue)) return null;

  return {
    issue: child.parent.issue,
    number: child.parent.number,
    prefix: "als",
    routeUs: true,
    coverUs: true,
  };
}

function StoryGermanPublishedSection(props: Readonly<{
  childrenItems: IssueReference[];
  currentIssue: StoryIssue | undefined;
  expanded: boolean;
  onToggle: () => void;
  session: unknown;
}>) {
  if (props.childrenItems.length === 0) return null;

  return (
    <Box sx={{ mt: 2.5 }}>
      <StoryCollapsibleHeader
        label={`Erschienen in (${props.childrenItems.length})`}
        expanded={props.expanded}
        collapseLabel="Auf deutsch erschienen in einklappen"
        expandLabel="Auf deutsch erschienen in ausklappen"
        onToggle={props.onToggle}
      />

      <Collapse in={props.expanded}>
        <List sx={{ p: 0 }}>
          {props.childrenItems.map((child, idx) => {
            if (!child.issue) return null;
            const relation = toStoryIssueRelation(child);
            const addinfoText = toChildAddinfo(relation);
            const isCurrentIssueRow = isSameIssue(child.issue, props.currentIssue);
            const parentLink = isCurrentIssueRow
              ? null
              : buildGermanParentLink(child, props.currentIssue);

            return (
              <StoryIssueListItem
                key={toIssueRowKey(relation, idx)}
                issue={child.issue}
                number={child.number}
                subtitle={addinfoText ? addinfoText : null}
                titleSuffix={child.issue.title ? " - " + child.issue.title : ""}
                parentLink={parentLink}
                routeUs={false}
                coverUs={false}
                showCollected
                session={props.session}
                divider={props.childrenItems.length - 1 !== idx}
              />
            );
          })}
        </List>
      </Collapse>
    </Box>
  );
}

function StoryDetailsSidebar(props: Readonly<{
  currentItem: StoryLike;
  us: boolean;
  hasGermanPublished: boolean;
}>) {
  return (
    <Box
      sx={(theme) => ({
        border: "1px solid",
        borderColor: "divider",
        borderRadius: 2,
        p: 2,
        backgroundColor: "rgba(0,0,0,0.02)",
        ...theme.applyStyles("dark", {
          backgroundColor: "rgba(255,255,255,0.02)",
        }),
        gridColumn: { xs: "auto", md: props.hasGermanPublished ? "auto" : "1 / -1" },
      })}
    >
      <StoryPeopleSection
        item={(props.currentItem as Record<string, unknown>) || {}}
        us={props.us}
        includeTranslator
        translatorOptional
      />

      <StoryAppearanceSection item={(props.currentItem as Record<string, unknown>) || {}} us={props.us} />
    </Box>
  );
}

export function IssueDetailsUSStoryDetails(props: Readonly<IssueDetailsUSStoryDetailsProps>) {
  const currentItem = props.item ?? {};
  const story = currentItem.parent ?? currentItem;
  const currentIssue = props.issue ?? currentItem.issue ?? story.issue ?? undefined;
  const us = Boolean(props.us);
  const storyArcs = readStoryArcs(currentItem as StoryItemWithArcs);
  const reprints = Array.isArray(story?.reprints) ? story.reprints : [];
  const children = Array.isArray(currentItem.children) ? currentItem.children : [];
  const reprintOf = currentItem.reprintOf;
  const hasGermanPublished = children.length > 0;
  const [containsExpanded, setContainsExpanded] = React.useState(true);
  const [germanPublishedExpanded, setGermanPublishedExpanded] = React.useState(true);

  return (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: {
          xs: "1fr",
          md: hasGermanPublished ? "minmax(0, 1.05fr) minmax(0, 0.95fr)" : "1fr",
        },
        columnGap: 3,
        rowGap: 3,
      }}
    >
      <Box>
        {storyArcs.length > 0 ? (
          <Box sx={{ mt: 0, pt: 0 }}>
            <StoryCollapsibleHeader
              label="Enthalten in"
              expanded={containsExpanded}
              collapseLabel="Enthalten in einklappen"
              expandLabel="Enthalten in ausklappen"
              onToggle={() => setContainsExpanded((prev) => !prev)}
            />
            <Collapse in={containsExpanded}>
              <Box sx={{ mt: 1, minWidth: 0 }}>
                <StoryArcChips arcs={storyArcs} us={us} inline />
              </Box>
            </Collapse>
          </Box>
        ) : null}

        <StoryReprintOfSection reprintOf={reprintOf} />
        <StoryReprintsSection reprints={reprints} />
        <StoryGermanPublishedSection
          childrenItems={children}
          currentIssue={currentIssue}
          expanded={germanPublishedExpanded}
          onToggle={() => setGermanPublishedExpanded((prev) => !prev)}
          session={props.session}
        />
      </Box>

      <StoryDetailsSidebar currentItem={currentItem} us={us} hasGermanPublished={hasGermanPublished} />
    </Box>
  );
}
