const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const YTDlpWrap = require('yt-dlp-wrap').default;
const NodeID3 = require('node-id3');
const { protect, checkDownloadEligibility } = require('../middleware/auth');
const { incrementActiveDownloads, decrementActiveDownloads, canAcceptDownload, getActiveDownloads, MAX_CONCURRENT_DOWNLOADS } = require('../services/concurrency.service');

// Get ffmpeg location from environment variable or use default
const FFMPEG_LOCATION = process.env.FFMPEG_LOCATION || '/usr/bin/ffmpeg';

// Get downloads directory path
const DOWNLOAD_LOCATION = process.env.DOWNLOAD_LOCATION || '/var/www/assets';
const downloadsDir = path.join(DOWNLOAD_LOCATION, 'downloads');

// Ensure downloads directory exists
if (!fs.existsSync(downloadsDir)) {
  fs.mkdirSync(downloadsDir, { recursive: true });
}

// YouTube URL validation regex (more permissive to allow various YouTube URL formats)
const youtubeRegex = /^(https?:\/\/)?(www\.|m\.)?(youtube\.com|youtu\.?be)\/.+/;

// Initialize yt-dlp with the system-installed binary
const YTDLP_LOCATION = process.env.YTDLP_LOCATION || '/usr/local/bin/yt-dlp';
const ytDlp = new YTDlpWrap(YTDLP_LOCATION);

// Check if yt-dlp is available
ytDlp.getVersion()
  .then(version => console.log('yt-dlp version:', version))
  .catch(err => console.error('Error with yt-dlp:', err));

// Get active downloads status route
router.get('/active-downloads', protect, (req, res) => {
  if(req.user.isAdmin){
    res.status(200).json({
      success: true,
      activeDownloads: getActiveDownloads(),
      maxConcurrent: MAX_CONCURRENT_DOWNLOADS
    });
  }
  res.status(404).json({
    success: false,
    message: 'You are not authorized to access this route'
  });
});

// Download MP3 route
router.post('/', checkDownloadEligibility, async (req, res) => {
  const { url } = req.body;

  if (!url) {
    return res.status(400).json({ error: 'URL is required' });
  }

  // More permissive YouTube URL validation
  if (!youtubeRegex.test(url)) {
    return res.status(400).json({ error: 'Invalid YouTube URL' });
  }

  // Flag to track if response has been sent
  let responseSent = false;
  
  // Function to safely send response
  const sendResponse = (status, data) => {
    if (!responseSent) {
      responseSent = true;
      res.status(status).json(data);
    }
  };
  
  // Check if server can accept more downloads
  if (!canAcceptDownload()) {
    return res.status(429).json({
      success: false,
      message: 'Server is currently busy processing other downloads. Please try again later.',
      activeDownloads: getActiveDownloads(),
      maxConcurrent: MAX_CONCURRENT_DOWNLOADS
    });
  }
  
  // Increment active downloads counter
  incrementActiveDownloads();

  try {
    const id = uuidv4();
    const tempMp3Path = path.join(downloadsDir, `${id}_temp.mp3`);
    const finalMp3Path = path.join(downloadsDir, `${id}.mp3`);
    
    // First, get video metadata outside the queue
    console.log('Getting video info with yt-dlp...');
    const videoInfoArgs = [
      '--dump-json',
      '--no-playlist',
      url
    ];
    
    const videoInfoResult = await ytDlp.execPromise(videoInfoArgs);
    const videoInfo = JSON.parse(videoInfoResult);
    
    // Sanitize title for filename
    const title = (videoInfo.title || 'unknown');
    
    console.log(`Found video: ${videoInfo.title}`);
    
   
    
    // Set response as sent since we've already responded to the client
    responseSent = true;
    
    // Process download (not in a queue)
    try {
      try {
        // '--ffmpeg-location', '/opt/homebrew/bin/ffmpeg', //for my local mac

        // Download audio with yt-dlp directly to MP3
        const downloadArgs = [
          '--extract-audio',
          '--audio-format', 'mp3',
          '--audio-quality', '0', // Best quality
          '--output', tempMp3Path,
          '--no-playlist',
          '--no-warnings',
          '--ffmpeg-location', FFMPEG_LOCATION,
          url
        ];
        
        console.log(`Starting download with yt-dlp for ${id}...`);
        
        // Execute yt-dlp to download and convert to MP3
        await ytDlp.execPromise(downloadArgs);
      
        console.log(`Download completed for ${id}, adding ID3 tags...`);
        

        // Add ID3 tags
        try {
          const tags = {
            title: videoInfo.title || 'Unknown',
            artist: videoInfo.uploader || 'Unknown',
            album: 'YouTube',
            year: new Date().getFullYear().toString(),
          };
          
          // Rename the file to final path
          fs.renameSync(tempMp3Path, finalMp3Path);
          
          // Write ID3 tags
          NodeID3.write(tags, finalMp3Path);
          
          console.log(`Downloaded and converted: ${title} (ID: ${id})`);
          
          // No need to send response here as we've already responded to the client
        } catch (tagError) {
          console.error(`Error adding ID3 tags for ${id}:`, tagError);
          // Continue even if tagging fails, just rename the file
          if (fs.existsSync(tempMp3Path)) {
            fs.renameSync(tempMp3Path, finalMp3Path);
          }
        }
        
      } catch (ytdlpError) {
        console.error(`yt-dlp error for ${id}:`, ytdlpError);
        
        // Clean up any partial files
        if (fs.existsSync(tempMp3Path)) {
          fs.unlinkSync(tempMp3Path);
        }
        if (fs.existsSync(finalMp3Path)) {
          fs.unlinkSync(finalMp3Path);
        }
        
        throw new Error('Download failed. YouTube may be blocking this request.');
      }
    } finally {
      // Always decrement active downloads counter, even if there was an error
      decrementActiveDownloads();
    }

    // Send initial response to client that download is starting
    res.status(200).json({
      success: true,
      message: 'Download is completed',
      title: title,
      id: id,
      downloadUrl: `/downloads/${id}.mp3`,
      fileName: `${title}.mp3`
    });
    
  } catch (error) {
    console.error('Unexpected error in download route:', error);
    // If we haven't sent a response yet, send an error response
    sendResponse(500, { error: 'An unexpected error occurred. Please try again.' });
  }
});

