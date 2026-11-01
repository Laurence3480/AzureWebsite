import { useEffect, useMemo, useState } from 'react'

// 文件存放在本仓库的 GitHub Release 里：每个 Release 是一个"文件夹"，附件是文件。
// 公开仓库无需任何密钥即可读取，所以网站里不放任何凭据。
const REPO = 'Laurence3480/AzureWebsite'
const API = `https://api.github.com/repos/${REPO}/releases?per_page=100`
const CACHE_KEY = 'drive-cache-v1'
const CACHE_MS = 2 * 60 * 1000

const fmtSize = (n) => {
  if (n < 1024) return `${n} B`
  const u = ['KB', 'MB', 'GB', 'TB']
  let i = -1
  do {
    n /= 1024
    i++
  } while (n >= 1024 && i < u.length - 1)
  return `${n.toFixed(n < 10 ? 1 : 0)} ${u[i]}`
}

const fmtDate = (s) => new Date(s).toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' })

async function load(force) {
  if (!force) {
    try {
      const c = JSON.parse(sessionStorage.getItem(CACHE_KEY))
      if (c && Date.now() - c.t < CACHE_MS) return c.data
    } catch {
      /* 缓存损坏就忽略 */
    }
  }
  const res = await fetch(API, { headers: { Accept: 'application/vnd.github+json' } })
  if (res.status === 403 || res.status === 429) throw new Error('请求太频繁了，稍后再试（GitHub 对匿名访问有每小时 60 次限制）')
  if (!res.ok) throw new Error(`读取失败（${res.status}）`)
  const data = (await res.json())
    .filter((r) => !r.draft)
    .map((r) => ({
      id: r.id,
      name: r.name || r.tag_name,
      tag: r.tag_name,
      date: r.published_at || r.created_at,
      files: r.assets.map((a) => ({
        id: a.id,
        name: a.label || a.name,
        size: a.size,
        date: a.updated_at,
        count: a.download_count,
        url: a.browser_download_url,
      })),
    }))
  sessionStorage.setItem(CACHE_KEY, JSON.stringify({ t: Date.now(), data }))
  return data
}

export default function Drive({ onClose }) {
  const [groups, setGroups] = useState(null)
  const [error, setError] = useState('')
  const [q, setQ] = useState('')

  const refresh = (force) => {
    setError('')
    setGroups(null)
    load(force).then(setGroups, (e) => setError(e.message))
  }
  useEffect(() => {
    let alive = true
    load(false).then(
      (d) => alive && setGroups(d),
      (e) => alive && setError(e.message),
    )
    return () => {
      alive = false
    }
  }, [])

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const shown = useMemo(() => {
    if (!groups) return []
    const k = q.trim().toLowerCase()
    return groups
      .map((g) => ({ ...g, files: k ? g.files.filter((f) => f.name.toLowerCase().includes(k)) : g.files }))
      .filter((g) => g.files.length > 0)
  }, [groups, q])

  const total = groups ? groups.reduce((n, g) => n + g.files.length, 0) : 0

  return (
    <div className="drive-backdrop" onPointerDown={(e) => e.stopPropagation()} onClick={onClose}>
      <section className="drive" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="岛上仓库">
        <header>
          <h2>岛上仓库</h2>
          <span className="count">{groups ? `${total} 个文件` : ''}</span>
          <button className="ghost" onClick={() => refresh(true)} title="重新读取">
            刷新
          </button>
          <button className="ghost" onClick={onClose} aria-label="关闭">
            ✕
          </button>
        </header>
        <input className="search" placeholder="搜索文件名…" value={q} onChange={(e) => setQ(e.target.value)} />
        <div className="list">
          {error && <p className="note err">{error}</p>}
          {!error && !groups && <p className="note">正在从岛上取货…</p>}
          {groups && shown.length === 0 && !error && (
            <p className="note">{q ? '没有匹配的文件' : '仓库还是空的，往 GitHub Release 里传点东西吧'}</p>
          )}
          {shown.map((g) => (
            <div className="group" key={g.id}>
              <h3>
                {g.name}
                <small>{fmtDate(g.date)}</small>
              </h3>
              {g.files.map((f) => (
                <a className="file" key={f.id} href={f.url} download={f.name} rel="noopener">
                  <span className="fname">{f.name}</span>
                  <span className="meta">
                    {fmtSize(f.size)} · {fmtDate(f.date)} · ↓{f.count}
                  </span>
                </a>
              ))}
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
