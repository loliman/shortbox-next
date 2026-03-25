import { resolveIndividualListItems } from "./IndividualList";

describe("resolveIndividualListItems", () => {
  it("should_use_story_individuals_when_type_is_translator", () => {
    const storyTranslator = [{ name: "Translator Story", type: "TRANSLATOR" }];
    const parentIssueCreators = [{ name: "Writer Parent", type: "WRITER" }];

    expect(
      resolveIndividualListItems(
        {
          individuals: storyTranslator,
          parent: { individuals: parentIssueCreators },
        },
        "TRANSLATOR"
      )
    ).toEqual(storyTranslator);
  });

  it("should_use_parent_issue_individuals_for_non_translator_roles", () => {
    const storyPeople = [
      { name: "Story Writer", type: "WRITER" },
      { name: "Story Inker", type: "INKER" },
    ];
    const parentIssuePeople = [
      { name: "Parent Writer", type: "WRITER" },
      { name: "Parent Editor", type: "EDITOR" },
    ];

    expect(
      resolveIndividualListItems(
        {
          individuals: storyPeople,
          parent: { individuals: parentIssuePeople },
        },
        "WRITER"
      )
    ).toEqual(parentIssuePeople);
  });

  it("should_use_story_individuals_when_parent_issue_has_no_matching_role", () => {
    const storyPeople = [
      { name: "Story Writer", type: "WRITER" },
      { name: "Story Inker", type: "INKER" },
    ];
    const parentIssuePeople = [{ name: "Parent Editor", type: "EDITOR" }];

    expect(
      resolveIndividualListItems(
        {
          individuals: storyPeople,
          parent: { individuals: parentIssuePeople },
        },
        "WRITER"
      )
    ).toEqual(storyPeople);
  });

  it("should_fall_back_to_current_issue_individuals_when_no_parent_issue_individuals_exist", () => {
    const currentIssuePeople = [
      { name: "Issue Writer", type: "WRITER" },
      { name: "Issue Editor", type: "EDITOR" },
    ];

    expect(
      resolveIndividualListItems(
        {
          individuals: [{ name: "Story Translator", type: "TRANSLATOR" }],
          issue: { individuals: currentIssuePeople },
        },
        "WRITER"
      )
    ).toEqual(currentIssuePeople);
  });
});



