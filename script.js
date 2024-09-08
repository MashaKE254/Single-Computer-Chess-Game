const pieces = {
    'white': {
        'king': '♔', 'queen': '♕', 'rook': '♖',
        'bishop': '♗', 'knight': '♘', 'pawn': '♙'
    },
    'black': {
        'king': '♚', 'queen': '♛', 'rook': '♜',
        'bishop': '♝', 'knight': '♞', 'pawn': '♟'
    }
};

let selectedPiece = null;
let currentTurn = 'white';

let capturedPieces = {
    'white': [],
    'black': []
};

let playingWithBot = false;

let whiteTime = 15 * 60; // 15 minutes in seconds
let blackTime = 15 * 60;
let timerInterval;

let player1Name = "Player 1";
let player2Name = "Player 2";
const botNames = ["ChessBot", "DeepPawn", "QuantumKnight", "NeuralRook", "AIBishop"];
let isFirstTurn = true;

let whiteStarted = false;
let blackStarted = false;
let gameStarted = false;
let startTimeout;

let gameInProgress = false;

function createChessboard() {
    const chessboard = document.getElementById('chessboard');
    const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
    const ranks = ['8', '7', '6', '5', '4', '3', '2', '1'];

    for (let i = 0; i < 8; i++) {
        for (let j = 0; j < 8; j++) {
            const square = document.createElement('div');
            square.classList.add('square');
            square.classList.add((i + j) % 2 === 0 ? 'white' : 'black');
            square.setAttribute('data-position', `${files[j]}${ranks[i]}`);
            chessboard.appendChild(square);
        }
    }
    setupInitialPosition();
    addClickListeners();
    updateTurnDisplay();
}

function setupInitialPosition() {
    const initialPosition = {
        'a8': 'black-rook', 'b8': 'black-knight', 'c8': 'black-bishop', 'd8': 'black-queen',
        'e8': 'black-king', 'f8': 'black-bishop', 'g8': 'black-knight', 'h8': 'black-rook',
        'a7': 'black-pawn', 'b7': 'black-pawn', 'c7': 'black-pawn', 'd7': 'black-pawn',
        'e7': 'black-pawn', 'f7': 'black-pawn', 'g7': 'black-pawn', 'h7': 'black-pawn',
        'a2': 'white-pawn', 'b2': 'white-pawn', 'c2': 'white-pawn', 'd2': 'white-pawn',
        'e2': 'white-pawn', 'f2': 'white-pawn', 'g2': 'white-pawn', 'h2': 'white-pawn',
        'a1': 'white-rook', 'b1': 'white-knight', 'c1': 'white-bishop', 'd1': 'white-queen',
        'e1': 'white-king', 'f1': 'white-bishop', 'g1': 'white-knight', 'h1': 'white-rook'
    };

    for (const [position, piece] of Object.entries(initialPosition)) {
        const [color, type] = piece.split('-');
        const square = document.querySelector(`[data-position="${position}"]`);
        square.innerHTML = pieces[color][type];
        square.setAttribute('data-piece', type);
        square.setAttribute('data-color', color);
    }
}

function addClickListeners() {
    const squares = document.querySelectorAll('.square');
    squares.forEach(square => {
        square.addEventListener('click', handleSquareClick);
    });
}

function handleSquareClick(event) {
    if (!gameStarted) return;

    const square = event.target;
    const piece = square.getAttribute('data-piece');
    const color = square.getAttribute('data-color');
    const position = square.getAttribute('data-position');

    if (selectedPiece) {
        if (square === selectedPiece) {
            // Deselect the piece if clicked again
            deselectPiece();
        } else if (color === currentTurn) {
            // Select a different piece of the same color
            deselectPiece();
            selectPiece(square);
        } else {
            // Attempt to move the piece
            movePiece(selectedPiece, square);
        }
    } else if (piece && color === currentTurn) {
        // Select the piece
        selectPiece(square);
    }
}

function selectPiece(square) {
    selectedPiece = square;
    square.style.border = '3px solid green';
    highlightValidMoves(square);
}

function deselectPiece() {
    if (selectedPiece) {
        selectedPiece.style.border = 'none';
        selectedPiece = null;
        removeHighlights();
    }
}

