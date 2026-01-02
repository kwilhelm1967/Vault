# How to Access Your Server (Simple Guide)

## What is "SSH into server"?

**SSH** = **S**ecure **Sh**ell

It's like **remotely logging into your server computer** to run commands and manage files.

Think of it like:
- **Your computer** = Your laptop/desktop
- **The server** = A computer in a data center (like Linode) that runs your backend
- **SSH** = A secure way to connect to that remote computer and control it

---

## Do You Have a Server?

**Question:** Do you have a Linode account or any server where your backend should run?

- **If YES:** You need the server's IP address and login credentials
- **If NO:** You need to set up a server first (Linode, DigitalOcean, AWS, etc.)

---

## How to SSH (Windows)

### Option 1: Built-in Windows SSH (Easiest)

1. **Open PowerShell** (search "PowerShell" in Windows)

2. **Type this command:**
   ```
   ssh username@your-server-ip
   ```
   
   **Example:**
   ```
   ssh root@192.168.1.100
   ```
   
   (Replace `root` with your username and `192.168.1.100` with your server's IP address)

3. **Enter your password** when prompted

4. **You're now connected!** You'll see a command prompt like:
   ```
   root@server:~#
   ```

### Option 2: Use PuTTY (If you prefer a program)

1. **Download PuTTY:** https://www.putty.org/
2. **Install and open PuTTY**
3. **Enter your server IP address**
4. **Click "Open"**
5. **Enter username and password**

---

## What You Need

Before you can SSH, you need:

1. **Server IP Address**
   - Find this in your Linode/DigitalOcean/AWS dashboard
   - Looks like: `192.168.1.100` or `45.79.123.456`

2. **Username**
   - Usually `root` for new servers
   - Or a username you created

3. **Password or SSH Key**
   - Password: You set this when creating the server
   - SSH Key: A file that acts like a password (more secure)

---

## Alternative: Web-Based Control Panel

**Some hosting providers offer web-based control panels** where you can:
- Upload files
- Run commands
- Manage your server

**Check if your hosting provider has:**
- **Linode:** Cloud Manager (web interface)
- **DigitalOcean:** Droplet console (web-based terminal)
- **AWS:** EC2 Instance Connect (browser-based SSH)

**This is easier than SSH if available!**

---

## What to Do After Connecting

Once you're connected to your server, you'll run commands like:

```bash
# Navigate to your backend folder
cd /var/www/lpv-api

# Install dependencies
npm install

# Start the server
pm2 start server.js
```

---

## Need Help?

**If you don't have a server yet:**
1. Sign up for Linode, DigitalOcean, or AWS
2. Create a new server/instance
3. Choose Ubuntu or Linux
4. Save the IP address and password

**If you have a server but don't know the IP:**
1. Log into your hosting provider's dashboard
2. Find your server/instance
3. Look for "IP Address" or "Public IP"

**If you forgot your password:**
1. Most hosting providers let you reset it from their dashboard
2. Or use SSH key authentication instead

---

## Quick Checklist

- [ ] I have a server (Linode/DigitalOcean/AWS/etc.)
- [ ] I know my server's IP address
- [ ] I know my username (usually `root`)
- [ ] I know my password or have an SSH key
- [ ] I can connect using SSH or web console

---

**Still confused?** Ask your developer or hosting provider support for help!
