import { useEffect, useState } from 'react'

/** "#/kana/write" → ["kana", "write"]. 폰의 뒤로가기 버튼이 앱 안에서 동작하도록 해시로 이동한다 */
function parse(): string[] {
  return location.hash.replace(/^#\/?/, '').split('/').filter(Boolean)
}

export function useRoute(): string[] {
  const [route, setRoute] = useState(parse)
  useEffect(() => {
    const onChange = () => {
      setRoute(parse())
      window.scrollTo(0, 0)
    }
    window.addEventListener('hashchange', onChange)
    return () => window.removeEventListener('hashchange', onChange)
  }, [])
  return route
}

export function navigate(path: string): void {
  location.hash = `#/${path}`
}
