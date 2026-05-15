Write-Host "=== Test INSERT ===" -ForegroundColor Green
$insertBody = Get-Content test-insert.json
$insertResult = Invoke-RestMethod -Uri 'http://localhost:3000/mcp/tool/insert' -Method Post -ContentType 'application/json' -Body $insertBody
$insertResult | ConvertTo-Json -Depth 10

Write-Host "`n=== Test AGGREGATE ===" -ForegroundColor Green
$aggBody = Get-Content test-aggregate.json
$aggResult = Invoke-RestMethod -Uri 'http://localhost:3000/mcp/tool/aggregate' -Method Post -ContentType 'application/json' -Body $aggBody
$aggResult | ConvertTo-Json -Depth 10
