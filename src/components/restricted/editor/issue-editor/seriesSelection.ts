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
      name: readTextValue(selectedOption?.name),
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
    title: readTextValue(selectedOption?.title),
    volume: selectedOption?.volume ?? "",
    publisher: currentPublisher,
  };
}

function readTextValue(value: unknown): string {
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  return "";
}
