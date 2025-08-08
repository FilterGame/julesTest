const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Set canvas size
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

// Game world properties
const world = {
    width: 3000,
    height: 3000,
    backgroundColor: '#3d823d' // A grassy green color
};

// Camera/viewport properties
const camera = {
    x: 0,
    y: 0,
    width: canvas.width,
    height: canvas.height,
    scrollSpeed: 10,
    scrollMargin: 50 // Distance from edge to start scrolling
};

// Mouse position
const mouse = {
    x: 0,
    y: 0
};

// --- Game Objects ---
const gameObjects = [];

class Unit {
    constructor(x, y, size, color) {
        this.x = x;
        this.y = y;
        this.size = size;
        this.color = color;
        this.isSelected = false;
    }

    draw(ctx) {
        // Draw the unit
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x - this.size / 2, this.y - this.size / 2, this.size, this.size);

        // Draw selection indicator
        if (this.isSelected) {
            ctx.strokeStyle = '#00FF00'; // Bright green for visibility
            ctx.lineWidth = 3;
            ctx.strokeRect(this.x - this.size / 2 - 3, this.y - this.size / 2 - 3, this.size + 6, this.size + 6);
        }
    }

    update() {
        // Future unit logic will go here (e.g., movement)
    }
}

// Create some units
gameObjects.push(new Unit(300, 300, 40, '#d93a3a')); // Red unit
gameObjects.push(new Unit(500, 400, 40, '#4a7bd9')); // Blue unit

// --- Event Listeners ---
window.addEventListener('resize', () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    camera.width = canvas.width;
    camera.height = canvas.height;
});

document.addEventListener('mousemove', (e) => {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
});

canvas.addEventListener('click', (e) => {
    // Convert screen click coords to world coords
    const worldX = e.clientX + camera.x;
    const worldY = e.clientY + camera.y;

    // Deselect all units first (unless holding Shift)
    if (!e.shiftKey) {
        gameObjects.forEach(unit => unit.isSelected = false);
    }

    // Check if a unit was clicked
    let unitClicked = false;
    for (const unit of gameObjects) {
        if (
            worldX >= unit.x - unit.size / 2 &&
            worldX <= unit.x + unit.size / 2 &&
            worldY >= unit.y - unit.size / 2 &&
            worldY <= unit.y + unit.size / 2
        ) {
            unit.isSelected = !unit.isSelected; // Toggle selection
            unitClicked = true;
            break; // Stop after finding one unit
        }
    }
});


// --- Game Logic ---
function update() {
    // Update all game objects
    gameObjects.forEach(obj => obj.update());

    // Scroll camera based on mouse position
    // Scroll right
    if (mouse.x > canvas.width - camera.scrollMargin) {
        camera.x += camera.scrollSpeed;
    }
    // Scroll left
    if (mouse.x < camera.scrollMargin) {
        camera.x -= camera.scrollSpeed;
    }
    // Scroll down
    if (mouse.y > canvas.height - camera.scrollMargin) {
        camera.y += camera.scrollSpeed;
    }
    // Scroll up
    if (mouse.y < camera.scrollMargin) {
        camera.y -= camera.scrollSpeed;
    }

    // Clamp camera to world boundaries
    camera.x = Math.max(0, Math.min(camera.x, world.width - camera.width));
    camera.y = Math.max(0, Math.min(camera.y, world.height - camera.height));
}

function draw() {
    // Clear the canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Save context state
    ctx.save();

    // Translate context to camera position
    ctx.translate(-camera.x, -camera.y);

    // Draw the world background
    ctx.fillStyle = world.backgroundColor;
    ctx.fillRect(0, 0, world.width, world.height);

    // Example: Draw a grid
    ctx.strokeStyle = 'rgba(0,0,0,0.1)';
    ctx.lineWidth = 1;
    for (let x = 0; x <= world.width; x += 100) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, world.height);
        ctx.stroke();
    }
    for (let y = 0; y <= world.height; y += 100) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(world.width, y);
        ctx.stroke();
    }

    // Draw all game objects
    gameObjects.forEach(obj => obj.draw(ctx));

    // Restore context state
    ctx.restore();

    // --- Draw UI elements here in the future (not affected by camera) ---
}

// --- Main Game Loop ---
function gameLoop() {
    update();
    draw();
    requestAnimationFrame(gameLoop);
}

// Start the game
console.log("Starting Web RTS Game...");
gameLoop();
