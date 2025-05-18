# YouTube MP3 Downloader - Server Setup Guide

This guide provides step-by-step instructions for deploying the YouTube MP3 Downloader application on a Linux/Ubuntu server.

## Prerequisites

- A Linux/Ubuntu server (Ubuntu 20.04 LTS or newer recommended)
- Root or sudo access to the server
- A domain name (optional, but recommended for production use)

## Step 1: Update System Packages

```bash
sudo apt update
sudo apt upgrade -y
```

## Step 2: Install Node.js and npm

```bash
# 1. Install nvm (Node Version Manager)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash

# 2. Load nvm into your current shell session
export NVM_DIR="$HOME/.nvm"
source "$NVM_DIR/nvm.sh"

# 3. Install Node.js 22.11.0 (replace with actual version if different)
nvm install 22.11.0

# 4. Use this version
nvm use 22.11.0

# 5. Set it as default (optional)
nvm alias default 22.11.0

# Verify installation
node -v
npm -v
```

## Step 3: Install yt-dlp and ffmpeg

```bash
# Install ffmpeg
sudo apt install -y ffmpeg

# Install yt-dlp
sudo curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp
sudo chmod a+rx /usr/local/bin/yt-dlp

# Verify installations
ffmpeg -version
yt-dlp --version
```

## Step 4: Clone and Configure the Application

```bash
# Install Git if not already installed
sudo apt install -y git

# Clone the repository
git clone https://github.com/tclsoftwarehouse/ezplay_server.git
cd ezplay_server

# Install dependencies
npm install
```

## Step 5: Update the Application Configuration

Edit the `routes/download.routes.js` file to specify the correct path to ffmpeg:

```bash
nano routes/download.routes.js
```

Find the lines with `--ffmpeg-location` and update them to:

```javascript
'--ffmpeg-location', '/usr/bin/ffmpeg', // Specify ffmpeg location
```

also yt-dlp
<!-- const ytDlp= new YTDlpWrap("/usr/local/bin/yt-dlp"); -->

## Step 6: Set Up Environment Variables

Create a `.env` file for environment variables:

```bash
nano .env
```

Add the following content (adjust as needed):

```
PORT=3000
MONGODB_URI=mongodb://localhost:27017/youtube-downloader
```

## Step 7: Test the Application

```bash
# Start the application
node server.js
```

If everything is working correctly, you should see:

```
Connected to MongoDB
Server running on port 3000
```

## Step 8: Set Up PM2 for Production Deployment

PM2 is a process manager for Node.js applications that helps keep your app running.

```bash
# Install PM2 globally
sudo npm install -g pm2

# Start the application with PM2
pm2 start server.js --name youtube-mp3-downloader

# Configure PM2 to start on system boot
pm2 startup
# Run the command PM2 provides

# Save the PM2 configuration
pm2 save
```

## Step 9: Set Up Nginx as a Reverse Proxy (Optional but Recommended)

```bash
# Install Nginx
sudo apt install -y nginx

sudo mkdir -p /var/www/assets/downloads
sudo mkdir -p /var/www/assets/images
sudo chown -R www-data:www-data /var/www/assets
sudo chmod -R 755 /var/www/assets


# Configure Nginx
sudo nano /etc/nginx/sites-available/ezplay.tclsoftwarehouse.com
```

```nginx
server {
    listen 80;
    server_name ezplay.tclsoftwarehouse.com www.ezplay.tclsoftwarehouse.com;

    # -------------------------------------------------
    # Static MP3 downloads
    # -------------------------------------------------
    location /downloads/ {
        root /var/www/assets;         
        sendfile on;
        tcp_nopush on;
        add_header Content-Disposition "attachment";
        add_header Accept-Ranges bytes;
        add_header Cache-Control "public, max-age=86400";
        try_files $uri =404;
    }

    # -------------------------------------------------
    # Static images
    # -------------------------------------------------
    location /images/ {
        root /var/www/assets;         
        sendfile on;
        try_files $uri =404;
    }

    # -------------------------------------------------
    # App API (Node.js on port 3000)
    # -------------------------------------------------
    location / {
        proxy_pass         http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header   Host              $host;
        proxy_set_header   X-Real-IP         $remote_addr;
        proxy_set_header   X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;
    }

    # Basic hardening / limits (tweak as needed)
    client_max_body_size 20m;
    server_tokens off;
}

```

Enable the site and restart Nginx:

```bash
sudo ln -s /etc/nginx/sites-available/ezplay.tclsoftwarehouse.com /etc/nginx/sites-enabled/
sudo nginx -t 
sudo systemctl restart nginx
```

## Step 10: Set Up SSL with Let's Encrypt (Optional but Recommended)

```bash
# Install Certbot
sudo apt install -y certbot python3-certbot-nginx

# Obtain and install SSL certificate
sudo certbot --nginx -d ezplay.tclsoftwarehouse.com -d www.ezplay.tclsoftwarehouse.com

# Optional: confirm timer was installed
sudo systemctl list-timers | grep certbot

# Optional: run a dry-run renewal test
sudo certbot renew --dry-run

# just confirm the set up work 
sudo certbot renew --dry-run


# Follow the prompts to complete the setup
```

## Step 11: Set Up Firewall (Optional but Recommended)

```bash
# Allow SSH, HTTP, and HTTPS
sudo ufw allow ssh
sudo ufw allow http
sudo ufw allow https

# Enable the firewall
sudo ufw enable
```

## Troubleshooting

### Issue: Application crashes or doesn't start

- Check the logs: `pm2 logs youtube-mp3-downloader`
- Verify MongoDB is running: `sudo systemctl status mongod`
- Check if yt-dlp and ffmpeg are installed correctly: `which yt-dlp` and `which ffmpeg`

### Issue: Downloads fail

- Check if the downloads directory exists and has proper permissions: `sudo chmod -R 755 downloads`
- Verify yt-dlp is up to date: `sudo yt-dlp -U`

### Issue: Cannot connect to the application

- Check if the application is running: `pm2 status`
- Verify the firewall settings: `sudo ufw status`
- Check Nginx configuration: `sudo nginx -t`

## Maintenance

### Updating yt-dlp

YouTube frequently changes their site, so you'll need to update yt-dlp regularly:

```bash
sudo yt-dlp -U
```

### Updating the Application

```bash
cd youtube-mp3-downloader
git pull
npm install
pm2 restart youtube-mp3-downloader
```

## Security Considerations

1. **Rate Limiting**: Consider implementing rate limiting to prevent abuse.
2. **User Authentication**: For public servers, consider adding user authentication.
3. **Regular Updates**: Keep all system packages, Node.js, and yt-dlp updated.
4. **Monitoring**: Set up monitoring for your server to detect issues early.