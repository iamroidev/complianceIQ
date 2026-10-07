# Secure Development Standard

Demo policy document · version 1.0

## 1. Purpose

This standard covers how software is written, checked and released at the firm. It applies to every engineer and to contractors who commit code.

## 2. Secrets and credentials

Secrets and credentials must never be committed to the repository.

Commits must be scanned for hardcoded secrets before they reach the main branch.

## 3. Testing

Customer-facing systems must undergo an independent penetration test at least annually.

Findings rated critical must be fixed within 14 days of being reported.

## 4. Dependencies

Dependencies must be scanned for known vulnerabilities every week.

Third-party dependencies must be approved before they are added.

## 5. Review

All changes to production code must be reviewed by a second engineer.

Disaster recovery tests must be run each June and the results must be filed.
