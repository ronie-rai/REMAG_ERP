# PDF Dependencies Installation Guide

## Required Packages
The PDF export functionality requires the following npm packages:
- `jspdf` - PDF generation library
- `jspdf-autotable` - Table generation for PDFs

## Installation Methods

### Method 1: Using the Batch File (Windows)
1. Navigate to the frontend directory: `cd frontend`
2. Run the batch file: `install-dependencies.bat`
3. Wait for installation to complete

### Method 2: Manual Installation
1. Open terminal/command prompt
2. Navigate to frontend directory: `cd frontend`
3. Run: `npm install jspdf jspdf-autotable`

### Method 3: PowerShell (Windows)
```powershell
cd frontend
npm install jspdf jspdf-autotable
```

## After Installation
Once installed, the application will automatically switch from the fallback PDF generator (browser print) to the full jsPDF implementation.

## Current Status
- ✅ Fallback PDF generator implemented (uses browser print)
- ⏳ Waiting for jspdf package installation
- 🔄 After installation: Full PDF generation with downloadable files

## Troubleshooting
If you encounter permission issues with npm, try:
```bash
npm install jspdf jspdf-autotable --force
```

Or run PowerShell as Administrator and then execute the installation command.
