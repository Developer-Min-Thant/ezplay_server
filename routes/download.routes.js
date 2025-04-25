const express = require('express');
const router = express.Router();
const YTDlpWrap = require('yt-dlp-wrap').default;
const ffmpeg = require('fluent-ffmpeg');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');
const NodeID3 = require('node-id3');
const User = require('../models/user.model');
const { protect, checkDownloadEligibility } = require('../middleware/auth');

// Get downloads directory path
const downloadsDir = path.join(__dirname, '..', 'downloads');

// Ensure downloads directory exists
if (!fs.existsSync(downloadsDir)) {
  fs.mkdirSync(downloadsDir, { recursive: true });
}

// YouTube URL validation regex (more permissive to allow various YouTube URL formats)
const youtubeRegex = /^(https?:\/\/)?(www\.|m\.)?(youtube\.com|youtu\.?be)\/.+/;

// Initialize yt-dlp with the system-installed binary
// const ytDlp = new YTDlpWrap('/opt/homebrew/bin/yt-dlp');
const ytDlp= new YTDlpWrap("/usr/local/bin/yt-dlp");

// Check if yt-dlp is available
ytDlp.getVersion()
  .then(version => console.log('yt-dlp version:', version))
  .catch(err => console.error('Error with yt-dlp:', err));

// Download MP3 route
router.post('/', protect, checkDownloadEligibility, async (req, res) => {
  const { url } = req.body;

  // update the user totalDownloads
  const user = await User.findOne({ phone: req.user.phone });
  user.totalDownloads += 1;
  await user.save();

  if (!url) {
    return res.status(400).json({ error: 'URL is required' });
  }

  console.log('Received download request for URL:', url);

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

  try {
    const id = uuidv4();
    const tempMp3Path = path.join(downloadsDir, `${id}_temp.mp3`);
    const finalMp3Path = path.join(downloadsDir, `${id}.mp3`);
    
    // Get video info using yt-dlp
    try {
      console.log('Getting video info with yt-dlp...');
      
      // First, get video metadata
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
      
      // Download audio with yt-dlp directly to MP3
      const downloadArgs = [
        '--extract-audio',
        '--audio-format', 'mp3',
        '--audio-quality', '0', // Best quality
        '--output', tempMp3Path,
        '--no-playlist',
        '--no-warnings',
        '--ffmpeg-location', '/opt/homebrew/bin/ffmpeg', // Specify ffmpeg location
        url
      ];
      
      console.log('Starting download with yt-dlp...');
      
      // Execute yt-dlp to download and convert to MP3
      await ytDlp.execPromise(downloadArgs);
      
      console.log('Download completed, adding ID3 tags...');
      
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
        
        console.log(`Downloaded and converted: ${title}`);
        
        // Send success response
        sendResponse(200, {
          success: true,
          title: title,
          downloadUrl: `/downloads/${id}.mp3`,
          fileName: `${title}.mp3`,
        });
      } catch (tagError) {
        console.error('Error adding ID3 tags:', tagError);
        // Continue even if tagging fails, just rename the file
        if (fs.existsSync(tempMp3Path)) {
          fs.renameSync(tempMp3Path, finalMp3Path);
        }
        
        sendResponse(200, {
          success: true,
          title: title,
          downloadUrl: `/downloads/${id}.mp3`,
          fileName: `${title}.mp3`,
        });
      }
    } catch (ytdlpError) {
      console.error('yt-dlp error:', ytdlpError);
      
      // Clean up any partial files
      if (fs.existsSync(tempMp3Path)) {
        fs.unlinkSync(tempMp3Path);
      }
      if (fs.existsSync(finalMp3Path)) {
        fs.unlinkSync(finalMp3Path);
      }
      
      sendResponse(500, { error: 'Download failed. YouTube may be blocking this request. Please try again later.' });
    }
  } catch (error) {
    console.error('Unexpected error:', error);
    sendResponse(500, { error: 'An unexpected error occurred. Please try again.' });
  }
});


// Get MP3 size route
router.get('/mp3-size', protect, async (req, res) => {
  const videoUrl = req.query.videoId;
  
  // Flag to track if response has been sent
  let responseSent = false;
  
  // Function to safely send response
  const sendResponse = (status, data) => {
    if (!responseSent) {
      responseSent = true;
      res.status(status).json(data);
    }
  };

  try {
    // Use yt-dlp to get file size estimation
    const sizeArgs = [
      '--print', 'filesize_approx',
      '--no-playlist',
      '--extract-audio',
      '--audio-format', 'mp3',
      '--ffmpeg-location', '/opt/homebrew/bin/ffmpeg', // Specify ffmpeg location
      videoUrl
    ];
    
    const result = await ytDlp.execPromise(sizeArgs);
    const sizeInBytes = parseInt(result.trim(), 10);
    
    if (isNaN(sizeInBytes)) {
      sendResponse(200, { size: 'Unknown size' });
    } else {
      const sizeInMB = (sizeInBytes / (1024 * 1024)).toFixed(1);
      sendResponse(200, { size: `${sizeInMB} MB` });
    }
  } catch (error) {
    console.error('Error getting file size:', error);
    sendResponse(500, { error: 'Could not determine file size' });
  }
});

module.exports = router;