import React from "react";
import Layout from "../../Layout";
import { useAppRouteContext } from "../../generic";
import QueryResult from "../../generic/QueryResult";
import PublisherEditor from "../editor/PublisherEditor";
import { EditorPagePlaceholder } from "../../placeholders/EditorPagePlaceholder";

function PublisherEdit() {
  const { selected } = useAppRouteContext();
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<unknown>(null);
  const [publisherDetails, setPublisherDetails] = React.useState<Record<string, unknown> | null>(null);

  React.useEffect(() => {
    if (!selected.publisher?.name) {
      setPublisherDetails(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);
    const params = new URLSearchParams({
      locale: selected.us ? "us" : "de",
      publisher: selected.publisher.name,
    });

    void fetch(`/api/public-publisher?${params.toString()}`, { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error(`Publisher request failed: ${response.status}`);
        return (await response.json()) as { item?: { details?: Record<string, unknown> } | null };
      })
      .then((payload) => {
        if (cancelled) return;
        setPublisherDetails(payload.item?.details || null);
      })
      .catch((nextError) => {
        if (cancelled) return;
        setPublisherDetails(null);
        setError(nextError);
      })
      .finally(() => {
        if (cancelled) return;
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [selected.publisher?.name, selected.us]);

  return (
    <Layout>
      {(() => {
        if (loading || error || !publisherDetails)
          return (
            <QueryResult
              loading={loading}
              error={error}
              data={publisherDetails}
              selected={selected}
              placeholder={<EditorPagePlaceholder />}
              placeholderCount={1}
            />
          );

        let defaultValues = structuredClone(publisherDetails) as Record<string, unknown>;

        defaultValues.seriesCount = undefined;
        defaultValues.issueCount = undefined;
        defaultValues.active = undefined;
        defaultValues["lastEdited"] = undefined;

        return (
          <PublisherEditor
            edit
            id={publisherDetails.id}
            defaultValues={defaultValues}
          />
        );
      })()}
    </Layout>
  );
}
export default PublisherEdit;
