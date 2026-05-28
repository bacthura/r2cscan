#!/usr/bin/env pwsh
<#
deploy-all.ps1
Automatiza: commit, push para um repositório remoto e opcionalmente dispara o deploy no Render.

Uso (exemplo):
  # preferível: exporte as variáveis de ambiente para não expor chaves em histórico
  $env:RENDER_API_KEY = 'RENDER_API_KEY_HERE'
  $env:RENDER_SERVICE_ID = 'srv-XXXXX'
  pwsh .\scripts\deploy-all.ps1 -RepoUrl 'https://github.com/bacthura/r2cscan.git' -Branch main

Parâmetros:
  -RepoUrl (string)  : URL do repositório remoto (HTTPS ou SSH). Default: https://github.com/bacthura/r2cscan.git
  -Branch (string)   : branch a enviar (default: main)
  -RenderServiceId   : opcional, Service ID do Render para trigger de deploy
  -RenderApiKey      : opcional, Render API key (se não fornecido usa $env:RENDER_API_KEY)

Notas:
 - Executar localmente na raiz do projeto. Requer Git instalado e credenciais configuradas.
 - Não compartilhe chaves em chats; prefira usar variáveis de ambiente.
#>

[CmdletBinding()]
param(
    [string]$RepoUrl = 'https://github.com/bacthura/r2cscan.git',
    [string]$Branch = 'main',
    [string]$RenderServiceId = '',
    [string]$RenderApiKey = ''
)

$ErrorActionPreference = 'Stop'

function Fail([string]$msg) {
    Write-Error $msg
    exit 1
}

if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
    Fail "Git não encontrado. Instale Git e configure suas credenciais antes de rodar este script."
}

try {
    $repoRoot = (& git rev-parse --show-toplevel 2>$null).Trim()
} catch {
    $repoRoot = ''
}

if ([string]::IsNullOrWhiteSpace($repoRoot)) {
    Write-Host "Nenhum repositório Git detectado — inicializando um novo repositório aqui..."
    git init
    $repoRoot = (Get-Location).Path
}

Set-Location $repoRoot
Write-Host "Repositório: $repoRoot"

# Configure remote origin
try {
    $existing = (& git remote get-url origin 2>$null) -ne $null
} catch { $existing = $false }

if ($existing) {
    Write-Host "Remote 'origin' existe. Atualizando para: $RepoUrl"
    git remote set-url origin $RepoUrl
} else {
    Write-Host "Adicionando remote 'origin' -> $RepoUrl"
    git remote add origin $RepoUrl
}

Write-Host "Adicionando mudanças e criando commit (se houver)..."
& git add -A
try {
    & git commit -m "chore(render): prepare deploy changes" 2>$null | Out-Null
    if ($LASTEXITCODE -eq 0) { Write-Host "Commit criado." } else { Write-Host "Nenhum commit criado (sem mudanças)." }
} catch {
    Write-Host "Nenhum commit criado (provavelmente sem mudanças)."
}

Write-Host "Forçando branch local para '$Branch'..."
& git branch -M $Branch

Write-Host "Fazendo push para origin/$Branch..."
try {
    & git push -u origin $Branch
} catch {
    Fail "Falha no push. Verifique suas credenciais Git e a URL remota. Error: $($_.Exception.Message)"
}

Write-Host "Push concluído."

# Trigger deploy no Render, se solicitado
if (-not [string]::IsNullOrWhiteSpace($RenderServiceId)) {
    if (-not $RenderApiKey) { $RenderApiKey = $env:RENDER_API_KEY }
    if (-not $RenderApiKey) { Fail "Render API key não fornecida. Exporte RENDER_API_KEY ou passe -RenderApiKey." }

    Write-Host "Disparando deploy no Render para service: $RenderServiceId"
    try {
        $headers = @{ Authorization = "Bearer $RenderApiKey"; 'Content-Type' = 'application/json' }
        $url = "https://api.render.com/v1/services/$RenderServiceId/deploys"
        $resp = Invoke-RestMethod -Uri $url -Method Post -Headers $headers -Body '{}' -ErrorAction Stop
        Write-Host "Deploy solicitado com sucesso. ID de deploy: $($resp.id)"
    } catch {
        Fail "Falha ao solicitar deploy via API Render: $($_.Exception.Message)"
    }
} elseif ($env:RENDER_SERVICE_ID -and $env:RENDER_API_KEY) {
    Write-Host "Variáveis de ambiente RENDER_SERVICE_ID e RENDER_API_KEY detectadas — disparando deploy..."
    try {
        $headers = @{ Authorization = "Bearer $env:RENDER_API_KEY"; 'Content-Type' = 'application/json' }
        $url = "https://api.render.com/v1/services/$env:RENDER_SERVICE_ID/deploys"
        $resp = Invoke-RestMethod -Uri $url -Method Post -Headers $headers -Body '{}' -ErrorAction Stop
        Write-Host "Deploy solicitado com sucesso. ID de deploy: $($resp.id)"
    } catch {
        Fail "Falha ao solicitar deploy via API Render: $($_.Exception.Message)"
    }
} else {
    Write-Host "Render deploy não solicitado — para disparar, passe -RenderServiceId e -RenderApiKey, ou exporte RENDER_SERVICE_ID e RENDER_API_KEY no ambiente."
}

Write-Host "Fim do script. Verifique os logs no painel do Render se necessário."
