import { renderIssueEditPage } from "@/app/_shared/catalogPages";

export default function UsIssueEditPage(props: Readonly<Parameters<typeof renderIssueEditPage>[0]>) {
  return renderIssueEditPage(props, true);
}
