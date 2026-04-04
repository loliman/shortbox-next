import { renderIssueCreatePage } from "@/app/_shared/catalogPages";

export default function UsIssueCreatePublisherPage(
  props: Readonly<Parameters<typeof renderIssueCreatePage>[0]>
) {
  return renderIssueCreatePage(props, true);
}
