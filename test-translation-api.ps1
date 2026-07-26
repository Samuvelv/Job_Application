$apiKey = "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"
$endpoint = "https://api.openai.com/v1/chat/completions"

Write-Host "Testing OpenAI Chat Completions API..." -ForegroundColor Cyan
Write-Host "Endpoint: $endpoint`n"

$testJson = @{
    "greeting" = "Hello"
    "message" = "Welcome to NTL Career Nexus"
    "button" = "Login"
} | ConvertTo-Json

$prompt = @"
You are a JSON translator. Translate this JSON to Spanish.
Keep all keys exactly the same, only translate the string values.
Return ONLY valid JSON, nothing else.

JSON: $testJson
"@

$payload = @{
    "model" = "gpt-4-mini"
    "messages" = @(
        @{
            "role" = "user"
            "content" = $prompt
        }
    )
    "max_tokens" = 500
    "temperature" = 0.3
} | ConvertTo-Json

try {
    Write-Host "Sending request..." -ForegroundColor Yellow
    $response = Invoke-WebRequest -Uri $endpoint `
        -Method POST `
        -Headers @{
            "Authorization" = "Bearer $apiKey"
            "Content-Type" = "application/json"
        } `
        -Body $payload `
        -TimeoutSec 30
    
    $content = $response.Content | ConvertFrom-Json
    
    if ($content.choices -and $content.choices[0].message) {
        Write-Host "`n✅ TRANSLATION SUCCESS!`n" -ForegroundColor Green
        Write-Host "Original JSON:" -ForegroundColor Cyan
        Write-Host $testJson
        Write-Host "`nSpanish Translation:" -ForegroundColor Green
        Write-Host $content.choices[0].message.content
        Write-Host "`nAPI Response:" -ForegroundColor Cyan
        Write-Host ($content | ConvertTo-Json -Depth 3) -ForegroundColor Gray
    } else {
        Write-Host "❌ Unexpected response format" -ForegroundColor Red
        Write-Host ($content | ConvertTo-Json)
    }
    
} catch {
    Write-Host "❌ ERROR" -ForegroundColor Red
    Write-Host "Status: $($_.Exception.Response.StatusCode.Value__)" -ForegroundColor Red
    Write-Host "Message: $($_.Exception.Message)" -ForegroundColor Red
    
    # Try to extract error details
    try {
        $errorContent = $_.Exception.Response.GetResponseStream()
        $reader = New-Object System.IO.StreamReader($errorContent)
        $errorBody = $reader.ReadToEnd()
        Write-Host "Response Body: $errorBody" -ForegroundColor Yellow
    } catch {}
}
