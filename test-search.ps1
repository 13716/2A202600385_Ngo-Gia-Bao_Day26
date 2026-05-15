$body = Get-Content test-search.json
Invoke-RestMethod -Uri 'http://localhost:3000/mcp/tool/search' -Method Post -ContentType 'application/json' -Body $body
