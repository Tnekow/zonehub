/**
 * 赞助者数据：展示头像、昵称，点击头像可跳转链接（url 可为空）
 * 头像未提供 url 时展示默认 "?" 占位
 */
import raw from './sponsors.json';

export interface Sponsor {
  /** 展示头像 URL，为空时显示 "?" */
  avatar: string;
  /** 昵称 */
  nickname: string;
  /** 点击头像后的跳转 URL，可为空 */
  url: string;
}

export const sponsors: Sponsor[] = raw as Sponsor[];
