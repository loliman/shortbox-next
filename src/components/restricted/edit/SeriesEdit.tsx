import React from "react";
import Layout from "../../Layout";
import { useAppRouteContext } from "../../generic";
import QueryResult from "../../generic/QueryResult";
import SeriesEditor from "../editor/SeriesEditor";
import { EditorPagePlaceholder } from "../../placeholders/EditorPagePlaceholder";

function SeriesEdit() {
  const { selected } = useAppRouteContext();
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<unknown>(null);
  const [seriesDetails, setSeriesDetails] = React.useState<Record<string, unknown> | null>(null);

  React.useEffect(() => {
    if (!selected.series?.publisher?.name || !selected.series?.title) {
      setSeriesDetails(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);
    const params = new URLSearchParams({
      locale: selected.us ? "us" : "de",
      publisher: selected.series.publisher.name,
      series: selected.series.title,
      volume: String(selected.series.volume || 1),
    });

    void fetch(`/api/public-series?${params.toString()}`, { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error(`Series request failed: ${response.status}`);
        return (await response.json()) as { item?: { details?: Record<string, unknown> } | null };
      })
      .then((payload) => {
        if (cancelled) return;
        setSeriesDetails(payload.item?.details || null);
      })
      .catch((nextError) => {
        if (cancelled) return;
        setSeriesDetails(null);
        setError(nextError);
      })
      .finally(() => {
        if (cancelled) return;
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [selected.series?.publisher?.name, selected.series?.title, selected.series?.volume, selected.us]);

  return (
    <Layout>
      {(() => {
        if (loading || error || !seriesDetails)
          return (
            <QueryResult
              loading={loading}
              error={error}
              data={seriesDetails}
              selected={selected}
              placeholder={<EditorPagePlaceholder />}
              placeholderCount={1}
            />
          );

        let defaultValues = structuredClone(seriesDetails) as Record<string, unknown>;

        defaultValues.issueCount = undefined;
        defaultValues.active = undefined;
        defaultValues["lastEdited"] = undefined;

        return (
          <SeriesEditor
            edit
            id={seriesDetails.id}
            defaultValues={defaultValues}
          />
        );
      })()}
    </Layout>
  );
}

export default SeriesEdit;
