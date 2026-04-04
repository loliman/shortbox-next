import { renderIssueEditPage } from "@/app/_shared/catalogPages";

export default function DeIssueEditPage(props: Readonly<Parameters<typeof renderIssueEditPage>[0]>) {
  return renderIssueEditPage(props, false);
}