// Get MP3 size route
router.get('/mp3-size', protect, async (req, res) => {
  const videoUrl = req.query.videoId;

  if (!videoUrl || !youtubeRegex.test(videoUrl)) {
    return res.status(400).json({ error: 'Invalid or missing YouTube URL' });
  }

  let responseSent = false;
  const sendResponse = (status, data) => {
    if (!responseSent) {
      responseSent = true;
      res.status(status).json(data);
    }
  };

  try {
    const args = [
      '--print', '%(title)s\n%(uploader)s\n%filesize_approx',
      '--no-playlist',
      '--format', 'bestaudio',
      videoUrl
    ];

    const result = await ytDlp.execPromise(args);
    const lines = result.trim().split('\n');
    
    // Extract title, artist, and size from the result
    const title = lines[0] || 'Unknown title';
    const uploader = lines[1] || 'Unknown artist';
    const sizeRaw = lines[2] || '0';
    
    // Try to extract artist from title (common format: "Artist - Song Name")
    let artist = uploader;
    if (title.includes(' - ')) {
      const parts = title.split(' - ');
      if (parts.length >= 2) {
        artist = parts[0].trim();
      }
    }
    
    const sizeInBytes = parseInt(sizeRaw.trim(), 10);
    const sizeFormatted = !isNaN(sizeInBytes)
      ? `${(sizeInBytes / (1024 * 1024)).toFixed(1)} MB`
      : '4.5 MB';
    sendResponse(200, {
      artist,
      size: sizeFormatted
    });
  } catch (error) {
    console.error('Metadata fetch error:', error);
    sendResponse(500, { error: 'Failed to fetch metadata' });
  }
});

// Stream YouTube content directly to client without saving to disk
router.get('/stream-one', checkDownloadEligibility, async (req, res) => {
  const videoUrl = req.query.url;
  if (!videoUrl || !youtubeRegex.test(videoUrl)) {
    return res.status(400).json({ error: 'Invalid or missing YouTube URL' });
  }

  try {
    // Check if server can accept more downloads
    if (!canAcceptDownload()) {
      return res.status(429).json({
        success: false,
        message: 'Server is currently busy processing other downloads. Please try again later.',
        activeDownloads: getActiveDownloads(),
        maxConcurrent: MAX_CONCURRENT_DOWNLOADS
      });
    }
    
    // Increment active downloads counter
    incrementActiveDownloads();

    // Set headers for streaming
    res.setHeader('Content-Type', 'audio/mp4');
    res.setHeader('Content-Disposition', `attachment; filename="youtube_audio.m4a"`);
    
    // Use child_process directly for better control
    const { spawn } = require('child_process');
    
    // Create the yt-dlp process with arguments to output to stdout
    const ytDlpProcess = spawn(YTDLP_LOCATION, [
      '--no-playlist',
      '--format', 'bestaudio[ext=m4a]/bestaudio',
      '--no-warnings',
      '-o', '-', // Output to stdout
      videoUrl
    ]);
    
    // Flag to track if we've sent headers
    let headersSent = false;
    
    // Pipe stdout directly to response
    ytDlpProcess.stdout.on('data', (data) => {
      // Only set flag after first data chunk is received
      headersSent = true;
      // Write data to response
      res.write(data);
    });
    
    // Handle stderr (for logging)
    ytDlpProcess.stderr.on('data', (data) => {
      console.error(`yt-dlp stderr: ${data.toString()}`);
    });
    
    // Handle process completion
    ytDlpProcess.on('close', (code) => {
      console.log(`yt-dlp process exited with code ${code}`);
      if (code === 0) {
        // Success - end the response
        res.end();
      } else if (!headersSent) {
        // Error before sending any data
        res.status(500).json({ error: 'Failed to stream content' });
      } else {
        // Error after sending some data - just end the response
        res.end();
      }
    });
    
    // Handle process errors
    ytDlpProcess.on('error', (error) => {
      console.error('yt-dlp process error:', error);
      if (!headersSent) {
        res.status(500).json({ error: 'Failed to start streaming process' });
      } else {
        res.end();
      }
    });
    
    // Handle client disconnect
    req.on('close', () => {
      console.log('Client disconnected, killing yt-dlp process');
      ytDlpProcess.kill();
    });
    
  } catch (error) {
    console.error('Error in stream setup:', error);
    res.status(500).json({ error: 'Failed to set up streaming' });
  } finally {
    decrementActiveDownloads();
  }
});

module.exports = router;