import type { PdfLayoutBlock, PdfLayoutPage, PdfLayoutRow } from "./pdf-layout";

export interface PreviewImportLayoutAnchor {
  issueCode: string;
  metadataBlock: PdfLayoutBlock;
  contentRow: PdfLayoutRow | null;
  contentRows: PdfLayoutRow[];
  contentText: string;
  titleRows: PdfLayoutRow[];
  titleText: string;
  collectionTitleRows: PdfLayoutRow[];
  collectionTitleText: string;
  confidence: number;
}

export interface PreviewImportLayoutPageAnalysis {
  page: PdfLayoutPage;
  anchors: PreviewImportLayoutAnchor[];
  usesMultiColumnPattern: boolean;
}
