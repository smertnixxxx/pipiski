const API_KEY = 'e412304ff231042fed642e329cc11794dd9ec7b61ee15c9b1c03c73f825c3223733d71fb893359b6fff9940b0bfdb18d871b92b8b351a1b2e39eb0e86f0a23bd';
const USER_ID = '5692559';
const API_URL = `https://api.rule34.xxx/index.php?page=dapi&s=post&q=index&json=1&api_key=${API_KEY}&user_id=${USER_ID}`;

const searchInput = document.getElementById('searchInput');
const searchBtn = document.getElementById('searchBtn');
const luckyBtn = document.getElementById('luckyBtn');
const imageGrid = document.getElementById('imageGrid');
const loader = document.getElementById('loader');
const modal = document.getElementById('modal');
const modalImg = document.getElementById('modalImg');
const modalTags = document.getElementById('modalTags');
const downloadBtn = document.getElementById('downloadBtn');
const closeModal = document.querySelector('.close-modal');

// New Modal Video Element (will be injected)
let modalVideo = null;

let currentPage = 0;
let currentTags = '';
let isLoading = false;

// Event Listeners
searchBtn.addEventListener('click', () => performSearch());
luckyBtn.addEventListener('click', () => fetchRandomPost());
searchInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') performSearch();
});

closeModal.addEventListener('click', () => closePreview());

window.addEventListener('click', (e) => {
    if (e.target === modal) closePreview();
});

// Main Search Function
async function performSearch() {
    currentTags = searchInput.value.trim().toLowerCase();
    currentPage = 0;
    imageGrid.innerHTML = '';
    fetchImages();
}

async function fetchImages() {
    if (isLoading) return;
    isLoading = true;
    loader.classList.remove('hidden');

    try {
        const url = `${API_URL}&tags=${encodeURIComponent(currentTags)}&pid=${currentPage}&limit=50`;
        const response = await fetch(url);

        if (!response.ok) throw new Error('API request failed');

        const data = await response.json();
        renderImages(data);
        currentPage++;
    } catch (error) {
        console.error('Error fetching images:', error);
        showErrorMessage('Something went wrong. Please check your CORS configuration or proxy.');
    } finally {
        isLoading = false;
        loader.classList.add('hidden');
    }
}

async function fetchRandomPost() {
    if (isLoading) return;
    isLoading = true;
    loader.classList.remove('hidden');

    try {
        // Rule34 API doesn't have a direct random param that works perfectly with tags in JSON,
        // so we pick a random page (0-500) and take a random post from that page.
        const randomPage = Math.floor(Math.random() * 500);
        const tags = searchInput.value.trim().toLowerCase();
        const url = `${API_URL}&tags=${encodeURIComponent(tags)}&pid=${randomPage}&limit=10`;

        const response = await fetch(url);
        if (!response.ok) throw new Error('API request failed');

        const data = await response.json();
        if (data && data.length > 0) {
            const randomIndex = Math.floor(Math.random() * data.length);
            openPreview(data[randomIndex]);
        } else {
            showErrorMessage('Could not find a lucky post with those tags.');
        }
    } catch (error) {
        console.error('Error fetching lucky post:', error);
        showErrorMessage('Luck is not on your side today. Try again later.');
    } finally {
        isLoading = false;
        loader.classList.add('hidden');
    }
}

function renderImages(posts) {
    if (!posts || posts.length === 0) {
        if (currentPage === 0) {
            imageGrid.innerHTML = '<div class="welcome-container"><h1>No Results Found</h1><p>Try different tags.</p></div>';
        }
        return;
    }

    posts.forEach(post => {
        const card = document.createElement('div');
        card.className = 'post-card';

        const isVideo = post.file_url.endsWith('.mp4') || post.file_url.endsWith('.webm');
        const isGif = post.file_url.endsWith('.gif');

        // Priority for better quality: sample_url (medium), file_url (original)
        const thumbUrl = post.preview_url || post.sample_url || post.file_url;

        let mediaHtml = '';
        if (isVideo) {
            mediaHtml = `
                <video src="${post.file_url}" muted loop playsinline onmouseover="this.play()" onmouseout="this.pause()"></video>
                <div class="media-badge badge-video">Video</div>
            `;
        } else if (isGif) {
            mediaHtml = `
                <img src="${post.file_url}" alt="GIF" loading="lazy">
                <div class="media-badge badge-gif">GIF</div>
            `;
        } else {
            mediaHtml = `<img src="${thumbUrl}" alt="Post" loading="lazy">`;
        }

        card.innerHTML = mediaHtml;
        card.addEventListener('click', () => openPreview(post));
        imageGrid.appendChild(card);
    });
}

function openPreview(post) {
    const isVideo = post.file_url.endsWith('.mp4') || post.file_url.endsWith('.webm');

    // Clear previous media
    modalImg.classList.add('hidden');
    if (modalVideo) modalVideo.remove();

    if (isVideo) {
        modalVideo = document.createElement('video');
        modalVideo.src = post.file_url;
        modalVideo.controls = true;
        modalVideo.autoplay = true;
        modalVideo.id = 'modalVideo';
        document.querySelector('.modal-content').prepend(modalVideo);
    } else {
        modalImg.src = post.file_url;
        modalImg.classList.remove('hidden');
    }

    downloadBtn.href = post.file_url;
    modalTags.innerHTML = post.tags.split(' ').map(tag => `<span class="tag">${tag}</span>`).join('');

    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
}

function closePreview() {
    modal.classList.add('hidden');
    document.body.style.overflow = 'auto';
    if (modalVideo) {
        modalVideo.pause();
        modalVideo.remove();
        modalVideo = null;
    }
}

function showErrorMessage(msg) {
    imageGrid.innerHTML = `
        <div class="welcome-message">
            <h1>Oops!</h1>
            <p>${msg}</p>
            <p><small>Note: Rule34 API often requires CORS authorization or a proxy.</small></p>
        </div>
    `;
}

// Infinite Scroll
window.addEventListener('scroll', () => {
    if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 500) {
        if (!isLoading && currentTags !== '') {
            fetchImages();
        }
    }
});
