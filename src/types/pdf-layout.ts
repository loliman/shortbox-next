export interface PdfLayoutTextItem {
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fontName?: string;
  fillColor?: string;
}

export interface PdfLayoutRow {
  text: string;
  items: PdfLayoutTextItem[];
  xMin: number;
  xMax: number;
  y: number;
  height: number;
}

export interface PdfLayoutBlock {
  text: string;
  rows: PdfLayoutRow[];
  xMin: number;
  xMax: number;
  yTop: number;
  yBottom: number;
}

export interface PdfLayoutPage {
  pageNumber: number;
  width: number;
  height: number;
  items: PdfLayoutTextItem[];
  rows: PdfLayoutRow[];
  blocks: PdfLayoutBlock[];
}

export interface PdfLayoutDocument {
  pages: PdfLayoutPage[];
}
