# Test OpenAI API with correct endpoint

$apiKey = "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"

# Test different endpoints
$endpoints = @(
    "https://api.openai.com/v1/chat/completions",
    "https://api.openai.com/v1/messages",
    "https://api.openai.com/v1/models"
)

Write-Host "Testing OpenAI API Connectivity...`n"

foreach ($endpoint in $endpoints) {
    Write-Host "Testing: $endpoint"
    
    try {
        if ($endpoint -like "*/models") {
            # Just get models list
            $response = Invoke-WebRequest -Uri $endpoint `
                -Method GET `
                -Headers @{
                    "Authorization" = "Bearer $apiKey"
                } `
                -TimeoutSec 10
        } else {
            # Try a simple chat completion
            $payload = @{
                "model" = "gpt-4-mini"
                "messages" = @(
                    @{
                        "role" = "user"
                        "content" = "Hello"
                    }
                )
                "max_tokens" = 10
            } | ConvertTo-Json
            
            $response = Invoke-WebRequest -Uri $endpoint `
                -Method POST `
                -Headers @{
                    "Authorization" = "Bearer $apiKey"
                    "Content-Type" = "application/json"
                } `
                -Body $payload `
                -TimeoutSec 10
        }
        
        Write-Host "✅ Status: $($response.StatusCode) - SUCCESS`n"
        
    } catch {
        $statusCode = $_.Exception.Response.StatusCode.Value__
        Write-Host "❌ Status: $statusCode - $($_.Exception.Message)`n"
    }
}

Write-Host "`nTesting translation with Chat Completions API...`n"

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
} | ConvertTo-Json

try {
    $response = Invoke-WebRequest -Uri "https://api.openai.com/v1/chat/completions" `
        -Method POST `
        -Headers @{
            "Authorization" = "Bearer $apiKey"
            "Content-Type" = "application/json"
        } `
        -Body $payload `
        -TimeoutSec 15

    Write-Host "✅ TRANSLATION API WORKING!`n"
    $content = $response.Content | ConvertFrom-Json
    
    Write-Host "Response:"
    Write-Host ($content | ConvertTo-Json -Depth 5)
    
    if ($content.choices -and $content.choices[0].message) {
        Write-Host "`n✅ Translation Result:`n"
        Write-Host $content.choices[0].message.content
    }
    
} catch {
    Write-Host "❌ Translation Failed"
    Write-Host "Error: $($_.Exception.Message)"
}
