type StorySeriesSelection = {
  title: string;
  volume: number | string;
};

export function getNextStoryParentSeriesSelection(
  selectedOption: { title?: string; volume?: number | string } | string | null,
  currentVolume: number | string
): StorySeriesSelection {
  if (typeof selectedOption === "string") {
    return {
      title: selectedOption,
      volume: currentVolume || 1,
    };
  }

  return {
    title: readTextValue(selectedOption?.title),
    volume: selectedOption?.volume ?? 0,
  };
}

function readTextValue(value: unknown): string {
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  return "";
}
