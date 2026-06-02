/**
 * 社交分享 URL 生成
 * 使用各平台官方 Web Intent URL，无需第三方包
 */

export interface SocialShareParams {
  url: string
  title?: string
  text?: string
  /** 图片 URL（部分平台支持） */
  imageUrl?: string
}

/**
 * Twitter/X 分享 URL
 * @see https://developer.twitter.com/en/docs/twitter-for-websites/tweet-button/guides/web-intent
 */
export function buildTwitterShareUrl(params: SocialShareParams): string {
  const { url, text } = params
  const fullText = [text, url].filter(Boolean).join(' ')
  const search = new URLSearchParams()
  if (fullText) search.set('text', fullText)
  return `https://twitter.com/intent/tweet?${search.toString()}`
}

/**
 * 微博分享 URL
 * @see https://open.weibo.com/wiki/Share
 */
export function buildWeiboShareUrl(params: SocialShareParams): string {
  const { url, title } = params
  const search = new URLSearchParams()
  search.set('url', url)
  if (title) search.set('title', title)
  return `https://service.weibo.com/share/share.php?${search.toString()}`
}

/**
 * Bilibili 无官方 Web 分享 Intent
 * 返回复制链接的回调：将 url 复制到剪贴板
 */
export async function copyLinkToClipboard(url: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(url)
    return true
  } catch {
    return false
  }
}
