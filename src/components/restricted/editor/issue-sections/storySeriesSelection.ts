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
    title: String(selectedOption?.title || ""),
    volume: selectedOption?.volume ?? 0,
  };
}
