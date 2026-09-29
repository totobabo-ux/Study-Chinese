import type { ReactNode } from 'react'

/** 중국어 텍스트. 간체자 글꼴이 확실히 쓰이도록 lang을 붙인다 */
export function Zh({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <span lang="zh-CN" className={`font-zh ${className}`}>
      {children}
    </span>
  )
}
