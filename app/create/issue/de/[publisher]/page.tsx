import { renderIssueCreatePage } from "@/app/_shared/catalogPages";

export default function DeIssueCreatePublisherPage(
  props: Readonly<Parameters<typeof renderIssueCreatePage>[0]>
) {
  return renderIssueCreatePage(props, false);
}
