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

## Step 3: Install MongoDB

```bash
# Import MongoDB public GPG key
curl -fsSL https://pgp.mongodb.com/server-6.0.asc | \
   sudo gpg -o /usr/share/keyrings/mongodb-server-6.0.gpg \
   --dearmor

# Create list file for MongoDB
echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-6.0.gpg ] https://repo.mongodb.org/apt/ubuntu focal/mongodb-org/6.0 multiverse" | \
   sudo tee /etc/apt/sources.list.d/mongodb-org-6.0.list

# Update package database
sudo apt update

# Install MongoDB
sudo apt install -y mongodb-org

# Start and enable MongoDB service
sudo systemctl start mongod
sudo systemctl enable mongod

# Verify MongoDB is running
sudo systemctl status mongod
```

## Step 4: Install yt-dlp and ffmpeg

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

## Step 5: Clone and Configure the Application

```bash
# Install Git if not already installed
sudo apt install -y git

# Clone the repository
git clone https://github.com/yourusername/youtube-mp3-downloader.git
cd youtube-mp3-downloader

# Install dependencies
npm install

# Create downloads directory if it doesn't exist
mkdir -p downloads
```

## Step 6: Update the Application Configuration

Edit the `routes/download.routes.js` file to specify the correct path to ffmpeg:

```bash
nano routes/download.routes.js
```

Find the lines with `--ffmpeg-location` and update them to:

```javascript
'--ffmpeg-location', '/usr/bin/ffmpeg', // Specify ffmpeg location
```

## Step 7: Set Up Environment Variables

Create a `.env` file for environment variables:

```bash
nano .env
```

Add the following content (adjust as needed):

```
PORT=3000
MONGODB_URI=mongodb://localhost:27017/youtube-downloader
```

## Step 8: Test the Application

```bash
# Start the application
node server.js
```

If everything is working correctly, you should see:

```
Connected to MongoDB
Server running on port 3000
```

## Step 9: Set Up PM2 for Production Deployment

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

## Step 10: Set Up Nginx as a Reverse Proxy (Optional but Recommended)

```bash
# Install Nginx
sudo apt install -y nginx

# Configure Nginx
sudo nano /etc/nginx/sites-available/youtube-mp3-downloader
```

Add the following configuration (replace `yourdomain.com` with your domain):

```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        
        # Increase timeouts for large file downloads
        proxy_read_timeout 300;
        proxy_connect_timeout 300;
        proxy_send_timeout 300;
    }

    # Configure larger file uploads
    client_max_body_size 50M;
}
```

Enable the site and restart Nginx:

```bash
sudo ln -s /etc/nginx/sites-available/youtube-mp3-downloader /etc/nginx/sites-enabled/
sudo nginx -t  # Test the configuration
sudo systemctl restart nginx
```

## Step 11: Set Up SSL with Let's Encrypt (Optional but Recommended)

```bash
# Install Certbot
sudo apt install -y certbot python3-certbot-nginx

# Obtain and install SSL certificate
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Follow the prompts to complete the setup
```

## Step 12: Set Up Firewall (Optional but Recommended)

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

### Backing Up MongoDB

```bash
# Create a backup directory
mkdir -p ~/mongodb-backups

# Backup the database
mongodump --db youtube-downloader --out ~/mongodb-backups/$(date +"%Y-%m-%d")
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

## Legal Considerations

Be aware that downloading content from YouTube may violate their Terms of Service in some cases. This tool should only be used for downloading content that you have the right to download, such as content under Creative Commons licenses or your own content.
