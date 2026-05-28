#!/usr/bin/env pwsh
<#
Script: create-github-repo.ps1
Descrição: Cria um repositório no GitHub (usuário ou org) via API e envia o código local.

Requisitos:
- PowerShell (Windows PowerShell ou PowerShell Core)
- Git instalado e disponível em PATH
- Variável de ambiente `GITHUB_TOKEN` com um Personal Access Token (scope `repo`)

Uso:
  # cria repo com nome padrão (pasta atual) no usuário do token e faz push
  pwsh .\scripts\create-github-repo.ps1

  # especificando nome, descrição e owner (organização ou usuário)
  pwsh .\scripts\create-github-repo.ps1 -RepoName r2c-scan -Description "R2C-Scan v2.0" -Owner jcae1000 -Private:$false

Segurança:
- O script usa o token para chamar a API do GitHub e, temporariamente, para autenticar o push via URL HTTPS. Evite expor seu token.
#>

[CmdletBinding()]
param(
    [string]$RepoName = "",
    [string]$Description = "",
    [string]$Owner = "",
    [switch]$Private
)

$ErrorActionPreference = 'Stop'

function Fail([string]$msg) {
    Write-Error $msg
    exit 1
}

if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
    Fail "Git não foi encontrado na PATH. Instale Git (https://git-scm.com) e execute novamente neste repositório."
}

$token = $env:GITHUB_TOKEN
if ([string]::IsNullOrWhiteSpace($token)) {
    Fail "Variável de ambiente GITHUB_TOKEN não encontrada. Crie um Personal Access Token (scope 'repo') e exporte para GITHUB_TOKEN antes de rodar."
}

# Detecta raiz do repositório (ou inicializa um repositório Git se não houver)
$isGit = (& git rev-parse --is-inside-work-tree 2>$null) -eq 'true'
if (-not $isGit) {
    Write-Host "Nenhum repositório Git encontrado — inicializando..."
    git init
}

# Use o nome da pasta atual se RepoName não informado
if (-not $RepoName) { $RepoName = Split-Path -Leaf (Get-Location) }

Write-Host "Nome do repositório alvo: $RepoName"

# Adiciona e commita alterações locais
Write-Host "Adicionando arquivos e criando commit (se houver mudanças)..."
& git add -A
try {
    & git commit -m "chore: initial commit" 2>$null | Out-Null
    Write-Host "Commit criado (se havia mudanças)."
} catch {
    Write-Host "Nenhum commit criado (sem mudanças ou commit redundante)."
}

# Força branch main
Write-Host "Definindo branch local para 'main'..."
& git branch -M main

# Monta a URL da API para criação (usuário ou org)
if ($Owner) {
    $apiUrl = "https://api.github.com/orgs/$Owner/repos"
} else {
    $apiUrl = "https://api.github.com/user/repos"
}

$body = @{
    name = $RepoName
    description = $Description
    private = $Private.IsPresent
    auto_init = $false
}
$json = $body | ConvertTo-Json -Depth 10

Write-Host "Criando repositório em: $apiUrl"
try {
    $headers = @{ Authorization = "token $token"; Accept = 'application/vnd.github+json'; 'User-Agent' = 'r2c-scan-create-repo-script' }
    $resp = Invoke-RestMethod -Uri $apiUrl -Method Post -Headers $headers -Body $json -ContentType 'application/json'
} catch {
    $err = $_.Exception.Message
    if ($_.Exception.Response) {
        try { $bodyText = (New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())).ReadToEnd() } catch { $bodyText = '' }
        Fail "Falha ao criar repositório: $err`n$bodyText"
    } else {
        Fail "Falha ao criar repositório: $err"
    }
}

if (-not $resp -or -not $resp.clone_url) { Fail "Resposta inesperada da API. Não foi possível obter URL do repositório." }

$cloneUrl = $resp.clone_url
$htmlUrl = $resp.html_url
Write-Host "Repositório criado: $htmlUrl"

# Configura remote origin
try {
    $existing = (& git remote get-url origin 2>$null) -ne $null
} catch { $existing = $false }

if ($existing) {
    Write-Host "Atualizando remote 'origin' para $cloneUrl"
    git remote set-url origin $cloneUrl
} else {
    Write-Host "Adicionando remote 'origin' -> $cloneUrl"
    git remote add origin $cloneUrl
}

# Push usando token embutido na URL para evitar prompt interativo
$pushUrl = $cloneUrl.Replace('https://', "https://$token@")
Write-Host "Enviando branch 'main' para GitHub..."
try {
    & git push $pushUrl main -u
} catch {
    Fail "Falha no push: $($_.Exception.Message)"
}

Write-Host "Push concluído com sucesso. Repositório disponível em: $htmlUrl"
Write-Host "Sugestão: remova o token da variável de ambiente quando terminar: `n  Remove-Item Env:\GITHUB_TOKEN"

Write-Host "Próximo: no painel do Render, configure o serviço para usar branch 'main', Root Directory = backend e Runtime = Node, então faça Manual Deploy."

Exit 0
