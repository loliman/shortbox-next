import React from "react";
import Layout from "../../Layout";
import { useAppRouteContext } from "../../generic";
import QueryResult from "../../generic/QueryResult";
import IssueEditor from "../editor/IssueEditor";
import { mapIssueToEditorDefaultValues } from "../editor/issue-editor/defaultValues";
import { EditorPagePlaceholder } from "../../placeholders/EditorPagePlaceholder";

function IssueEdit() {
  const { selected } = useAppRouteContext();
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<unknown>(null);
  const [issueDetails, setIssueDetails] = React.useState<Record<string, unknown> | null>(null);

  React.useEffect(() => {
    if (!selected.issue?.series?.publisher?.name || !selected.issue?.series?.title || !selected.issue.number) {
      setIssueDetails(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);
    const params = new URLSearchParams({
      locale: selected.us ? "us" : "de",
      publisher: selected.issue.series.publisher.name,
      series: selected.issue.series.title,
      volume: String(selected.issue.series.volume || 1),
      number: selected.issue.number,
    });
    if (selected.issue.format) params.set("format", selected.issue.format);
    if (selected.issue.variant) params.set("variant", selected.issue.variant);

    void fetch(`/api/public-issue?${params.toString()}`, { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error(`Issue request failed: ${response.status}`);
        return (await response.json()) as { item?: Record<string, unknown> | null };
      })
      .then((payload) => {
        if (cancelled) return;
        setIssueDetails(payload.item || null);
      })
      .catch((nextError) => {
        if (cancelled) return;
        setIssueDetails(null);
        setError(nextError);
      })
      .finally(() => {
        if (cancelled) return;
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [selected]);

  return (
    <Layout>
      {(() => {
        if (loading || error || !issueDetails)
          return (
            <QueryResult
              loading={loading}
              error={error}
              data={issueDetails}
              selected={selected}
              placeholder={<EditorPagePlaceholder />}
              placeholderCount={1}
            />
          );

        const defaultValues = mapIssueToEditorDefaultValues(issueDetails as any, false);

        return (
          <IssueEditor
            id={issueDetails.id}
            edit
            defaultValues={defaultValues}
          />
        );
      })()}
    </Layout>
  );
}

export default IssueEdit;
