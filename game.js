const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const soundToggle = document.getElementById("soundToggle");
const pauseOverlay = document.getElementById("pauseOverlay");

const cols = 22;
const rows = 40;
let blockSize;
let playing = false;

let board = Array.from({ length: rows }, () => Array(cols).fill(null));
let dropCounter = 0;
let dropInterval = 1000;
let paused = false;

const clickSound = new Audio("sounds/clic.m4a");
const loseMusic = new Audio("sounds/cerenisk.m4a");
loseMusic.loop = true;

const bgMusic = new Audio("sounds/background.m4a");
bgMusic.loop = true;
bgMusic.volume = 0.5; // No tan fuerte para que no sea molesto

let soundEnabled = false;

const mainSoundToggleButton = document.querySelector('#mainSoundToggle button');

function toggleSound() {
    soundEnabled = !soundEnabled;

    // Actualiza los textos de ambos botones
    if (mainSoundToggleButton) {
        mainSoundToggleButton.textContent = soundEnabled ? "🔊 Sonido: ON" : "🔇 Sonido: OFF";
    }

    if (soundToggle) {
        soundToggle.textContent = soundEnabled ? "🔊 Sonido: ON" : "🔇 Sonido: OFF";
    }

    // Cambia mute de todos los sonidos
    [bgMusic, loseMusic, clickSound].forEach(sound => sound.muted = !soundEnabled);
}


window.addEventListener("load", () => {
    toggleMainSound(); // Lo pone en OFF al inicio
});

mainSoundToggleButton.addEventListener("click", () => {
    toggleSound();
});



const colors = ["#ffffcc", "#ffcccc", "#ffcc99", "#ff9999", "#ff9966", "#ccccff", "#cc9999", "#99cccc"];

const tetrominos = [
    [[1, 1, 1, 1]],
    [[1, 0, 0], [1, 1, 1]],
    [[0, 0, 1], [1, 1, 1]],
    [[1, 1], [1, 1]],
    [[0, 1, 1], [1, 1, 0]],
    [[1, 1, 0], [0, 1, 1]],
    [[0, 1, 0], [1, 1, 1]],
    [[0, 0, 1], [0, 1, 0], [1, 0, 0]],
];

let currentPiece = getRandomPiece();
let selectedBackground = localStorage.getItem('background') || "";
let backgroundImg = null;

soundToggle.textContent = soundEnabled ? "🔊 Sonido: ON" : "🔇 Sonido: OFF";
bgMusic.muted = true;
loseMusic.muted = true;
clickSound.muted = true;


function loadBackground() {
    if (selectedBackground) {
        backgroundImg = new Image();
        backgroundImg.src = selectedBackground;
        backgroundImg.onload = () => {
            // Opcional: Redibujar si quieres que se vea al instante
            clearCanvas();
            drawBoard();
            drawPiece();
        }
    } else {
        backgroundImg = null;
    }
}

function saveBackground() {
    const radios = document.getElementsByName("background");
    radios.forEach(radio => {
        if (radio.checked) {
            selectedBackground = radio.value;
        }
    });

    localStorage.setItem('background', selectedBackground);
    applyBackground();
}


function applyBackground() {
    if (selectedBackground) {
        document.body.style.backgroundImage = `url(${selectedBackground})`;
        document.body.style.backgroundSize = "cover";
        document.body.style.backgroundPosition = "center";
    } else {
        document.body.style.backgroundImage = "none";
        document.body.style.backgroundColor = "#eee";
    }
}

