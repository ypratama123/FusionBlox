// Konstanta game
const COLS = 10;
const ROWS = 20;
const BLOCK_SIZE = 30;
const COLORS = [
    'cyan', 'blue', 'orange', 'yellow', 'green', 'purple', 'red'
];

// Konstanta untuk animasi
const FPS = 60;
const DROP_INTERVAL = 1000; // 1 detik
const SMOOTH_FACTOR = 0.1; // Faktor kehalusan animasi

// Variabel untuk audio
let backgroundMusic = null;
let isMusicInitialized = false;

// Variabel untuk animasi menu
let menuPieces = [];
let menuAnimationTime = 0;

// Fungsi untuk menginisialisasi audio
function initAudio() {
    if (!isMusicInitialized) {
        backgroundMusic = document.getElementById('backgroundMusic');
        if (backgroundMusic) {
            backgroundMusic.volume = 0.5; // Set volume ke 50%
            isMusicInitialized = true;
        }
    }
}

// Fungsi untuk memulai musik
function startBackgroundMusic() {
    if (backgroundMusic && !backgroundMusic.paused) return;
    
    if (backgroundMusic) {
        backgroundMusic.play().catch(e => {
            console.warn('Error playing background music:', e);
            // Tambahkan event listener untuk interaksi pengguna pertama
            document.addEventListener('click', function playOnFirstInteraction() {
                backgroundMusic.play().catch(e => console.warn('Error playing music on interaction:', e));
                document.removeEventListener('click', playOnFirstInteraction);
            }, { once: true });
        });
    }
}

// Fungsi untuk menghentikan musik
function stopBackgroundMusic() {
    if (backgroundMusic) {
        backgroundMusic.pause();
        backgroundMusic.currentTime = 0;
    }
}

// Inisialisasi audio saat dokumen dimuat
document.addEventListener('DOMContentLoaded', () => {
    initAudio();
    startBackgroundMusic();
    createMenuAnimation(); // Buat animasi menu saat halaman dimuat
});

// Bentuk blok (tetromino)
const SHAPES = [
    [[1, 1, 1, 1]], // I
    [[1, 1, 1], [0, 1, 0]], // T
    [[1, 1, 1], [1, 0, 0]], // L
    [[1, 1, 1], [0, 0, 1]], // J
    [[1, 1], [1, 1]], // O
    [[1, 1, 0], [0, 1, 1]], // Z
    [[0, 1, 1], [1, 1, 0]] // S
];

// Inisialisasi canvas
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Set ukuran canvas yang tepat
canvas.width = COLS * BLOCK_SIZE;
canvas.height = ROWS * BLOCK_SIZE;

// Variabel game
let board = Array(ROWS).fill().map(() => Array(COLS).fill(0));
let currentPiece = null;
let score = 0;
let level = 1;
let lastTime = 0;
let dropCounter = 0;
let isPaused = false;
let animationFrameId = null;
let gameState = 'menu'; // Tambahkan state game

// Dapatkan elemen HTML untuk menu dan area game
const startMenu = document.getElementById('startMenu');
const gameArea = document.getElementById('gameArea');
const startButton = document.getElementById('startButton');
const pauseButton = document.getElementById('pauseButton');
const exitButton = document.getElementById('exitButton');

// Fungsi untuk menggambar piece di canvas manapun
function drawPiece(piece, ctx, offsetX = 0, offsetY = 0) {
    piece.shape.forEach((row, y) => {
        row.forEach((value, x) => {
            if (value) {
                const blockX = (offsetX + x) * BLOCK_SIZE;
                const blockY = (offsetY + y) * BLOCK_SIZE;

                // Gambar batas blok
                ctx.fillStyle = 'rgba(0, 0, 0, 0.3)'; // Warna batas semi-transparan gelap
                ctx.fillRect(blockX, blockY, BLOCK_SIZE, BLOCK_SIZE);

                // Gambar bagian dalam blok
                ctx.fillStyle = piece.color;
                ctx.fillRect(
                    blockX + 1, // Offset 1px untuk batas
                    blockY + 1, // Offset 1px untuk batas
                    BLOCK_SIZE - 2, // Kurangi 2px untuk batas (1px kiri + 1px kanan)
                    BLOCK_SIZE - 2  // Kurangi 2px untuk batas (1px atas + 1px bawah)
                );
            }
        });
    });
}

