document.addEventListener('DOMContentLoaded', () => {
  // DOM Elements
  const youtubeUrlInput = document.getElementById('youtube-url');
  const downloadBtn = document.getElementById('download-btn');
  const errorMessage = document.getElementById('error-message');
  const loader = document.getElementById('loader');
  const result = document.getElementById('result');
  const videoTitle = document.getElementById('video-title');
  const downloadLink = document.getElementById('download-link');
  const newDownloadBtn = document.getElementById('new-download-btn');

  // YouTube URL validation regex
  const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.?be)\/.+$/;

  // Event Listeners
  downloadBtn.addEventListener('click', handleDownload);
  newDownloadBtn.addEventListener('click', resetForm);
  youtubeUrlInput.addEventListener('input', () => {
    errorMessage.textContent = '';
  });

  // Handle download button click
  async function handleDownload() {
    const url = youtubeUrlInput.value.trim();
    
    // Validate input
    if (!url) {
      showError('Please enter a YouTube URL');
      return;
    }
    
    if (!youtubeRegex.test(url)) {
      showError('Please enter a valid YouTube URL');
      return;
    }
    
    // Show loader
    errorMessage.textContent = '';
    document.querySelector('.download-card').style.display = 'none';
    loader.style.display = 'flex';
    result.style.display = 'none';    
    try {
      // Send request to server
      const response = await fetch('/api/download', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ url })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Download failed');
      }
      
      // Show result
      videoTitle.textContent = data.title;
      downloadLink.href = data.downloadUrl;
      downloadLink.download = `${data.title}.mp3`;
      
      // Hide loader and show result
      loader.style.display = 'none';
      result.style.display = 'block';
      
    } catch (error) {
      // Hide loader and show error
      loader.style.display = 'none';
      document.querySelector('.download-card').style.display = 'block';
      showError(error.message || 'An error occurred');
    }
  }
  
  // Show error message
  function showError(message) {
    errorMessage.textContent = message;
    errorMessage.style.display = 'block';
  }
  
  // Reset form for new download
  function resetForm() {
    youtubeUrlInput.value = '';
    errorMessage.textContent = '';
    result.style.display = 'none';
    document.querySelector('.download-card').style.display = 'block';
    youtubeUrlInput.focus();
  }
});
