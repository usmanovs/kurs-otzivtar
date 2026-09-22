import { Review } from '../types';

// Per-browser record of which reviews this visitor already voted on. Shared by
// the homepage (modal), the standalone teacher page and the reviews feed so a
// vote cast in one place shows up in the others.
export const VOTED_REVIEWS_KEY = 'kursotzivtar_voted_reviews_v1';

export type VoteType = 'helpful' | 'unhelpful';
export type VoteMap = Record<string, VoteType>;

export function loadVotedReviews(): VoteMap {
  try {
    const saved = localStorage.getItem(VOTED_REVIEWS_KEY);
    return saved ? JSON.parse(saved) : {};
  } catch {
    return {};
  }
}

export function saveVotedReviews(votes: VoteMap): void {
  try {
    localStorage.setItem(VOTED_REVIEWS_KEY, JSON.stringify(votes));
  } catch (e) {
    console.error('Failed to save voted reviews to localStorage', e);
  }
}

/** The new counts and vote after `type` is clicked (a second click un-votes). */
export function computeVote(
  review: Pick<Review, 'helpfulCount' | 'unhelpfulCount' | 'userVoted'>,
  type: VoteType
): { helpfulCount: number; unhelpfulCount: number; newVote: VoteType | undefined } {
  const prevVote = review.userVoted;
  let helpfulCount = review.helpfulCount;
  let unhelpfulCount = review.unhelpfulCount;
  let newVote: VoteType | undefined;

  if (prevVote === type) {
    if (type === 'helpful') helpfulCount = Math.max(0, helpfulCount - 1);
    else unhelpfulCount = Math.max(0, unhelpfulCount - 1);
    newVote = undefined;
  } else {
    if (prevVote === 'helpful') helpfulCount = Math.max(0, helpfulCount - 1);
    if (prevVote === 'unhelpful') unhelpfulCount = Math.max(0, unhelpfulCount - 1);
    if (type === 'helpful') helpfulCount += 1;
    else unhelpfulCount += 1;
    newVote = type;
  }

  return { helpfulCount, unhelpfulCount, newVote };
}
