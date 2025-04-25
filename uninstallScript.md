# Uninstall Guide for YouTube MP3 Downloader Dependencies

This guide provides step-by-step instructions for uninstalling the dependencies (yt-dlp and ffmpeg) that were installed for the YouTube MP3 Downloader application.

## Uninstalling on macOS

### 1. Check Package Sizes (Optional)

Before uninstalling, you can check how much space these packages are using:

```bash
# Check the size of yt-dlp
du -sh /opt/homebrew/Cellar/yt-dlp

# Check the size of ffmpeg
du -sh /opt/homebrew/Cellar/ffmpeg
```

### 2. Uninstall yt-dlp

```bash
# Uninstall yt-dlp using Homebrew
brew uninstall yt-dlp
```

### 3. Uninstall ffmpeg

```bash
# Uninstall ffmpeg using Homebrew
brew uninstall ffmpeg
```

### 4. Clean Up Homebrew (Optional)

```bash
# Remove old versions of packages
brew cleanup
```

## Uninstalling on Ubuntu/Linux

If you've deployed to a Linux server and want to uninstall there:

### 1. Uninstall yt-dlp

```bash
# Remove the yt-dlp binary
sudo rm /usr/local/bin/yt-dlp
```

### 2. Uninstall ffmpeg

```bash
# Uninstall ffmpeg using apt
sudo apt remove --purge ffmpeg
sudo apt autoremove
```

### 3. Uninstall MongoDB (if needed)

```bash
# Stop MongoDB service
sudo systemctl stop mongod

# Uninstall MongoDB packages
sudo apt remove --purge mongodb-org*

# Remove data directories
sudo rm -r /var/log/mongodb
sudo rm -r /var/lib/mongodb
```

### 4. Uninstall Node.js (if needed)

```bash
# Uninstall Node.js and npm
sudo apt remove --purge nodejs npm
sudo apt autoremove
```

## Cleaning Up Your Project

If you want to completely remove the project and its dependencies:

```bash
# Remove node_modules directory
rm -rf /Users/me/CascadeProjects/youtube-mp3-downloader/node_modules

# Remove downloads directory
rm -rf /Users/me/CascadeProjects/youtube-mp3-downloader/downloads

# Remove the entire project (optional)
# cd ..
# rm -rf youtube-mp3-downloader
```

## Verifying Uninstallation

### On macOS

```bash
# Verify yt-dlp is uninstalled
which yt-dlp

# Verify ffmpeg is uninstalled
which ffmpeg
```

If these commands return nothing, the packages have been successfully uninstalled.

### On Ubuntu/Linux

```bash
# Verify yt-dlp is uninstalled
which yt-dlp

# Verify ffmpeg is uninstalled
which ffmpeg

# Verify MongoDB is uninstalled
systemctl status mongod
```

## Note

Uninstalling these packages will not affect other applications unless they also depend on ffmpeg or yt-dlp. If you're unsure, you can keep ffmpeg installed as it's a common dependency for many multimedia applications.