// Fungsi untuk menggambar board
function drawBoard() {
    // Gambar background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Gambar grid
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 0.5;

    // Gambar garis vertikal
    for (let x = 0; x <= COLS; x++) {
        ctx.beginPath();
        ctx.moveTo(x * BLOCK_SIZE, 0);
        ctx.lineTo(x * BLOCK_SIZE, canvas.height);
        ctx.stroke();
    }

    // Gambar garis horizontal
    for (let y = 0; y <= ROWS; y++) {
        ctx.beginPath();
        ctx.moveTo(0, y * BLOCK_SIZE);
        ctx.lineTo(canvas.width, y * BLOCK_SIZE);
        ctx.stroke();
    }

    // Gambar blok yang sudah ada
    board.forEach((row, y) => {
        row.forEach((value, x) => {
            if (value) {
                const blockX = x * BLOCK_SIZE;
                const blockY = y * BLOCK_SIZE;

                // Gambar batas blok
                ctx.fillStyle = 'rgba(0, 0, 0, 0.3)'; // Warna batas semi-transparan gelap
                ctx.fillRect(blockX, blockY, BLOCK_SIZE, BLOCK_SIZE);

                // Gambar bagian dalam blok
                ctx.fillStyle = value;
                ctx.fillRect(
                    blockX + 1, // Offset 1px untuk batas
                    blockY + 1, // Offset 1px untuk batas
                    BLOCK_SIZE - 2, // Kurangi 2px untuk batas (1px kiri + 1px kanan)
                    BLOCK_SIZE - 2  // Kurangi 2px untuk batas (1px atas + 1px bawah)
                );
            }
        });
    });
}

// Fungsi untuk mengunci piece ke board
function lockPiece() {
    currentPiece.shape.forEach((row, y) => {
        row.forEach((value, x) => {
            if (value) {
                board[currentPiece.y + y][currentPiece.x + x] = currentPiece.color;
            }
        });
    });
}

// Fungsi untuk menghapus baris yang penuh
function clearLines() {
    let linesCleared = 0;
    for (let y = ROWS - 1; y >= 0; y--) {
        if (board[y].every(value => value)) {
            board.splice(y, 1);
            board.unshift(Array(COLS).fill(0));
            linesCleared++;
            y++;
        }
    }
    if (linesCleared > 0) {
        score += linesCleared * 100 * level;
        document.getElementById('score').textContent = score;
        if (score >= level * 1000) {
            level++;
            document.getElementById('level').textContent = level;
        }
    }
}

// Fungsi untuk membuat animasi menu
function createMenuAnimation() {
    menuPieces = [];
    // Buat beberapa piece untuk animasi menu
    for (let i = 0; i < 5; i++) {
        const randomIndex = Math.floor(Math.random() * SHAPES.length);
        const piece = new Piece(SHAPES[randomIndex], COLORS[randomIndex]);
        piece.x = Math.random() * (COLS - 2);
        piece.y = Math.random() * (ROWS - 4);
        piece.rotationSpeed = (Math.random() - 0.5) * 0.02; // Kecepatan rotasi acak
        piece.moveSpeed = (Math.random() - 0.5) * 0.5; // Kecepatan gerakan acak
        piece.rotation = 0; // Sudut rotasi saat ini
        menuPieces.push(piece);
    }
}

// Fungsi untuk menggambar menu
function drawMenu() {
    // Gambar background dengan efek gradient
    const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    gradient.addColorStop(0, '#1a1a2e');
    gradient.addColorStop(1, '#16213e');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Gambar grid dengan efek glow
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 0.5;
    for (let x = 0; x <= COLS; x++) {
        ctx.beginPath();
        ctx.moveTo(x * BLOCK_SIZE, 0);
        ctx.lineTo(x * BLOCK_SIZE, canvas.height);
        ctx.stroke();
    }
    for (let y = 0; y <= ROWS; y++) {
        ctx.beginPath();
        ctx.moveTo(0, y * BLOCK_SIZE);
        ctx.lineTo(canvas.width, y * BLOCK_SIZE);
        ctx.stroke();
    }

    // Gambar dan animasi piece di menu
    menuPieces.forEach(piece => {
        // Simpan state canvas
        ctx.save();
        
        // Pindahkan ke pusat piece
        const centerX = (piece.x + piece.shape[0].length / 2) * BLOCK_SIZE;
        const centerY = (piece.y + piece.shape.length / 2) * BLOCK_SIZE;
        ctx.translate(centerX, centerY);
        
        // Rotasi piece
        ctx.rotate(piece.rotation);
        
        // Kembali ke posisi awal
        ctx.translate(-centerX, -centerY);
        
        // Gambar piece dengan efek glow
        piece.shape.forEach((row, y) => {
            row.forEach((value, x) => {
                if (value) {
                    const blockX = (piece.x + x) * BLOCK_SIZE;
                    const blockY = (piece.y + y) * BLOCK_SIZE;

                    // Efek glow
                    ctx.shadowColor = piece.color;
                    ctx.shadowBlur = 10;
                    
                    // Gambar blok
                    ctx.fillStyle = piece.color;
                    ctx.fillRect(
                        blockX + 1,
                        blockY + 1,
                        BLOCK_SIZE - 2,
                        BLOCK_SIZE - 2
                    );
                }
            });
        });
        
        // Kembalikan state canvas
        ctx.restore();
    });
}

