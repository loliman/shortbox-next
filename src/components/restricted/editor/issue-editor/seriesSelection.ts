type PublisherSelection = {
  title: string;
  volume: number | string;
  publisher: {
    name: string;
    us: boolean;
  };
};

type SeriesOption = {
  title?: string;
  volume?: number | string;
};

export function getNextPublisherSelection(
  selectedOption: { name?: string; us?: boolean } | string | null,
  currentUs: boolean
): PublisherSelection {
  if (typeof selectedOption === "string") {
    return {
      title: "",
      volume: "",
      publisher: {
        name: selectedOption,
        us: currentUs,
      },
    };
  }

  return {
    title: "",
    volume: "",
    publisher: {
      name: String(selectedOption?.name || ""),
      us: typeof selectedOption?.us === "boolean" ? selectedOption.us : currentUs,
    },
  };
}

export function getNextSeriesSelection(
  selectedOption: SeriesOption | string | null,
  currentPublisher: { name: string; us: boolean },
  currentVolume: number | string
) {
  if (typeof selectedOption === "string") {
    return {
      title: selectedOption,
      volume: currentVolume,
      publisher: currentPublisher,
    };
  }

  return {
    title: String(selectedOption?.title || ""),
    volume: selectedOption?.volume ?? "",
    publisher: currentPublisher,
  };
}
