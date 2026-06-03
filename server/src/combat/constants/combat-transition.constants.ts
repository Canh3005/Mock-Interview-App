import type { TransitionReason } from '../types/combat-transition.types';

export const STAGE_TIME_ALLOCATION: Record<number, number> = {
  1: 0.15,
  2: 0.2,
  3: 0.2,
  4: 0.2,
  5: 0.15,
  6: 0.1,
};

export const MAX_TURNS: Record<string, number> = {
  junior: 5,
  mid: 4,
  senior: 4,
};

export const TRANSITION_PHRASES: Record<TransitionReason, string[]> = {
  TIME_BUDGET_EXCEEDED: [
    'Được rồi, cảm ơn bạn về phần chia sẻ vừa rồi. Bây giờ mình muốn chuyển sang một chủ đề khác nhé.',
    'Rất hay. Mình ghi nhận phần này. Giờ mình sẽ hỏi bạn về một khía cạnh khác.',
  ],
  MAX_TURNS_REACHED: [
    'OK, mình đã nắm được khá rõ về phần này. Chúng ta chuyển tiếp nhé.',
    'Được, mình đã hiểu quan điểm của bạn. Bây giờ chuyển sang chủ đề tiếp theo nhé.',
  ],
  CANDIDATE_CEILING: [
    'Mình hiểu rồi. Chúng ta sẽ chuyển sang phần tiếp theo nhé.',
    'Được, mình đã nắm được quan điểm của bạn. Giờ mình muốn tìm hiểu thêm về một khía cạnh khác.',
  ],
  OFF_TOPIC_PERSISTENT: [
    'Không sao. Mình sẽ chuyển sang một chủ đề khác, có thể sẽ phù hợp hơn với bạn.',
  ],
};