// Modifikasi fungsi update untuk menangani animasi menu
function update(time = 0) {
    if (gameState === 'menu') {
        // Update animasi menu
        menuAnimationTime += 0.016; // Sekitar 60 FPS
        
        // Update posisi dan rotasi piece
        menuPieces.forEach(piece => {
            piece.x += piece.moveSpeed;
            piece.rotation += piece.rotationSpeed;
            
            // Bounce dari tepi
            if (piece.x < 0 || piece.x > COLS - piece.shape[0].length) {
                piece.moveSpeed *= -1;
            }
            if (piece.y < 0 || piece.y > ROWS - piece.shape.length) {
                piece.y = Math.max(0, Math.min(ROWS - piece.shape.length, piece.y));
            }
        });

        // Gambar menu
        drawMenu();
    } else if (gameState === 'playing' && !isPaused) {
        const deltaTime = time - lastTime;
        lastTime = time;

        dropCounter += deltaTime;

        if (!currentPiece) {
            currentPiece = createPiece();
            if (currentPiece.checkCollisionWithBoard(currentPiece.x, currentPiece.y)) {
                // Game over
                alert('Game Over! Skor: ' + score);
                endGame(); // Kembali ke menu awal saat game over
                return; // Keluar dari fungsi update
            }
        }

        // Logika penurunan otomatis
        if (dropCounter > DROP_INTERVAL / level) {
            // Cek collision sebelum bergerak ke bawah
            if (!currentPiece.checkCollisionWithBoard(currentPiece.x, currentPiece.y + 1)) {
                // Gerakkan piece ke bawah jika tidak ada collision
                currentPiece.y += 1; // Langsung update posisi y
                currentPiece.targetY = currentPiece.y; // Pastikan targetY juga diupdate
            } else {
                // Jika ada collision saat mencoba bergerak ke bawah, kunci piece
                lockPiece();
                clearLines();
                currentPiece = null; 
            }
            dropCounter = 0;
        }
    }

    // Clear canvas dan gambar ulang terlepas dari state jeda atau state menu/gameover
    // Ini memastikan canvas selalu digambar di setiap frame.
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawBoard();
    // Gambar currentPiece hanya jika ada (saat state playing dan bukan null)
    if (currentPiece) {
        currentPiece.draw(); // Gunakan method draw yang sudah ada
    }

    // Lanjutkan loop animasi
    animationFrameId = requestAnimationFrame(update);
}

// Modifikasi fungsi startGame untuk membersihkan animasi menu
function startGame() {
    // Hentikan loop animasi jika masih berjalan
    if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
    }

    // Bersihkan animasi menu
    menuPieces = [];
    
    resetGame(); // Reset game state
    
    // Mulai transisi fade out menu awal
    startMenu.style.opacity = 0;
    
    // Pastikan musik dimulai saat game dimulai
    startBackgroundMusic();

    // Tunggu transisi selesai sebelum melanjutkan ke game
    setTimeout(() => {
        startMenu.style.display = 'none';
        gameArea.style.display = 'block';
        
        // Beri sedikit waktu agar display berubah sebelum memulai fade in
        setTimeout(() => {
            gameArea.style.opacity = 1; // Mulai transisi fade in area game

            gameState = 'playing';
            isPaused = false; // Pastikan tidak dijeda
            pauseButton.textContent = 'Jeda'; // Atur teks tombol jeda
            pauseButton.style.display = 'inline-block'; // Tampilkan tombol jeda
            exitButton.style.display = 'inline-block'; // Tampilkan tombol Keluar
            
            // Buat piece pertama segera saat game dimulai
            currentPiece = createPiece();

            lastTime = 0; // Reset lastTime untuk timing yang akurat
            // Mulai loop animasi game
            animationFrameId = requestAnimationFrame(update);
        }, 50); // Penundaan singkat untuk memungkinkan display berubah
    }, 500); // Durasi transisi fade out (sesuaikan dengan CSS)
}

// Fungsi untuk menghentikan game (kembali ke menu atau game over)
function endGame() {
    // Hentikan loop animasi game jika masih berjalan
    if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
    }

    // Hentikan musik background
    stopBackgroundMusic();

    // Mulai transisi fade out area game
    gameArea.style.opacity = 0;
    
    // Tunggu transisi selesai sebelum kembali ke menu
    setTimeout(() => {
        gameArea.style.display = 'none';
        startMenu.style.display = 'flex';

        // Beri sedikit waktu agar display berubah sebelum memulai fade in
        setTimeout(() => {
             startMenu.style.opacity = 1; // Mulai transisi fade in menu awal
        }, 50); // Penundaan singkat untuk memungkinkan display berubah

        gameState = 'menu'; // Kembali ke state menu
        
        // Pastikan loop animasi menu berjalan untuk menggambar apapun di menu jika perlu
         animationFrameId = requestAnimationFrame(update);
    }, 500); // Durasi transisi fade out (sesuaikan dengan CSS)
}

