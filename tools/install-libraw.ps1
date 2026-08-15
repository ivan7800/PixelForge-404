$ErrorActionPreference = 'Stop'
$Version = 'v1.6.0'
$BaseUrl = "https://github.com/ybouane/LibRaw-Wasm/releases/download/$Version"
$Dest = Join-Path (Split-Path $PSScriptRoot -Parent) 'vendor/libraw'
New-Item -ItemType Directory -Force -Path $Dest | Out-Null
$Files = @{
  'index.js'='3eb710aa5473c58c3b9dec74457b2ad2095d15b9a6df0056c96a3a011b720ca6'
  'libraw.js'='e23952fca5b268550af1f84619af5c0c035e5db3bde0e4d5a20300f1614a9487'
  'libraw.wasm'='8947f7e668e488461c3e9defe7007583aa8477b4886aa603b36b407f2f0846ff'
  'worker.js'='af074781439ddf9c47fcbd3b3f115049ab884fdf61ec49ab358f28a8c42a4d4c'
}
foreach($Name in $Files.Keys){
  $Path = Join-Path $Dest $Name
  Write-Host "[PixelForge] Descargando $Name"
  Invoke-WebRequest -Uri "$BaseUrl/$Name" -OutFile $Path
  $Hash=(Get-FileHash -Algorithm SHA256 $Path).Hash.ToLowerInvariant()
  if($Hash -ne $Files[$Name]){Remove-Item $Path -Force; throw "SHA256 inválido para $Name"}
}
Write-Host "LibRaw-Wasm $Version instalado en $Dest"
