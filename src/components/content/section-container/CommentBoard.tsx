import React, { useState } from 'react';
import SectionContainer from '../../common/SectionContainer';
import { friends } from '../../../data/friends';
import type { Friend } from '../../../data/friends';
import { useI18n } from '../../../hooks/useI18n';
import ProfileRichText from '../../common/ProfileRichText';
import SafeImage from '../../common/SafeImage';

export interface Comment {
  id: number;
  avatar: string;
  name: string;
  time: string;
  content: string;
}

// 自定义字体样式 - 使用游黑体（Yu Gothic），缺字时用微软正黑体（Microsoft JhengHei）替补
const customFontStyle = {
  fontFamily: '"Yu Gothic", "Microsoft JhengHei", "Microsoft YaHei", "PingFang SC", "Hiragino Sans GB", "Heiti SC", "Source Han Sans SC", "Noto Sans CJK SC", "WenQuanYi Micro Hei", sans-serif'
};

// 随机选择好友函数
const getRandomFriend = (): Friend => {
  const randomIndex = Math.floor(Math.random() * friends.length);
  return friends[randomIndex];
};



const initialComments: Comment[] = [
  {
    id: 1,
    avatar: getRandomFriend().avatar,
    name: getRandomFriend().nickname,
    time: '2024-12-10 17:29',
    content:
      '⡿⢋⣴⣾⣿⣿⣿⣿⣿⣿⣿⣿⣿⣷⡆⠕⣬⡾⢏⣾⣥⣶⣶⣤⣉⠻⣷⣬\n' +
      '⣡⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⡿⣿⡘⠸⣋⡵⠚⡁⢻⣿⣿⣿⣿⣶⢽⣿\n' +
      '⣿⣿⣿⣿⣿⣿⠟⣿⠹⡜⣿⡇⡅⣦⡙⡜⡍⣠⣭⣍⠘⣿⣿⠇⡌⣿⣶⣬\n' +
      '⣿⣿⣿⣿⡟⡏⣄⠛⣰⣴⣉⣥⣿⢿⡿⢰⣣⣿⣿⣿⣠⠙⢃⣾⡆⣈⢻⣿\n' +
      '⣽⣿⢸⣿⣷⢡⣿⣾⣟⣛⣿⣿⣯⣴⠶⠘⢶⣾⣥⣿⣿⣷⡼⢿⣷⣿⢸⣿\n' +
      '⣯⢻⢸⣿⣿⠸⣿⡫⢴⣶⡿⠿⠷⣿⣶⢠⣴⣿⣿⣽⣿⣿⣾⠶⠬⠋⠎⡝\n' +
      '⣿⡜⡔⠼⣿⣿⣌⡳⣾⣧⡀⠄⣠⠟⢡⣆⠻⣿⣯⣙⣛⣿⣿⣷⡆⣀⡾⠰\n' +
      '⡿⢣⣑⠊⢮⣻⣿⡷⠌⠛⠛⠋⢕⣛⡸⣸⢿⣦⡍⣛⡛⠿⠿⠋⠴⠛⢠⣾\n' +
      '⣁⢃⢻⡷⡱⢗⠫⠰⣿⣿⣿⡏⡴⣠⣶⣶⣶⣶⣶⣶⣾⠿⠿⠿⠿⠄⣿⣿\n' +
      '⣿⣿⢃⣴⣿⣿⣿⣿⣿⣿⣿⡇⠇⣻⣿⠿⠟⠛⢛⡍⠐⢛⡡⢿⣿⣄⢻⣿',
  },
  {
    id: 2,
    avatar: getRandomFriend().avatar,
    name: getRandomFriend().nickname,
    time: '2024-12-10 00:31',
    content: 'Welcome to zonehub!',
  },
];