function movePiece(fromSquare, toSquare) {
    const piece = fromSquare.getAttribute('data-piece');
    const color = fromSquare.getAttribute('data-color');
    const fromPosition = fromSquare.getAttribute('data-position');
    const toPosition = toSquare.getAttribute('data-position');

    if (isValidMove(piece, color, fromPosition, toPosition)) {
        const capturedPiece = toSquare.getAttribute('data-piece');
        const capturedColor = toSquare.getAttribute('data-color');

        if (capturedPiece) {
            capturePiece(capturedPiece, capturedColor);
        }

        toSquare.innerHTML = fromSquare.innerHTML;
        toSquare.setAttribute('data-piece', fromSquare.getAttribute('data-piece'));
        toSquare.setAttribute('data-color', fromSquare.getAttribute('data-color'));

        fromSquare.innerHTML = '';
        fromSquare.removeAttribute('data-piece');
        fromSquare.removeAttribute('data-color');

        deselectPiece();
        currentTurn = currentTurn === 'white' ? 'black' : 'white';
        updateTurnDisplay();
        
        if (!checkGameOver()) {
            startTimer(); // Restart the timer after each move
            if (playingWithBot && currentTurn === 'black') {
                makeBotMove();
            }
        }
    } else {
        alert("Invalid move!");
        deselectPiece();
    }
}

function isValidMove(piece, color, from, to) {
    const [fromFile, fromRank] = from.split('');
    const [toFile, toRank] = to.split('');
    const dx = toFile.charCodeAt(0) - fromFile.charCodeAt(0);
    const dy = parseInt(toRank) - parseInt(fromRank);

    const toSquare = document.querySelector(`[data-position="${to}"]`);
    if (toSquare && toSquare.getAttribute('data-color') === color) {
        return false; // Can't capture own piece
    }

    switch (piece) {
        case 'pawn':
            if (color === 'white') {
                if (dy === 1 && dx === 0 && !toSquare.getAttribute('data-piece')) return true; // Move forward
                if (dy === 2 && dx === 0 && fromRank === '2' && !toSquare.getAttribute('data-piece') && !document.querySelector(`[data-position="${fromFile}3"]`).getAttribute('data-piece')) return true; // Initial two-square move
                if (dy === 1 && Math.abs(dx) === 1 && toSquare.getAttribute('data-piece')) return true; // Capture diagonally
            } else {
                if (dy === -1 && dx === 0 && !toSquare.getAttribute('data-piece')) return true; // Move forward
                if (dy === -2 && dx === 0 && fromRank === '7' && !toSquare.getAttribute('data-piece') && !document.querySelector(`[data-position="${fromFile}6"]`).getAttribute('data-piece')) return true; // Initial two-square move
                if (dy === -1 && Math.abs(dx) === 1 && toSquare.getAttribute('data-piece')) return true; // Capture diagonally
            }
            return false;
        case 'rook':
            return (dx === 0 || dy === 0) && isPathClear(from, to);
        case 'knight':
            return (Math.abs(dx) === 2 && Math.abs(dy) === 1) || (Math.abs(dx) === 1 && Math.abs(dy) === 2);
        case 'bishop':
            return Math.abs(dx) === Math.abs(dy) && isPathClear(from, to);
        case 'queen':
            return (dx === 0 || dy === 0 || Math.abs(dx) === Math.abs(dy)) && isPathClear(from, to);
        case 'king':
            return Math.abs(dx) <= 1 && Math.abs(dy) <= 1;
        default:
            return false;
    }
}

function isPathClear(from, to) {
    const [fromFile, fromRank] = from.split('');
    const [toFile, toRank] = to.split('');
    const dx = Math.sign(toFile.charCodeAt(0) - fromFile.charCodeAt(0));
    const dy = Math.sign(parseInt(toRank) - parseInt(fromRank));

    let currentFile = fromFile.charCodeAt(0) + dx;
    let currentRank = parseInt(fromRank) + dy;

    while (currentFile !== toFile.charCodeAt(0) || currentRank !== parseInt(toRank)) {
        const currentSquare = document.querySelector(`[data-position="${String.fromCharCode(currentFile)}${currentRank}"]`);
        if (currentSquare.getAttribute('data-piece')) {
            return false;
        }
        currentFile += dx;
        currentRank += dy;
    }

    return true;
}

function capturePiece(piece, color) {
    const oppositeColor = color === 'white' ? 'black' : 'white';
    capturedPieces[oppositeColor].push(piece);
    updateCapturedPiecesDisplay();
}

