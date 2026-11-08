
let db;

const request = indexedDB.open("MyOTTDatabase", 1);

request.onupgradeneeded = function(event) {
    db = event.target.result;

    if (!db.objectStoreNames.contains("movies")) {
        db.createObjectStore("movies", {
            keyPath: "id",
            autoIncrement: true
        });
    }
};

request.onsuccess = function(event) {
    db = event.target.result;
    renderMovies();
};

request.onerror = function() {
    alert("Database error.");
};

// Homepage
function showHome() {
    document.getElementById("upload").style.display = "none";
    document.getElementById("player").style.display = "none";
    document.getElementById("home").style.display = "block";
    document.getElementById("library").style.display = "block";
    renderMovies();
}

// Upload page
function showUpload() {
    document.getElementById("home").style.display = "none";
    document.getElementById("library").style.display = "none";
    document.getElementById("player").style.display = "none";
    document.getElementById("upload").style.display = "block";
    window.scrollTo(0, 0);
}

// Upload content
document.getElementById("uploadForm").addEventListener("submit", function(e) {
    e.preventDefault();

    const posterFile = document.getElementById("poster").files[0];
    const videoFile = document.getElementById("video").files[0];

    if (!posterFile || !videoFile) {
        alert("Select poster and video.");
        return;
    }

    if (!posterFile.type.startsWith("image/") ||
        !videoFile.type.startsWith("video/")) {
        alert("Invalid file format.");
        return;
    }

    const movie = {
        title: document.getElementById("title").value,
        type: document.getElementById("type").value,
        genre: document.getElementById("genre").value,
        year: document.getElementById("year").value,
        language: document.getElementById("language").value,
        description: document.getElementById("description").value,
        poster: posterFile,
        video: videoFile,
        date: new Date().toISOString()
    };

    const status = document.getElementById("status");
    const uploadBtn = document.getElementById("uploadBtn");

    status.textContent = "Uploading...";
    uploadBtn.disabled = true;

    const transaction = db.transaction(["movies"], "readwrite");

    transaction.objectStore("movies").add(movie);

    transaction.oncomplete = function() {
        status.textContent = "Successfully uploaded!";
        uploadBtn.disabled = false;
        document.getElementById("uploadForm").reset();

        setTimeout(showHome, 800);
    };

    transaction.onerror = function() {
        status.textContent = "Storage error. Try a smaller video.";
        uploadBtn.disabled = false;
    };
});

// Display movies
function renderMovies() {
    if (!db) return;

    const container = document.getElementById("movies");
    const search = document.getElementById("search").value.toLowerCase();

    container.innerHTML = "";

    const transaction = db.transaction(["movies"], "readonly");

    transaction.objectStore("movies").getAll().onsuccess = function(event) {
        const movies = event.target.result;

        const filtered = movies.filter(movie =>
            movie.title.toLowerCase().includes(search) ||
            movie.genre.toLowerCase().includes(search) ||
            movie.type.toLowerCase().includes(search)
        );

        if (!filtered.length) {
            container.textContent = "No movies found.";
            return;
        }

        filtered.reverse().forEach(movie => {
            const card = document.createElement("div");
            card.className = "movie";

            const img = document.createElement("img");
            img.src = URL.createObjectURL(movie.poster);

            const info = document.createElement("div");
            info.className = "movie-info";

            const title = document.createElement("h3");
            title.textContent = movie.title;

            const details = document.createElement("p");
            details.textContent =
                movie.type + " | " + movie.genre + " | " +
                movie.year + " | " + movie.language;

            const play = document.createElement("button");
            play.className = "btn";
            play.textContent = "▶ Watch";
            play.onclick = () => playMovie(movie.id);

            const remove = document.createElement("button");
            remove.className = "btn";
            remove.style.background = "#444";
            remove.textContent = "Delete";
            remove.onclick = () => deleteMovie(movie.id);

            info.append(title, details, play, remove);
            card.append(img, info);
            container.appendChild(card);
        });
    };
}

// Play movie
function playMovie(id) {
    const transaction = db.transaction(["movies"], "readonly");

    transaction.objectStore("movies").get(id).onsuccess = function(event) {
        const movie = event.target.result;
        if (!movie) return;

        const player = document.getElementById("videoPlayer");

        player.pause();

        if (player.dataset.url) {
            URL.revokeObjectURL(player.dataset.url);
        }

        const url = URL.createObjectURL(movie.video);

        player.src = url;
        player.dataset.url = url;

        document.getElementById("playerTitle").textContent = movie.title;
        document.getElementById("playerDescription").textContent =
            movie.description;

        document.getElementById("home").style.display = "none";
        document.getElementById("library").style.display = "none";
        document.getElementById("upload").style.display = "none";
        document.getElementById("player").style.display = "block";

        window.scrollTo(0, 0);
        player.play().catch(() => {});
    };
}

// Close player
function closePlayer() {
    const player = document.getElementById("videoPlayer");

    player.pause();
    player.removeAttribute("src");
    player.load();

    if (player.dataset.url) {
        URL.revokeObjectURL(player.dataset.url);
        delete player.dataset.url;
    }

    showHome();
}

// Delete content
function deleteMovie(id) {
    if (!confirm("Delete this movie?")) return;

    const transaction = db.transaction(["movies"], "readwrite");

    transaction.objectStore("movies").delete(id);

    transaction.oncomplete = renderMovies;
}
