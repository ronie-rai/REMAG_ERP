# Setting up GitHub Connection via SSH

This guide outlines how to generate a secure SSH key pair, add it to your GitHub account, and configure your local repository to connect to GitHub via SSH.

---

## Step 1: Generate a New SSH Key Pair

Open your terminal (PowerShell, Command Prompt, or bash) and run the following command. Replace `your_email@example.com` with your GitHub email:

```bash
ssh-keygen -t ed25519 -C "your_email@example.com"
```

1. When prompted to **"Enter file in which to save the key,"** press **Enter** to accept the default location:
   - Windows: `C:\Users\<YourUsername>\.ssh\id_ed25519`
   - Mac/Linux: `~/.ssh/id_ed25519`
2. When prompted for a passphrase, either enter a secure passphrase or press **Enter** twice for no passphrase (recommended for simple, local projects).

---

## Step 2: Copy the Public SSH Key

You need to copy the contents of the public key file (`id_ed25519.pub`).

### Windows (PowerShell)
```powershell
Get-Content ~\.ssh\id_ed25519.pub | clip
```

### Mac / Linux
```bash
cat ~/.ssh/id_ed25519.pub
# Copy the printed output to your clipboard
```

---

## Step 3: Add the SSH Key to Your GitHub Account

1. Go to your GitHub account settings: [GitHub SSH & GPG Keys](https://github.com/settings/keys)
2. Click the **New SSH Key** button in the top right.
3. Enter a descriptive **Title** (e.g., "Work Laptop" or "Personal Desktop").
4. Keep the **Key type** as "Authentication Key".
5. Paste your public key into the **Key** field.
6. Click **Add SSH key**.

---

## Step 4: Test Your Connection

To confirm that your SSH key is authorized, run the following in your terminal:

```bash
ssh -T git@github.com
```

*Note:* If this is your first time connecting, you might see a warning like:
`The authenticity of host 'github.com (...)' can't be established.`
Type **`yes`** and press **Enter** to add GitHub to your list of known hosts.

If successful, you will see:
```text
Hi username! You've successfully authenticated, but GitHub does not provide shell access.
```

---

## Step 5: Configure Your Repository to Use SSH

If your local repository is already configured with an HTTPS URL, you can change it to the SSH URL.

1. Find your repository's SSH URL under the green **Code** button on GitHub (it will look like `git@github.com:username/repository.git`).
2. Update the remote URL in your local project directory:
   ```bash
   git remote set-url origin git@github.com:username/repository.git
   ```
3. (Optional) Verify the remote URL change:
   ```bash
   git remote -v
   ```

---

## Step 6: Configure Git User Info (Per-Repository)

Ensure Git knows who you are when making commits in this repository:

```bash
git config user.name "Your Name"
git config user.email "your_email@example.com"
```
