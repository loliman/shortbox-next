type PublisherItem = {
  name: string;
  us: boolean;
};

type SeriesItem = {
  title: string;
  volume: number;
  startyear: number;
  endyear: number | null;
  publisher?: {
    name: string;
    us: boolean;
  };
};

export function dedupePublisherItems(items: PublisherItem[]) {
  return dedupeBy(items, (item) => `${item.name}::${item.us}`);
}

export function dedupeSeriesItems(items: SeriesItem[]) {
  return dedupeBy(
    items,
    (item) =>
      `${item.title}::${item.volume}::${item.startyear}::${item.publisher?.name || ""}::${item.publisher?.us ?? ""}`
  );
}

function dedupeBy<T>(items: T[], getKey: (item: T) => string) {
  const unique = new Map<string, T>();

  items.forEach((item) => {
    const key = getKey(item);
    if (!unique.has(key)) unique.set(key, item);
  });

  return [...unique.values()];
}
