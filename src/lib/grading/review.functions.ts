export interface ReviewAnnotation {
  id: string;
  pageNumber: number;
  x: number;
  y: number;
  text: string;
  authorName: string;
  createdAt: string;
}

export interface ReviewState {
  submissionId: string;
  annotations: ReviewAnnotation[];
  generalFeedback: string;
  scoreAwarded?: number;
  reviewedBy: string;
  reviewedAt: string;
}

export function createAnnotation(
  pageNumber: number,
  x: number,
  y: number,
  text: string,
  authorName: string
): ReviewAnnotation {
  return {
    id: Math.random().toString(36).substring(2, 9),
    pageNumber,
    x,
    y,
    text,
    authorName,
    createdAt: new Date().toISOString(),
  };
}
