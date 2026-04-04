import { renderIssueReportPage } from "@/app/_shared/catalogPages";

export default function DeIssueReportPage(props: Readonly<Parameters<typeof renderIssueReportPage>[0]>) {
  return renderIssueReportPage(props, false);
}
