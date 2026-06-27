# Remag ERP — Features & Usage Guide

This document describes the major features of the Remag ERP application and how to use them.

## 1) Access & Navigation

### 1.1 Login
- Open the ERP web app URL provided by your deployment (or local frontend URL).
- Sign in using your assigned credentials.

### 1.2 Main Modules
The left sidebar contains the core modules:
- Dashboard
- Sales & CRM
- Production
- Procurement
- Store
- Accounting
- Admin

Use the sidebar to open a module. Each module contains lists, create forms, and detail views.

## 2) Common Screen Patterns

### 2.1 List Pages (Index)
Most modules have a list page that supports:
- Viewing existing records
- Searching/filtering (where available)
- Opening a record’s Details page
- Creating a new record

### 2.2 Create / Edit Forms
Forms are used to create or update records.
Typical actions:
- Fill required fields
- Click Save/Create/Update
- After saving, return to the list or open details

### 2.3 Details View
The details page shows record data in a clean read-only layout.
From details you can typically:
- Go Back
- Print (if the feature is enabled for that record type)

### 2.4 Printing / PDF Output
Some production documents support printing.
- Open the record Details view
- Click the **Print** button
- In the browser print dialog choose **Save as PDF**

Notes:
- Print layouts are designed to match the Details layout.
- Print output is optimized to fit within a single A4 page when possible (auto-scaling).
- The ERP sidebar/topbar is hidden during printing so only the document content is printed.

## 3) Production Module

The Production module is used to manage job-related documentation such as checklists, motor data sheets, and test reports.

### 3.1 Job Entries
Purpose:
- Maintain job information used across Production documents.

How to use:
- Open **Production → Job Entries**
- Create a new job entry
- Use the Job Number when creating related documents

### 3.2 Checklists
Purpose:
- Record inspection/verification checks for a job.

How to create:
- Open **Production → Checklists**
- Click **New** / **Create**
- Select/enter Job details
- Fill checklist items (Status + Remarks)
- Save

How to view:
- Open a checklist from the list
- Use the Details page to review all items

How to print:
- On the checklist Details page click **Print**
- Save as PDF

Important:
- The **Observation** field has been removed from Checklist form/details/print.

### 3.3 AC Motor Data Sheet
Purpose:
- Store AC motor data and winding/specification details.

How to create:
- Open **Production → Data Sheet → AC Motor**
- Click **New**
- Fill job and specification details
- Fill winding details table
- Save

How to view:
- Open a record → Details

How to print:
- On Details click **Print**
- Save as PDF

Important:
- The **Nameplate Details** text field has been removed.

### 3.4 DC Motor Data Sheet
Purpose:
- Store DC motor data including armature winding details and field coil details.

How to create:
- Open **Production → Data Sheet → DC Motor**
- Click **New**
- Fill armature winding section
- Fill field coil winding table
- Save

How to view:
- Open a record → Details

How to print:
- On Details click **Print**
- Save as PDF

Important:
- The **Name Plate Details** text field has been removed.
- DC print layout is aligned to AC print format (sectioned compact layout).

### 3.5 Test Report
Purpose:
- Record final electrical test measurements for a job.

How to create:
- Open **Production → Test Report**
- Click **New**
- Select Job Number
- Fill Motor Details
- Fill Measurements section
- Save

How to view:
- Open a record → Details

How to print:
- On Details click **Print**
- Save as PDF

Print layout:
- Test Report print is available in a bordered tabular format suitable for A4 PDF.

## 4) Procurement Module
Purpose:
- Manage purchasing flows (items, vendors, purchase requests/orders depending on what is enabled).

How to use:
- Open **Procurement**
- Use list pages to create and manage procurement records

## 5) Store Module
Purpose:
- Manage inventory/stock items and stock movements (depending on configuration).

How to use:
- Open **Store**
- Create/manage stock and related transactions

## 6) Accounting Module
Purpose:
- Record accounting-related entries and reports (based on enabled features).

How to use:
- Open **Accounting**
- Use available pages for vouchers/entries/reports

## 7) Admin Module
Purpose:
- Application administration and master data management.

How to use:
- Open **Admin**
- Configure users/roles/master records (as available)

## 8) Troubleshooting

### 8.1 Print includes sidebar/topbar
- Ensure you are printing from the dedicated print page opened via the **Print** button.
- If the browser is caching an old version, hard refresh and try again.

### 8.2 PDF exceeds one page
- Very large remarks/fields can force scaling.
- If content is still too long, reduce long text fields or split into shorter remarks.

### 8.3 Data not appearing
- Confirm the record is saved.
- Check the job number and related linkage.
- Refresh the page.

## 9) Quick Start (Most common)
- Create Job Entry
- Create Checklist (and print)
- Create AC/DC Data Sheet (and print)
- Create Test Report (and print)
