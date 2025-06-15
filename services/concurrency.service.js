/**
 * Simple concurrency tracker for download operations
 */

// Track active downloads
let activeDownloads = 0;
const MAX_CONCURRENT_DOWNLOADS = 100;

// Increment active downloads count
const incrementActiveDownloads = () => {
  activeDownloads++;
  return activeDownloads;
};

// Decrement active downloads count
const decrementActiveDownloads = () => {
  if (activeDownloads > 0) {
    activeDownloads--;
  }
  return activeDownloads;
};

// Check if server can accept more downloads
const canAcceptDownload = () => {
  return activeDownloads < MAX_CONCURRENT_DOWNLOADS;
};

// Get current active downloads count
const getActiveDownloads = () => {
  return activeDownloads;
};

module.exports = {
  incrementActiveDownloads,
  decrementActiveDownloads,
  canAcceptDownload,
  getActiveDownloads,
  MAX_CONCURRENT_DOWNLOADS
};