function drawBackground() {
    if (backgroundImg) {
        ctx.drawImage(backgroundImg, 0, 0, canvas.width, canvas.height);
    } else {
        ctx.fillStyle = "#fff5e6";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
}

function moveLeft() {
    if (isValidMove(-1, 0)) currentPiece.x--;
}

function moveRight() {
    if (isValidMove(1, 0)) currentPiece.x++;
}

function rotatePiece() {
    const rotated = rotate(currentPiece.shape);
    if (!rotationCollision(rotated)) currentPiece.shape = rotated;
}

function hardDrop() {
    while (!collision()) currentPiece.y++;
    currentPiece.y--;
    fixToBoard();
    currentPiece = getRandomPiece();
}

document.querySelectorAll('input[name="background"]').forEach(radio => {
    radio.addEventListener('change', () => {
        selectedBackground = radio.value;
        localStorage.setItem('background', selectedBackground);
        applyBackground();  // Cambiar fondo al instante
    });
});

function resizeCanvas() {
    blockSize = Math.floor(Math.min(window.innerWidth / cols, window.innerHeight / rows));
    canvas.width = cols * blockSize;
    canvas.height = rows * blockSize;
}

window.addEventListener('resize', resizeCanvas);
resizeCanvas();

canvas.addEventListener("click", () => {
    paused = true;
    pauseOverlay.style.display = "flex";
});

pauseOverlay.addEventListener("click", () => {
    paused = false;
    pauseOverlay.style.display = "none";
});

soundToggle.addEventListener("click", (e) => {
    e.stopPropagation();  // Para que no pause el juego al hacer click
    toggleSound();
});



function getRandomPiece() {
    const index = Math.floor(Math.random() * tetrominos.length);
    return {
        shape: tetrominos[index],
        color: colors[index],
        x: Math.floor(cols / 2) - 1,
        y: 0
    };
}

function drawBlock(x, y, color) {
    ctx.fillStyle = color;
    ctx.fillRect(x * blockSize, y * blockSize, blockSize, blockSize);
    ctx.strokeStyle = "#8b6f4a";
    ctx.lineWidth = 2;
    ctx.strokeRect(x * blockSize + 1, y * blockSize + 1, blockSize - 2, blockSize - 2);
}

function drawPiece() {
    currentPiece.shape.forEach((row, y) => {
        row.forEach((value, x) => {
            if (value) drawBlock(currentPiece.x + x, currentPiece.y + y, currentPiece.color);
        });
    });
}

function clearCanvas() {
    drawBackground();
}

function collision() {
    return currentPiece.shape.some((row, y) => {
        return row.some((value, x) => {
            let newX = currentPiece.x + x;
            let newY = currentPiece.y + y;

            if (value && (newX < 0 || newX >= cols || newY >= rows)) return true;
            if (value && newY >= 0 && board[newY][newX] !== null) return true;

            return false;
        });
    });
}

function isValidMove(offsetX, offsetY) {
    return currentPiece.shape.every((row, y) => {
        return row.every((value, x) => {
            if (!value) return true;
            let newX = currentPiece.x + x + offsetX;
            let newY = currentPiece.y + y + offsetY;
            return (newX >= 0 && newX < cols && newY < rows && (newY < 0 || board[newY][newX] === null));
        });
    });
}

function fixToBoard() {
    let gameOver = false;

    currentPiece.shape.forEach((row, y) => {
        row.forEach((value, x) => {
            let boardX = currentPiece.x + x;
            let boardY = currentPiece.y + y;

            if (value) {
                if (boardY < 0) {
                    gameOver = true;
                } else if (boardY < rows && boardX >= 0 && boardX < cols) {
                    board[boardY][boardX] = currentPiece.color;
                }
            }
        });
    });

    if (soundEnabled) clickSound.play();
    checkLines();

    if (gameOver) endGame();
}

function checkLines() {
    for (let y = rows - 1; y >= 0; y--) {
        if (board[y].every(cell => cell !== null)) {
            board.splice(y, 1);
            board.unshift(Array(cols).fill(null));
            y++;
        }
    }
}

function drawBoard() {
    board.forEach((row, y) => {
        row.forEach((cell, x) => {
            if (cell) drawBlock(x, y, cell);
        });
    });
}

function moveDown() {
    currentPiece.y++;
    if (collision()) {
        currentPiece.y--;
        fixToBoard();
        currentPiece = getRandomPiece();
    }
}

function hardDrop() {
    while (!collision()) currentPiece.y++;
    currentPiece.y--;
    fixToBoard();
    currentPiece = getRandomPiece();
}

function rotate(matrix) {
    return matrix[0].map((_, i) => matrix.map(row => row[i]).reverse());
}

function rotationCollision(rotatedShape) {
    return rotatedShape.some((row, y) => {
        return row.some((value, x) => {
            let newX = currentPiece.x + x;
            let newY = currentPiece.y + y;
            return value && (newX < 0 || newX >= cols || newY >= rows || (newY >= 0 && board[newY][newX]));
        });
    });
}

document.addEventListener("keydown", (e) => {
    // Evitar que Enter active botones o formularios en la página
    if (e.code === "Enter" && e.target.tagName !== "BODY") {
        e.preventDefault();
        return;
    }

    // No responder a teclas si el juego está pausado o en pantalla de inicio
    if (paused || !playing) return;

    if (e.code === "ArrowDown") moveDown();
    if (e.code === "ArrowLeft" && isValidMove(-1, 0)) currentPiece.x--;
    if (e.code === "ArrowRight" && isValidMove(1, 0)) currentPiece.x++;
    if (e.code === "ArrowUp") {
        const rotated = rotate(currentPiece.shape);
        if (!rotationCollision(rotated)) currentPiece.shape = rotated;
    }
    if (e.code === "Enter") hardDrop();
});


function gameLoop() {
    clearCanvas();
    drawBoard();
    drawPiece();
}

let lastTime = 0;

function update(time = 0) {
    if (!paused) {
        const deltaTime = time - lastTime;
        lastTime = time;

        dropCounter += deltaTime;
        if (dropCounter > dropInterval) {
            moveDown();
            dropCounter = 0;
        }

        gameLoop();
    }

    requestAnimationFrame(update);
}

function isMobile() {
    return window.innerWidth <= 768;
}

function startGame() {
    playing = true;

    document.getElementById("backgroundSelector").style.display = "none";
    applyBackground();

    loseMusic.pause();
    loseMusic.currentTime = 0;

    bgMusic.play();

    board = Array.from({ length: rows }, () => Array(cols).fill(null));
    currentPiece = getRandomPiece();
    canvas.style.display = "block";
    document.getElementById("startScreen").style.display = "none";
    soundToggle.style.display = "block";

    // Mostrar solo si es móvil
    if (isMobile()) {
        document.getElementById("mobileControls").classList.add("show");
    }
}

function showStartScreen() {
    canvas.style.display = "none";
    document.getElementById("startScreen").style.display = "block";
    document.getElementById("backgroundSelector").style.display = "block";
    soundToggle.style.display = "none";

    // Siempre ocultar
    document.getElementById("mobileControls").classList.remove("show");
}


function endGame() {
    playing = false;
    loseMusic.play();
    bgMusic.pause();
    alert("Oops, ¡perdiste!");
    showStartScreen();
}

update();