const CommentBoard: React.FC = () => {
  const { t, formatTime } = useI18n();
  const [comments, setComments] = useState<Comment[]>(initialComments);
  const [newContent, setNewContent] = useState('');
  const [hoveredComment, setHoveredComment] = useState<number | null>(null);
  const [currentSpeaker, setCurrentSpeaker] = useState<Friend>(getRandomFriend());
  const [isAvatarHovered, setIsAvatarHovered] = useState(false);

  // 隐藏滚动条的CSS样式
  const textareaStyle = {
    height: '38px',
    scrollbarWidth: 'none' as const, // Firefox
    msOverflowStyle: 'none' as const, // IE/Edge
    ...customFontStyle
  };

  // 切换发言用户
  const switchSpeaker = () => {
    setCurrentSpeaker(getRandomFriend());
  };

  const handleAdd = () => {
    if (!newContent.trim()) return;
    setComments([
      {
        id: Date.now(),
        avatar: currentSpeaker.avatar,
        name: currentSpeaker.nickname,
        time: new Date().toISOString(),
        content: newContent,
      },
      ...comments,
    ]);
    setNewContent('');
  };

  const handleDelete = (id: number) => {
    setComments(comments.filter(c => c.id !== id));
  };

  // TODO: Add edit logic

  return (
    <>
      <style>
        {`
          .hide-scrollbar::-webkit-scrollbar {
            display: none;
          }
        `}
      </style>
      <SectionContainer 
        title={t('comments:title')} 
        subtitle={t('comments:subtitle', { count: comments.length })}
        subtitlePosition="below"
      >
        {/* 添加评论区域 */}
        <div className="flex items-start gap-3 mb-4 bg-steam-item rounded p-3">
          {/* 用户头像 */}
          <div 
            className="relative"
            onMouseEnter={() => setIsAvatarHovered(true)}
            onMouseLeave={() => setIsAvatarHovered(false)}
          >
            <SafeImage 
              src={currentSpeaker.avatar} 
              alt="User Avatar" 
              className="w-[38px] h-[38px] rounded border border-steam-secondary-border object-cover flex-shrink-0 cursor-pointer"
              onClick={switchSpeaker}
            />
            {/* 刷新图标 - 只在悬停时显示 */}
            {isAvatarHovered && (
              <div 
                className="absolute inset-0 bg-black/50 rounded flex items-center justify-center cursor-pointer"
                onClick={switchSpeaker}
              >
                <span className="text-white text-lg">🔄</span>
              </div>
            )}
          </div>
          
          {/* 留言框和按钮区域 */}
          <div className="flex-1 flex flex-col gap-2">
            <textarea
              value={newContent}
              onChange={e => setNewContent(e.target.value)}
              placeholder={t('comments:commentPlaceholder')}
              className="w-full bg-steam-item-in text-steam-textPrimary border border-steam-secondary-border rounded px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-steam-primary hide-scrollbar placeholder:italic"
              style={textareaStyle}
            />
            
            {/* 提交留言按钮 - 只在有内容时显示 */}
            {newContent.trim() && (
              <div className="flex justify-end gap-2">
                {/* 格式帮助按钮 */}
                <button
                  className="bg-steam-title text-[#66c0f4] px-3 py-1 rounded text-sm font-medium hover:bg-white/10 transition-colors flex items-center gap-1"
                  style={{ height: '23px', ...customFontStyle }}
                >
                  {t('comments:actions.help')}
                  {/* 笑脸图标 */}
                  <svg className="w-4 h-4 text-white/70" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="12" cy="12" r="10" strokeWidth="2"></circle>
                    <path d="M8 14h8M8 10h.01M16 10h.01"></path>
                  </svg>
                </button>
                {/* 提交留言按钮 */}
                <button
                  onClick={handleAdd}
                  className="bg-gradient-to-b from-[#7a9c35] to-[#5a7c25] text-[#e6f4c3] px-3 py-1 rounded text-sm font-medium hover:from-[#8aac45] hover:to-[#6a8c35] transition-all duration-200 shadow-sm"
                  style={{ width: '80px', height: '23px', ...customFontStyle }}
                >
                  {t('comments:postComment')}
                </button>
              </div>
            )}
          </div>
        </div>
        
        {/* 评论列表 */}
        <div className="flex flex-col gap-4">
          {comments.map(comment => (
            <div 
              key={comment.id} 
              className={`flex items-start gap-3 p-3 rounded transition-colors duration-200 relative ${
                hoveredComment === comment.id ? 'bg-steam-item-in' : ''
              }`}
              onMouseEnter={() => setHoveredComment(comment.id)}
              onMouseLeave={() => setHoveredComment(null)}
            >
              <SafeImage src={comment.avatar} alt={comment.name} className="w-10 h-10 rounded  border-steam-secondary-border object-cover" />
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-0.2">
                  <span className="text-steam-textPrimary" style={customFontStyle}>{comment.name}</span>
                  <span className="text-xs text-steam-textMuted" style={customFontStyle}>{formatTime(comment.time)}</span>
                </div>
                {comment.id === 1 ? (
                  <pre className="overflow-x-auto whitespace-pre text-[10px] leading-3 text-steam-textPrimary font-mono">
                    {comment.content}
                  </pre>
                ) : (
                  <div className="text-steam-textPrimary text-sm whitespace-pre-line" style={customFontStyle}>
                    <ProfileRichText text={comment.content} />
                  </div>
                )}
              </div>
              
              {/* 删除按钮 - 只在悬停时显示 */}
              {hoveredComment === comment.id && (
                <button
                  onClick={() => handleDelete(comment.id)}
                  className="absolute top-2 right-2 p-1.5 text-steam-textMuted bg-steam-item-in hover:text-red-400 transition-colors duration-200 rounded"
                  title={t('comments:deleteComment')}
                >
                  {/* 垃圾箱图 标*/}
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                  </svg>
                </button>
              )}
            </div>
          ))}
        </div>
      </SectionContainer>
    </>
  );
};

export default CommentBoard; 
