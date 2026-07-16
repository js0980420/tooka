import { describe, expect, it } from 'vitest';
import {
  analyzeCardPages,
  generatePlatformDrafts,
  hasExternalLink,
  stripExternalLinks,
  validateInstagramHashtags,
  validateThreadsTopicTag,
} from './copy';

describe('publish copy', () => {
  it('extracts the cover hook, middle key points, and final CTA', () => {
    const insight = analyzeCardPages(
      [
        { page: 1, text: '別再把同一篇文案貼到所有平台' },
        { page: 2, text: 'Facebook\n補足背景與脈絡' },
        { page: 3, text: 'Instagram\n讓前兩行先抓住注意力' },
        { page: 4, text: '留言告訴我你最常用哪個平台' },
      ],
      'zh-TW',
    );

    expect(insight.hook).toEqual({ page: 1, text: '別再把同一篇文案貼到所有平台' });
    expect(insight.keyPoints).toHaveLength(2);
    expect(insight.cta).toMatchObject({ page: 4, generated: false });
  });

  it('generates distinct platform drafts and exactly five hashtags', () => {
    const insight = analyzeCardPages(
      [
        { page: 1, text: '三平台文案怎麼寫？' },
        { page: 2, text: '先找出 Hook' },
        { page: 3, text: '每一頁只留一個重點' },
        { page: 4, text: '收藏這篇，下次發文直接套用' },
      ],
      'zh-TW',
    );
    const drafts = generatePlatformDrafts(insight, 'zh-TW', '社群文案');

    expect(drafts.facebook).not.toBe(drafts.instagram);
    expect(drafts.instagram).not.toBe(drafts.threads);
    expect(drafts.instagramHashtags).toHaveLength(5);
    expect(validateInstagramHashtags(drafts.instagramHashtags)).toBe(true);
    expect(drafts.threadsTopicTag.startsWith('#')).toBe(false);
  });

  it('detects and removes external links', () => {
    expect(hasExternalLink('More at https://example.com/path')).toBe(true);
    expect(hasExternalLink('前往 example.com 查看')).toBe(true);
    expect(hasExternalLink('前往example.com查看')).toBe(true);
    expect(stripExternalLinks('前往 https://example.com 查看')).toBe('前往 查看');
  });

  it('validates Instagram hashtags and Threads topic tags', () => {
    expect(validateInstagramHashtags(['一', '二', '三', '四', '五'])).toBe(true);
    expect(validateInstagramHashtags(['一', '二', '三', '四', '四'])).toBe(false);
    expect(validateInstagramHashtags(['一', '二', '三', '四'])).toBe(false);
    expect(validateThreadsTopicTag('內容創作')).toBe(true);
    expect(validateThreadsTopicTag('')).toBe(false);
    expect(validateThreadsTopicTag('#內容創作')).toBe(false);
    expect(validateThreadsTopicTag('內容.創作')).toBe(false);
  });
});
