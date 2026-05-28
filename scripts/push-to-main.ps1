#!/usr/bin/env pwsh
# Script para automatizar commit e push para a branch `main`.
# Execute este script na máquina local (tem que ter Git instalado e credenciais configuradas).

$ErrorActionPreference = 'Stop'

function Fail([string]$msg) {
    Write-Error $msg
    exit 1
}

if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
    Fail "Git não foi encontrado na PATH. Instale Git (https://git-scm.com) e execute novamente neste repositório."
}

# Detecta raiz do repositório
$repoRoot = & git rev-parse --show-toplevel 2>$null
if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrWhiteSpace($repoRoot)) {
    Fail "Este diretório não parece ser a raiz de um repositório Git. Abra o terminal na pasta do projeto e tente novamente."
}

Set-Location ($repoRoot.Trim())

Write-Host "Usando repositório: $((Get-Location).Path)"

Write-Host "Buscando atualizações remotas..."
& git fetch origin

Write-Host "Adicionando arquivos modificados: render.yaml, docs/render-deploy.md"
& git add render.yaml docs/render-deploy.md

Write-Host "Tentando criar commit..."
& git commit -m "chore(render): force Node build root + deploy docs" 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Host "Nenhuma alteração para commitar."
} else {
    Write-Host "Commit criado com sucesso."
}

Write-Host "Criando/renomeando branch local para 'main'..."
& git branch -M main

Write-Host "Enviando para origin/main..."
& git push -u origin main
if ($LASTEXITCODE -ne 0) {
    Fail "Push falhou. Verifique suas credenciais Git e a conectividade com o GitHub."
}

Write-Host "Push concluído. Agora vá ao painel do Render e confirme:"
Write-Host "  - Branch: main"
Write-Host "  - Root Directory: backend"
Write-Host "  - Runtime: Node"
Write-Host "Em seguida clique em Manual Deploy → Deploy Latest Commit."

Write-Host "Para checar health após deploy, rode:"
Write-Host "  curl -sS https://<SEU-SERVICO>.onrender.com/api/health"
