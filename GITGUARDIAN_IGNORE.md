# GitGuardian False Positives

This document explains how to handle GitGuardian false positives in this repository.

## Files with False Positives

1. **`.env.example`** - Contains placeholder values, not real secrets
2. **`docker-compose.yml`** - Contains environment variable references, not hardcoded secrets

## How to Ignore in GitGuardian

### Option 1: Via GitGuardian Dashboard (Recommended)

1. Go to your GitGuardian dashboard
2. Navigate to the incidents page
3. Find the incidents flagged for `.env.example` and `docker-compose.yml`
4. Mark them as **"False Positive"** or **"Resolved"**
5. GitGuardian will remember this for future scans

### Option 2: Via GitGuardian UI Settings

1. Go to GitGuardian Settings
2. Navigate to "Ignored paths" or "File exclusions"
3. Add the following paths:
   - `.env.example`
   - `docker-compose.yml`

### Option 3: Via Pull Request Comments

If GitGuardian comments on your PR:
1. Reply to the GitGuardian bot comment
2. Use the command: `/ggshield ignore` or mark as false positive
3. Follow the prompts to ignore the specific incidents

## Why These Are False Positives

- **`.env.example`**: Contains only placeholder text like `your-database-password-here`, not actual credentials
- **`docker-compose.yml`**: Uses environment variable syntax `${DB_PASSWORD}`, not hardcoded values

## Important

⚠️ **Never commit actual secrets!** This configuration only ignores example/template files. Real `.env` files with actual secrets should never be committed and are already in `.gitignore`.