// Fungsi untuk reset game
function resetGame() {
    board = Array(ROWS).fill().map(() => Array(COLS).fill(0));
    score = 0;
    level = 1;
    document.getElementById('score').textContent = score;
    document.getElementById('level').textContent = level;
    currentPiece = null;
    dropCounter = 0;
    isPaused = false; // Pastikan tidak jeda saat reset
}

// Event listeners untuk kontrol
document.addEventListener('keydown', event => {
    if (gameState !== 'playing' || isPaused || !currentPiece) return; // Hanya aktif saat bermain dan tidak dijeda

    switch (event.key) {
        case 'ArrowLeft':
            currentPiece.move(-1, 0);
            break;
        case 'ArrowRight':
            currentPiece.move(1, 0);
            break;
        case 'ArrowDown':
            currentPiece.move(0, 1);
            break;
        case 'ArrowUp':
            const rotated = currentPiece.rotate();
            currentPiece.tryKick(rotated);
            break;
    }
});

// Event listeners untuk tombol
startButton.addEventListener('click', () => {
    startMenu.style.display = 'none';
    gameArea.style.display = 'block';
    startGame();
});

pauseButton.addEventListener('click', () => {
    if (gameState !== 'playing') return; // Hanya bisa jeda saat bermain

    isPaused = !isPaused;
    pauseButton.textContent = isPaused ? 'Lanjutkan' : 'Jeda';

    if (!isPaused) {
        // Jika melanjutkan, set lastTime agar deltaTime benar saat update berikutnya
        lastTime = performance.now();
        animationFrameId = requestAnimationFrame(update);
    } else {
        // Jika dijeda, hentikan loop animasi
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
    }
});

// Event listener untuk tombol Keluar
exitButton.addEventListener('click', () => {
    // Hentikan game dan kembali ke menu awal
    endGame();
});

// Inisialisasi: Atur state awal ke menu dan tampilkan menu awal tanpa animasi
gameState = 'menu';
startMenu.style.display = 'flex'; // Pastikan menu ditampilkan
startMenu.style.opacity = 1; // Pastikan menu terlihat penuh
gameArea.style.display = 'none'; // Pastikan area game tersembunyi
gameArea.style.opacity = 0; // Pastikan area game tidak terlihat

// Pastikan loop animasi menu berjalan untuk menggambar apapun di menu jika perlu
animationFrameId = requestAnimationFrame(update);

// Class untuk piece (tetromino)
class Piece {
    constructor(shape, color) {
        this.shape = shape;
        this.color = color;
        this.x = Math.floor(COLS / 2) - Math.floor(shape[0].length / 2);
        this.y = 0;
    }

    draw() {
        drawPiece(this, ctx, this.x, this.y);
    }

    move(dx, dy) {
        const newX = this.x + dx;
        const newY = this.y + dy;
        
        if (!this.checkCollisionWithBoard(newX, newY)) {
            this.x = newX;
            this.y = newY;
            return true;
        }
        return false;
    }

    rotate() {
        const newShape = [];
        for (let i = 0; i < this.shape[0].length; i++) {
            newShape.push([]);
            for (let j = this.shape.length - 1; j >= 0; j--) {
                newShape[i].push(this.shape[j][i]);
            }
        }
        return newShape;
    }

    tryKick(newShape) {
        const oldShape = this.shape;
        this.shape = newShape;
        
        // Coba posisi normal
        if (!this.checkCollisionWithBoard(this.x, this.y)) {
            return true;
        }
        
        // Coba kick ke kiri
        if (!this.checkCollisionWithBoard(this.x - 1, this.y)) {
            this.x -= 1;
            return true;
        }
        
        // Coba kick ke kanan
        if (!this.checkCollisionWithBoard(this.x + 1, this.y)) {
            this.x += 1;
            return true;
        }
        
        // Jika semua gagal, kembalikan ke bentuk awal
        this.shape = oldShape;
        return false;
    }

    checkCollisionWithBoard(x, y) {
        return this.shape.some((row, dy) => {
            return row.some((value, dx) => {
                if (!value) return false;
                const newX = x + dx;
                const newY = y + dy;
                return (
                    newX < 0 || 
                    newX >= COLS || 
                    newY >= ROWS ||
                    (newY >= 0 && board[newY][newX])
                );
            });
        });
    }
}

// Fungsi untuk membuat piece baru
function createPiece() {
    const randomIndex = Math.floor(Math.random() * SHAPES.length);
    return new Piece(SHAPES[randomIndex], COLORS[randomIndex]);
}