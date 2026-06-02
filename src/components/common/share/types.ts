/** 分享时展示的设计配置信息 */
export interface ShareInfo {
  themeName: string
  backgroundName: string
  badgeNames: string[]
  componentNames: string[]
}

/** 社交分享平台 */
export type SocialPlatform = 'twitter' | 'weibo' | 'bilibili'
