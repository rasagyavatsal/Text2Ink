import {
  paginateDocument,
  type PaginateDocumentInput,
  type PaginationLineData,
  type ResolvedPageLayout,
} from './layout/LayoutEngine';
export { createMeasure, measureRenderedLine, nextLineFrom } from './layout/textWrap';

export type PaginationRequest = {
  type: 'paginate';
  requestId: number;
} & PaginateDocumentInput;

export type PaginationResponse = {
  type: 'pagination-result';
  requestId: number;
  pages: PaginationLineData[][];
  pageLayouts?: ResolvedPageLayout[];
  isPaginationComplete: boolean;
  totalPages: number;
};

export function paginate(req: PaginationRequest): PaginationResponse {
  const result = paginateDocument(req);
  return {
    type: 'pagination-result',
    requestId: req.requestId,
    pages: result.pages,
    pageLayouts: result.pageLayouts,
    isPaginationComplete: result.isPaginationComplete,
    totalPages: result.totalPages,
  };
}