function updateCapturedPiecesDisplay() {
    const whiteContainer = document.getElementById('white-captured');
    const blackContainer = document.getElementById('black-captured');

    whiteContainer.innerHTML = '';
    blackContainer.innerHTML = '';

    capturedPieces.black.forEach(piece => {
        const pieceElement = document.createElement('span');
        pieceElement.classList.add('captured-piece');
        pieceElement.innerHTML = pieces.black[piece];
        whiteContainer.appendChild(pieceElement);
    });

    capturedPieces.white.forEach(piece => {
        const pieceElement = document.createElement('span');
        pieceElement.classList.add('captured-piece');
        pieceElement.innerHTML = pieces.white[piece];
        blackContainer.appendChild(pieceElement);
    });
}

function resetGame() {
    if (!playingWithBot) return;

    const squares = document.querySelectorAll('.square');
    squares.forEach(square => {
        square.innerHTML = '';
        square.removeAttribute('data-piece');
        square.removeAttribute('data-color');
        square.style.border = 'none';
    });
    setupInitialPosition();
    currentTurn = 'white';
    selectedPiece = null;
    capturedPieces = {
        'white': [],
        'black': []
    };
    updateCapturedPiecesDisplay();
    updateTurnDisplay();

    whiteTime = 15 * 60;
    blackTime = 15 * 60;
    updateTimerDisplay();
    clearInterval(timerInterval);

    whiteStarted = false;
    blackStarted = false;
    gameStarted = false;
    gameInProgress = false;
    clearTimeout(startTimeout);
    document.getElementById('white-start').classList.remove('clicked');
    document.getElementById('black-start').classList.remove('clicked');
    document.getElementById('white-start').disabled = false;
    document.getElementById('black-start').disabled = false;
    document.getElementById('bot-toggle').disabled = false;

    isFirstTurn = true;
    player1Name = "Player 1";
    player2Name = "Player 2";
    updateTurnDisplay();

    if (playingWithBot && currentTurn === 'black') {
        makeBotMove();
    }
}

function updateTurnDisplay() {
    const currentPlayerName = currentTurn === 'white' ? player1Name : player2Name;
    document.getElementById('current-player').textContent = currentPlayerName;
}

function toggleBotPlay() {
    if (gameInProgress) {
        alert("Cannot switch to bot play during an active game.");
        return;
    }

    playingWithBot = !playingWithBot;
    document.getElementById('bot-toggle').textContent = playingWithBot ? 'Play with Human' : 'Play with Bot';
    document.getElementById('reset-button').disabled = !playingWithBot;

    if (playingWithBot) {
        player2Name = botNames[Math.floor(Math.random() * botNames.length)];
        updateTurnDisplay();
        document.getElementById('black-start').click(); // Automatically click the black start button when playing with bot
    } else {
        player2Name = "Player 2";
        isFirstTurn = true; // Reset first turn flag when switching to human play
    }
    updateTurnDisplay();
    if (playingWithBot && currentTurn === 'black') {
        makeBotMove();
    } else {
        startTimer();
    }
}

function makeBotMove() {
    if (!playingWithBot || currentTurn !== 'black') return;

    setTimeout(() => {
        const allValidMoves = getAllValidMoves('black');
        if (allValidMoves.length > 0) {
            // Separate capturing moves from non-capturing moves
            const capturingMoves = allValidMoves.filter(move => {
                const toSquare = document.querySelector(`[data-position="${move.to}"]`);
                return toSquare.getAttribute('data-piece') && toSquare.getAttribute('data-color') !== 'black';
            });

            let selectedMove;
            if (capturingMoves.length > 0) {
                // Prioritize capturing moves
                selectedMove = capturingMoves[Math.floor(Math.random() * capturingMoves.length)];
            } else {
                // If no capturing moves, choose a random move
                selectedMove = allValidMoves[Math.floor(Math.random() * allValidMoves.length)];
            }

            const fromSquare = document.querySelector(`[data-position="${selectedMove.from}"]`);
            const toSquare = document.querySelector(`[data-position="${selectedMove.to}"]`);
            movePiece(fromSquare, toSquare);
        } else {
            showGameOverScreen("White wins! Black (Bot) has no valid moves.");
        }
    }, 500); // Add a small delay to make the bot's move visible
}

