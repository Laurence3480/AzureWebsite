#!/usr/bin/env node
// 把本地文件传到仓库的 GitHub Release（= 网站"岛上仓库"里的一个文件夹）
// 用法: node scripts/upload.mjs <文件路径...> [--tag 文件夹名]
// 凭据：复用 git 已保存的 GitHub 登录（Git Credential Manager），无需另外配置
import { execFileSync } from 'node:child_process'
import { readFileSync, statSync } from 'node:fs'
import { basename, extname } from 'node:path'
import { createHash } from 'node:crypto'

const REPO = 'Laurence3480/AzureWebsite'
const args = process.argv.slice(2)
let tag = 'files'
const paths = []
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--tag') tag = args[++i]
  else paths.push(args[i])
}
if (!paths.length) {
  console.error('用法: node scripts/upload.mjs <文件...> [--tag 文件夹名]')
  process.exit(1)
}

const token =
  process.env.GITHUB_TOKEN ||
  execFileSync('git', ['credential', 'fill'], {
    input: 'protocol=https\nhost=github.com\n\n',
    encoding: 'utf8',
  })
    .split('\n')
    .find((l) => l.startsWith('password='))
    ?.slice(9)
if (!token) throw new Error('没有找到 GitHub 凭据')

const gh = (url, opts = {}) =>
  fetch(url, {
    ...opts,
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json', ...opts.headers },
  })

let rel = await gh(`https://api.github.com/repos/${REPO}/releases/tags/${encodeURIComponent(tag)}`)
if (rel.status === 404) {
  rel = await gh(`https://api.github.com/repos/${REPO}/releases`, {
    method: 'POST',
    body: JSON.stringify({ tag_name: tag, name: tag, body: '云盘文件夹', make_latest: 'false' }),
  })
}
if (!rel.ok) throw new Error(`获取/创建 Release 失败: ${rel.status} ${await rel.text()}`)
const release = await rel.json()

// GitHub 会丢掉非 ASCII 字符（中文名会变成 default.txt），
// 所以存储名转成安全的 ASCII，原始名放进 label，网站显示 label。
const safeName = (orig) => {
  const ext = extname(orig).replace(/[^A-Za-z0-9.]/g, '')
  const stem = basename(orig, extname(orig)).replace(/[^A-Za-z0-9._-]+/g, '_').replace(/^_+|_+$/g, '')
  if (/[A-Za-z0-9]/.test(stem)) return stem + ext
  return 'file-' + createHash('sha1').update(orig).digest('hex').slice(0, 8) + ext
}

for (const p of paths) {
  const label = basename(p)
  const name = safeName(label)
  const size = statSync(p).size
  const old = release.assets.find((a) => a.name === name)
  if (old) await gh(`https://api.github.com/repos/${REPO}/releases/assets/${old.id}`, { method: 'DELETE' })
  const url = release.upload_url.replace('{?name,label}', `?name=${encodeURIComponent(name)}&label=${encodeURIComponent(label)}`)
  const res = await gh(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/octet-stream', 'Content-Length': String(size) },
    body: readFileSync(p),
  })
  if (!res.ok) throw new Error(`上传 ${name} 失败: ${res.status} ${await res.text()}`)
  console.log(`✓ ${label} (${(size / 1024).toFixed(1)} KB) → ${tag}${old ? '（已覆盖旧版本）' : ''}`)
}
