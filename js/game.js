// --- 1. 全域變數與初始化 ---

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// 設定畫布大小
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

// 遊戲世界設定
const world = {
    width: 3000,
    height: 3000,
    backgroundColor: '#2c3e50', // 深藍色背景
    gridColor: 'rgba(255, 255, 255, 0.08)'
};

// 攝影機/視口設定
const camera = {
    x: 0,
    y: 0,
    width: canvas.width,
    height: canvas.height,
    scrollSpeed: 15,
    scrollMargin: 60 // 滑鼠離邊緣多近時開始捲動
};

// 滑鼠狀態
const mouse = {
    x: 0,
    y: 0,
    isDown: false,
    button: -1
};

// 遊戲物件管理
const gameObjects = []; // 儲存所有單位
let selectedObjects = []; // 儲存被選取的單位

// --- 2. 遊戲核心類別 (Unit) ---

class Unit {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.size = 40;
        this.color = '#e74c3c'; // 紅色
        this.selectedColor = '#2ecc71'; // 綠色
        this.speed = 3;
        this.isSelected = false;

        this.target = null; // 移動目標 {x, y}
    }

    // 更新單位狀態 (例如：移動)
    update() {
        if (this.target) {
            const dx = this.target.x - this.x;
            const dy = this.target.y - this.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance < this.speed) {
                // 已到達目標
                this.x = this.target.x;
                this.y = this.target.y;
                this.target = null;
            } else {
                // 朝目標移動
                this.x += (dx / distance) * this.speed;
                this.y += (dy / distance) * this.speed;
            }
        }
    }

    // 繪製單位到畫布上
    draw(ctx) {
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x - this.size / 2, this.y - this.size / 2, this.size, this.size);

        // 如果被選取，畫出選取框
        if (this.isSelected) {
            ctx.strokeStyle = this.selectedColor;
            ctx.lineWidth = 3;
            ctx.strokeRect(this.x - this.size / 2 - 3, this.y - this.size / 2 - 3, this.size + 6, this.size + 6);
        }
    }

    // 檢查一個點是否在單位內部
    isClicked(pointX, pointY) {
        return (
            pointX >= this.x - this.size / 2 &&
            pointX <= this.x + this.size / 2 &&
            pointY >= this.y - this.size / 2 &&
            pointY <= this.y + this.size / 2
        );
    }
}

// --- 3. 事件監聽器 ---

// 監聽視窗大小改變
window.addEventListener('resize', () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    camera.width = canvas.width;
    camera.height = canvas.height;
});

// 監聽滑鼠移動
document.addEventListener('mousemove', (e) => {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
});

// **核心功能：禁用右鍵選單**
canvas.addEventListener('contextmenu', (e) => {
    e.preventDefault();
});

// 監聽滑鼠按下事件
canvas.addEventListener('mousedown', (e) => {
    e.preventDefault();
    mouse.isDown = true;
    mouse.button = e.button;

    // 將螢幕座標轉換為世界座標
    const worldX = mouse.x + camera.x;
    const worldY = mouse.y + camera.y;

    // 處理左鍵點擊 (e.button === 0)
    if (mouse.button === 0) {
        // 清除所有單位的選取狀態
        selectedObjects = [];
        gameObjects.forEach(unit => unit.isSelected = false);

        // 檢查是否點擊到任何單位
        let unitClicked = false;
        for (const unit of gameObjects) {
            if (unit.isClicked(worldX, worldY)) {
                unit.isSelected = true;
                selectedObjects.push(unit);
                unitClicked = true;
                break; // 只選取最上層的一個
            }
        }
    }

    // 處理右鍵點擊 (e.button === 2)
    if (mouse.button === 2) {
        if (selectedObjects.length > 0) {
            // 命令所有選取的單位移動到目標點
            selectedObjects.forEach(unit => {
                unit.target = { x: worldX, y: worldY };
            });
        }
    }
});

// 監聽滑鼠放開事件
canvas.addEventListener('mouseup', (e) => {
    mouse.isDown = false;
    mouse.button = -1;
});


// --- 4. 遊戲主迴圈 ---

// 更新所有遊戲邏輯
function update() {
    // 根據滑鼠位置捲動攝影機
    if (mouse.x > canvas.width - camera.scrollMargin) camera.x += camera.scrollSpeed;
    if (mouse.x < camera.scrollMargin) camera.x -= camera.scrollSpeed;
    if (mouse.y > canvas.height - camera.scrollMargin) camera.y += camera.scrollSpeed;
    if (mouse.y < camera.scrollMargin) camera.y -= camera.scrollSpeed;

    // 限制攝影機在世界範圍內
    camera.x = Math.max(0, Math.min(camera.x, world.width - camera.width));
    camera.y = Math.max(0, Math.min(camera.y, world.height - camera.height));

    // 更新所有遊戲物件
    gameObjects.forEach(obj => obj.update());
}

// 繪製所有遊戲內容
function draw() {
    // 清除畫布
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 儲存當前繪圖狀態
    ctx.save();

    // 將原點移動到攝影機位置，實現捲動效果
    ctx.translate(-camera.x, -camera.y);

    // 繪製世界背景
    ctx.fillStyle = world.backgroundColor;
    ctx.fillRect(0, 0, world.width, world.height);

    // 繪製網格
    ctx.strokeStyle = world.gridColor;
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

    // 繪製所有遊戲物件
    gameObjects.forEach(obj => obj.draw(ctx));

    // 恢復繪圖狀態
    ctx.restore();
}

// 遊戲主迴圈
function gameLoop() {
    update();
    draw();
    requestAnimationFrame(gameLoop);
}

// --- 5. 遊戲啟動 ---
function startGame() {
    // 創建一個初始單位
    const initialUnit = new Unit(300, 300);
    gameObjects.push(initialUnit);

    console.log("遊戲開始：Iron Conflict");
    gameLoop();
}

startGame();