function getAllValidMoves(color) {
    const validMoves = [];
    const squares = document.querySelectorAll('.square');
    
    squares.forEach(fromSquare => {
        if (fromSquare.getAttribute('data-color') === color) {
            const piece = fromSquare.getAttribute('data-piece');
            const from = fromSquare.getAttribute('data-position');
            
            squares.forEach(toSquare => {
                const to = toSquare.getAttribute('data-position');
                if (isValidMove(piece, color, from, to)) {
                    validMoves.push({ from, to });
                }
            });
        }
    });
    
    return validMoves;
}

function highlightValidMoves(square) {
    const piece = square.getAttribute('data-piece');
    const color = square.getAttribute('data-color');
    const position = square.getAttribute('data-position');

    const squares = document.querySelectorAll('.square');
    squares.forEach(square => {
        const to = square.getAttribute('data-position');
        if (isValidMove(piece, color, position, to)) {
            square.classList.add('highlight');
        }
    });
}

function removeHighlights() {
    const squares = document.querySelectorAll('.square');
    squares.forEach(square => {
        square.classList.remove('highlight');
    });
}

function startTimer() {
    clearInterval(timerInterval);
    timerInterval = setInterval(() => {
        if (currentTurn === 'white') {
            whiteTime--;
        } else {
            blackTime--;
        }
        updateTimerDisplay();
        checkTimeOut();
    }, 1000);
}

function updateTimerDisplay() {
    document.getElementById('white-timer').textContent = `White: ${formatTime(whiteTime)}`;
    document.getElementById('black-timer').textContent = `Black: ${formatTime(blackTime)}`;
}

function formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
}

function checkTimeOut() {
    if (whiteTime <= 0) {
        showGameOverScreen("Black wins! White's time is up!");
    } else if (blackTime <= 0) {
        showGameOverScreen("White wins! Black's time is up!");
    }
}

function checkGameOver() {
    const currentColor = currentTurn;
    const validMoves = getAllValidMoves(currentColor);

    if (validMoves.length === 0) {
        const winner = currentColor === 'white' ? 'Black' : 'White';
        showGameOverScreen(`${winner} wins! ${currentColor.charAt(0).toUpperCase() + currentColor.slice(1)} has no valid moves.`);
        return true;
    }

    return false;
}

function showGameOverScreen(message) {
    clearInterval(timerInterval);
    document.getElementById('game-over-screen').classList.remove('hidden');
    const winner = message.includes("White wins") ? player1Name : player2Name;
    document.getElementById('game-over-message').textContent = `${winner} wins! ${message}`;
}

function hideGameOverScreen() {
    document.getElementById('game-over-screen').classList.add('hidden');
}

function newGame() {
    hideGameOverScreen();
    resetGame();
}

function showUsernameInput() {
    document.getElementById('username-input').classList.remove('hidden');
}

function setUsername() {
    const playerNameInput = document.getElementById('player-name');
    const playerName = playerNameInput.value.trim() || `Player ${currentTurn === 'white' ? '1' : '2'}`;
    
    if (currentTurn === 'white') {
        player1Name = playerName;
    } else {
        player2Name = playerName;
    }
    
    document.getElementById('username-input').classList.add('hidden');
    playerNameInput.value = '';
    updateTurnDisplay();
    isFirstTurn = false;
}

function handleStartButton(color) {
    if (color === 'white') {
        whiteStarted = true;
        document.getElementById('white-start').classList.add('clicked');
    } else {
        blackStarted = true;
        document.getElementById('black-start').classList.add('clicked');
    }

    if (whiteStarted && blackStarted) {
        startGame();
    } else if (!startTimeout) {
        startTimeout = setTimeout(startGame, 10000);
    }
}

function startGame() {
    if (gameStarted) return;
    gameStarted = true;
    gameInProgress = true;
    clearTimeout(startTimeout);
    document.getElementById('white-start').disabled = true;
    document.getElementById('black-start').disabled = true;
    document.getElementById('bot-toggle').disabled = true;
    startTimer();
}

// Initialize the chessboard when the page loads
document.addEventListener('DOMContentLoaded', () => {
    createChessboard();
    document.getElementById('reset-button').addEventListener('click', resetGame);
    document.getElementById('bot-toggle').addEventListener('click', toggleBotPlay);
    document.getElementById('new-game-button').addEventListener('click', newGame);
    document.getElementById('set-username').addEventListener('click', setUsername);
    document.getElementById('white-start').addEventListener('click', () => handleStartButton('white'));
    document.getElementById('black-start').addEventListener('click', () => handleStartButton('black'));
    updateTimerDisplay();
    updateTurnDisplay();
});
