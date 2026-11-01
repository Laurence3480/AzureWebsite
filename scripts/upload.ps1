# 岛上仓库 · 上传：弹出文件选择窗口，把选中的文件传到 GitHub Release
# 可直接双击运行，也可由网页上的"上传"按钮（island-upload:// 协议）唤起
$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root
$Host.UI.RawUI.WindowTitle = '岛上仓库 · 上传'

Add-Type -AssemblyName System.Windows.Forms
$dlg = New-Object System.Windows.Forms.OpenFileDialog
$dlg.Title = '选择要上传到岛上仓库的文件（可多选）'
$dlg.Multiselect = $true
$dlg.CheckFileExists = $true
# 对话框需要一个置顶的父窗口，否则可能被浏览器遮住
$owner = New-Object System.Windows.Forms.Form
$owner.TopMost = $true
if ($dlg.ShowDialog($owner) -ne 'OK') { Write-Host '已取消'; Start-Sleep 1; exit }

$tag = Read-Host '放进哪个文件夹？（直接回车 = files）'
if ([string]::IsNullOrWhiteSpace($tag)) { $tag = 'files' }

& node (Join-Path $root 'scripts\upload.mjs') @($dlg.FileNames) --tag $tag
if ($LASTEXITCODE -ne 0) { Write-Host '上传失败' -ForegroundColor Red } else { Write-Host '全部完成，刷新网页即可看到。' -ForegroundColor Green }
Write-Host ''
Read-Host '按回车关闭'
