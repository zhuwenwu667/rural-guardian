param(
  [Parameter(Mandatory = $true)]
  [string]$SourceRoot,

  [Parameter(Mandatory = $true)]
  [string]$DestinationZip,

  [Parameter(Mandatory = $true)]
  [string]$RootFolderName
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem

function Should-SkipPath {
  param([string]$FullPath)

  $normalized = $FullPath.Replace('/', '\')
  $skipPatterns = @(
    '\.git\',
    '\node_modules\',
    '\frontend\node_modules\',
    '\backend\node_modules\'
  )

  foreach ($pattern in $skipPatterns) {
    if ($normalized -like "*$pattern*") {
      return $true
    }
  }

  if ($normalized -like '*.log') {
    return $true
  }

  if ($normalized -like '*.zip') {
    return $true
  }

  return $false
}

if (Test-Path $DestinationZip) {
  Remove-Item $DestinationZip -Force
}

$sourceRootResolved = (Resolve-Path $SourceRoot).Path
$destinationDir = Split-Path -Parent $DestinationZip

if (-not (Test-Path $destinationDir)) {
  New-Item -ItemType Directory -Path $destinationDir | Out-Null
}

$zip = [System.IO.Compression.ZipFile]::Open($DestinationZip, [System.IO.Compression.ZipArchiveMode]::Create)

try {
  $files = Get-ChildItem -Path $sourceRootResolved -Recurse -File -Force

  foreach ($file in $files) {
    if (Should-SkipPath -FullPath $file.FullName) {
      continue
    }

    $relativePath = $file.FullName.Substring($sourceRootResolved.Length).TrimStart('\')
    $entryName = [System.IO.Path]::Combine($RootFolderName, $relativePath).Replace('\', '/')
    [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile($zip, $file.FullName, $entryName, [System.IO.Compression.CompressionLevel]::Optimal) | Out-Null
  }
}
finally {
  $zip.Dispose()
}

Write-Output "ZIP_CREATED: $DestinationZip"
