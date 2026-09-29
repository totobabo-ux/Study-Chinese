import { splitPinyin } from '../lib/pinyin'
import { useToneColors } from '../lib/storage'

/** 병음 표시. 설정에 따라 음절마다 성조 색을 칠한다 */
export function Pinyin({ text, className = '' }: { text: string; className?: string }) {
  const [colors] = useToneColors()
  if (!colors) return <span className={className}>{text}</span>
  return (
    <span className={className}>
      {splitPinyin(text).map((part, i) => (typeof part === 'string' ? <span key={i}>{part}</span> : <span key={i} className={`tone-${part.tone}`}>{part.text}</span>))}
    </span>
  )
}
