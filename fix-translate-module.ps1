# Fix all remaining components missing TranslateModule

$componentsToFix = @(
    "C:\Dhinesh\projects\Job_Application\frontend\src\app\features\admin\candidate-profile\candidate-profile-page.component.ts",
    "C:\Dhinesh\projects\Job_Application\frontend\src\app\features\admin\candidate-register\candidate-register.component.ts",
    "C:\Dhinesh\projects\Job_Application\frontend\src\app\features\admin\contact-submissions\contact-submissions-page.component.ts",
    "C:\Dhinesh\projects\Job_Application\frontend\src\app\features\admin\edit-requests\edit-requests.component.ts",
    "C:\Dhinesh\projects\Job_Application\frontend\src\app\features\admin\interest-requests\interest-requests.component.ts",
    "C:\Dhinesh\projects\Job_Application\frontend\src\app\features\admin\master\master-form-modal.component.ts",
    "C:\Dhinesh\projects\Job_Application\frontend\src\app\features\admin\master\master-management.component.ts",
    "C:\Dhinesh\projects\Job_Application\frontend\src\app\features\admin\recruiter-create\recruiter-create.component.ts",
    "C:\Dhinesh\projects\Job_Application\frontend\src\app\features\admin\recruiter-list\recruiter-list.component.ts",
    "C:\Dhinesh\projects\Job_Application\frontend\src\app\features\admin\recruiter-profile\recruiter-profile-page.component.ts",
    "C:\Dhinesh\projects\Job_Application\frontend\src\app\features\admin\volunteers\volunteer-create.component.ts",
    "C:\Dhinesh\projects\Job_Application\frontend\src\app\features\admin\volunteers\volunteer-list.component.ts",
    "C:\Dhinesh\projects\Job_Application\frontend\src\app\features\admin\volunteers\volunteer-profile-page.component.ts",
    "C:\Dhinesh\projects\Job_Application\frontend\src\app\features\candidate\volunteers\volunteer-browse.component.ts",
    "C:\Dhinesh\projects\Job_Application\frontend\src\app\features\candidate\volunteers\volunteer-public-profile.component.ts"
)

foreach ($file in $componentsToFix) {
    if (Test-Path $file) {
        $content = Get-Content $file -Raw
        
        # Check if TranslateModule is already imported
        if ($content -notmatch "TranslateModule") {
            Write-Output "Fixing: $file"
            
            # Add import
            $content = $content -replace "(from '@angular/common';)(\s+import)", "`$1`r`nimport { TranslateModule } from '@ngx-translate/core';`$2"
            
            # Find and fix imports array (simple approach - just add TranslateModule after CommonModule or first item)
            $content = $content -replace "(imports:\s*\[\s*CommonModule)", "`$1, TranslateModule"
            if ($content -notmatch "imports:\s*\[.*TranslateModule") {
                # If CommonModule not found, just add it before the first closing bracket
                $content = $content -replace "(imports:\s*\[[^\]]*?)(\])", "`$1, TranslateModule`$2"
            }
            
            Set-Content -Path $file -Value $content -Encoding UTF8
            Write-Output "  ✓ Fixed"
        }
    } else {
        Write-Output "NOT FOUND: $file"
    }
}

Write-Output "✓ All files fixed!"
