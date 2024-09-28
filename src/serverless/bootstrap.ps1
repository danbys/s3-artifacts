# Initialize variables
$BASE_URL = "";

# Check if the environment variable for accessKeyId is set
if (-Not [string]::IsNullOrWhiteSpace($env:ACCESS_KEY_ID)) {
    $accessKeyId = $env:ACCESS_KEY_ID
} else {
    # Prompt for user input if the environment variable is not set
    $accessKeyId = Read-Host "Enter accessKeyId"
}
# Check if the environment variable for secretAccessKey is set
if (-Not [string]::IsNullOrWhiteSpace($env:SECRET_ACCESS_KEY)) {
    $secretAccessKey = $env:SECRET_ACCESS_KEY
} else {
    # Prompt for user input if the environment variable is not set
    $secretAccessKey = Read-Host "Enter secretAccessKey"
}
# Check if the environment variable for install_dir is set
if (-Not [string]::IsNullOrWhiteSpace($env:INSTALL_DIR)) {
    $install_dir = $env:INSTALL_DIR
} else {
    # Prompt for user input if the environment variable is not set
    $install_dir = Read-Host "Enter installation directory path"
}
New-Item -Path $install_dir -ItemType Directory -Force  > $null
Set-Location -Path $install_dir


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
AWS_ACCESS_KEY_ID=$accessKeyId
AWS_SECRET_ACCESS_KEY=$secretAccessKey
"@

        $envContent | Out-File -FilePath ".env" -Encoding UTF8
    }
} catch {
    Write-Error $_.Exception.Message
} 
