import { renderIssueReportPage } from "@/app/_shared/catalogPages";

export default function UsIssueReportPage(props: Readonly<Parameters<typeof renderIssueReportPage>[0]>) {
  return renderIssueReportPage(props, true);
}
