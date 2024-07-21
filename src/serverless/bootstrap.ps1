# Initialize variables
$BASE_URL = "";

# Prompt for user input
$accessKeyId = Read-Host "Enter accessKeyId"
# $secretAccessKey = Read-Host "Enter secretAccessKey" -AsSecureString
$secretAccessKey = Read-Host "Enter secretAccessKey"

# Function to fetch data from HTTPS endpoint
function Fetch-WithHttps {
    param (
        [string]$url
    )
    $headers = @{
        "accessKeyId" = $accessKeyId
#        "secretAccessKey" = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($secretAccessKey))
        "secretAccessKey" = $secretAccessKey
    }
    try {
        $response = Invoke-RestMethod -Uri $url -Method Get -Headers $headers
        return $response
    } catch {
        Write-Error "Error with the request: $($_.Exception.Message)"
    }
}

# Main script execution
try {
    Write-Host "Downloading files..."
    $files = Fetch-WithHttps -url $BASE_URL
    foreach ($file in $files) {
        $data = Fetch-WithHttps -url "$BASE_URL/$([uri]::EscapeDataString($file))"
        $byteData = [System.Convert]::FromBase64String($data)
        $filePath = Join-Path -Path $PWD -ChildPath $file

        if (-Not (Test-Path $filePath)) {
            New-Item -ItemType Directory -Force -Path (Split-Path $filePath) > $null
            [System.IO.File]::WriteAllBytes($filePath, $byteData)
            Write-Host $file
        } else {
            Write-Host "Skipping $file, already exists"
        }
    }

    # Check if .env file already exists
    if (-Not (Test-Path -Path ".env")) {
        # Write to .env file
        $envContent = @"
BASE_URL=$BASE_URL
ACCESS_KEY_ID=$accessKeyId
SECRET_ACCESS_KEY=$secretAccessKey
"@

        $envContent | Out-File -FilePath ".env" -Encoding UTF8
    }
} catch {
    Write-Error $_.Exception.Message
} 
