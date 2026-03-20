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
  [key: string]: any;
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
  [key: string]: any;
}

function toStoryIssueRelation(value: IssueReference): StoryIssueRelation {
  return {
    ...value,
    issue: value.issue || undefined,
    parent: value.parent
      ? {
          ...value.parent,
          issue: value.parent.issue || undefined,
        }
      : undefined,
  };
}

export function IssueDetailsUSStoryDetails(props: Readonly<IssueDetailsUSStoryDetailsProps>) {
  const currentItem = props.item || {};
  const story = currentItem.parent ? currentItem.parent : currentItem;
  const us = Boolean(props.us);
  const storyArcs = Array.isArray((currentItem as any)?.parent?.issue?.arcs)
    ? (currentItem as any).parent.issue.arcs.filter(
        (arc: unknown): arc is { title?: string | null; type?: string | null } =>
          Boolean(arc && typeof arc === "object")
      )
    : Array.isArray((currentItem as any)?.issue?.arcs)
      ? (currentItem as any).issue.arcs.filter(
          (arc: unknown): arc is { title?: string | null; type?: string | null } =>
            Boolean(arc && typeof arc === "object")
        )
      : [];
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
            <Box
              sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 0.5 }}
            >
              <Typography
                sx={{
                  fontFamily: 'Roboto, "Helvetica Neue", Arial, sans-serif',
                  fontSize: "0.78rem",
                  lineHeight: 1.5,
                  fontWeight: 600,
                  textTransform: "uppercase",
                  letterSpacing: "0.16em",
                  color: "text.secondary",
                }}
              >
                Enthalten in
              </Typography>
              <IconButton
                size="small"
                aria-label={containsExpanded ? "Enthalten in einklappen" : "Enthalten in ausklappen"}
                onClick={() => setContainsExpanded((prev) => !prev)}
                sx={{
                  ml: 1,
                  transform: containsExpanded ? "rotate(0deg)" : "rotate(-90deg)",
                  transition: "transform 180ms ease",
                }}
              >
                <ExpandMoreIcon fontSize="small" />
              </IconButton>
            </Box>
            <Collapse in={containsExpanded}>
              <Box sx={{ mt: 1, minWidth: 0 }}>
                <StoryArcChips arcs={storyArcs} us={us} inline />
              </Box>
            </Collapse>
          </Box>
        ) : null}

        {reprints.length === 0 ? null : (
          <Box sx={{ mt: 2.5 }}>
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
              Nachgedruckt in
            </Typography>

            <List sx={{ p: 0 }}>
              {reprints.map((child, idx) => {
                if (!child.issue) return null;
                const relation = toStoryIssueRelation(child);

                return (
                  <StoryIssueListItem
                    key={toIssueRowKey(relation, idx)}
                    issue={child.issue}
                    number={child.number}
                    subtitle={child.addinfo ? child.addinfo : null}
                    routeUs={true}
                    coverUs={true}
                    divider={reprints.length - 1 !== idx}
                  />
                );
              })}
            </List>
          </Box>
        )}

        {!reprintOf?.issue ? null : (
          <Box sx={{ mt: 2.5 }}>
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
              Nachdruck von
            </Typography>

            <List sx={{ p: 0 }}>
              <StoryIssueListItem
                issue={reprintOf.issue}
                number={reprintOf.number}
                subtitle={reprintOf.addinfo ? reprintOf.addinfo : null}
                routeUs={true}
                coverUs={true}
              />
            </List>
          </Box>
        )}

        {children.length === 0 ? null : (
          <Box sx={{ mt: 2.5 }}>
            <Box
              sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 0.5 }}
            >
              <Typography
                sx={{
                  fontFamily: 'Roboto, "Helvetica Neue", Arial, sans-serif',
                  fontSize: "0.78rem",
                  lineHeight: 1.5,
                  fontWeight: 600,
                  textTransform: "uppercase",
                  letterSpacing: "0.16em",
                  color: "text.secondary",
                }}
              >
                Erschienen in ({children.length})
              </Typography>
              <IconButton
                size="small"
                aria-label={
                  germanPublishedExpanded
                    ? "Auf deutsch erschienen in einklappen"
                    : "Auf deutsch erschienen in ausklappen"
                }
                onClick={() => setGermanPublishedExpanded((prev) => !prev)}
                sx={{
                  ml: 1,
                  transform: germanPublishedExpanded ? "rotate(0deg)" : "rotate(-90deg)",
                  transition: "transform 180ms ease",
                }}
              >
                <ExpandMoreIcon fontSize="small" />
              </IconButton>
            </Box>

            <Collapse in={germanPublishedExpanded}>
              <List sx={{ p: 0 }}>
                {children.map((child, idx) => {
                  if (!child.issue) return null;
                  const relation = toStoryIssueRelation(child);
                  const addinfoText = toChildAddinfo(relation);
                  const parentLink =
                    child.parent?.issue && !isSameIssue(child.parent.issue, props.issue)
                      ? {
                          issue: child.parent.issue,
                          number: child.parent.number,
                          prefix: "als",
                          routeUs: true,
                          coverUs: true,
                        }
                      : null;

                  return (
                    <StoryIssueListItem
                      key={toIssueRowKey(relation, idx)}
                      issue={child.issue}
                      number={child.number}
                      subtitle={addinfoText !== "" ? addinfoText : null}
                      titleSuffix={child.issue.title ? " - " + child.issue.title : ""}
                      parentLink={parentLink}
                      routeUs={false}
                      coverUs={false}
                      showCollected
                      session={props.session}
                      divider={children.length - 1 !== idx}
                    />
                  );
                })}
              </List>
            </Collapse>
          </Box>
        )}
      </Box>

      <Box
        sx={(theme) => ({
          border: "1px solid",
          borderColor: "divider",
          borderRadius: 2,
          p: 2,
          backgroundColor:
            theme.palette.mode === "dark" ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.02)",
          gridColumn: { xs: "auto", md: hasGermanPublished ? "auto" : "1 / -1" },
        })}
      >
        <StoryPeopleSection
          item={(currentItem as Record<string, unknown>) || {}}
          us={us}
          includeTranslator
          translatorOptional
        />

        <StoryAppearanceSection
          item={(currentItem as Record<string, unknown>) || {}}
          us={us}
        />
      </Box>
    </Box>
  );
}
