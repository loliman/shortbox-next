import { getNextStoryParentSeriesSelection } from "./storySeriesSelection";

describe("storySeriesSelection", () => {
  it("keeps a free-solo story parent series instead of clearing it", () => {
    expect(getNextStoryParentSeriesSelection("Amazing Spider-Man", 1)).toEqual({
      title: "Amazing Spider-Man",
      volume: 1,
    });
  });
});
