// --- 1. 全域變數與初始化 ---

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

// 遊戲世界設定
const world = { width: 3000, height: 3000, backgroundColor: '#2c3e50', gridColor: 'rgba(255, 255, 255, 0.08)' };

// 攝影機設定
const camera = { x: 0, y: 0, width: canvas.width, height: canvas.height, scrollSpeed: 15, scrollMargin: 60 };

// 滑鼠狀態
const mouse = { x: 0, y: 0, isDown: false, button: -1 };

// 玩家狀態 (資源)
const player = { minerals: 1000, energy: 500 };

// 遊戲物件管理
const gameObjects = [];
let selectedObjects = [];
let commandCenter = null; // 指揮中心的引用

// --- 2. 遊戲核心類別 ---

// 基本物件類別
class GameObject {
    constructor(x, y, size, color) {
        this.id = Date.now() + Math.random();
        this.x = x;
        this.y = y;
        this.size = size;
        this.color = color;
        this.isSelected = false;
    }

    update() {} // 預設更新為空

    draw(ctx) {
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x - this.size / 2, this.y - this.size / 2, this.size, this.size);
        if (this.isSelected) {
            ctx.strokeStyle = '#2ecc71'; // 綠色
            ctx.lineWidth = 3;
            ctx.strokeRect(this.x - this.size / 2 - 3, this.y - this.size / 2 - 3, this.size + 6, this.size + 6);
        }
    }

    isClicked(pointX, pointY) {
        const halfSize = this.size / 2;
        return (pointX >= this.x - halfSize && pointX <= this.x + halfSize &&
                pointY >= this.y - halfSize && pointY <= this.y + halfSize);
    }
}

// 單位類別
class Unit extends GameObject {
    constructor(x, y, size, color, speed) {
        super(x, y, size, color);
        this.type = 'unit';
        this.speed = speed;
        this.target = null;
    }

    update() {
        if (this.target) {
            const dx = this.target.x - this.x;
            const dy = this.target.y - this.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            if (distance < this.speed) {
                this.x = this.target.x;
                this.y = this.target.y;
                this.target = null;
            } else {
                this.x += (dx / distance) * this.speed;
                this.y += (dy / distance) * this.speed;
            }
        }
    }
}

// 採礦車類別
class MinerUnit extends Unit {
    constructor(x, y) {
        super(x, y, 35, '#f1c40f', 2.5); // 黃色，速度較慢
        this.type = 'miner';
        this.state = 'idle'; // idle, movingToMine, mining, returning
        this.miningTarget = null;
        this.resourceLoad = 0;
        this.capacity = 100;
        this.miningTime = 2000; // 2秒採集一次
        this.miningTimer = 0;
    }

    update() {
        switch (this.state) {
            case 'movingToMine':
                if (this.target) super.update();
                if (!this.target) {
                    this.state = 'mining';
                    this.miningTimer = Date.now();
                }
                break;
            case 'mining':
                if (Date.now() - this.miningTimer > this.miningTime) {
                    if (this.miningTarget && this.miningTarget.amount > 0) {
                        const amount = Math.min(this.capacity - this.resourceLoad, 10);
                        this.resourceLoad += amount;
                        this.miningTarget.amount -= amount;
                        if (this.resourceLoad >= this.capacity || this.miningTarget.amount <= 0) {
                            this.state = 'returning';
                            this.target = { x: commandCenter.x, y: commandCenter.y };
                        }
                        this.miningTimer = Date.now();
                    } else {
                        this.state = 'idle';
                    }
                }
                break;
            case 'returning':
                if (this.target) super.update();
                if (!this.target) {
                    player.minerals += this.resourceLoad;
                    this.resourceLoad = 0;
                    if (this.miningTarget && this.miningTarget.amount > 0) {
                        this.state = 'movingToMine';
                        this.target = { x: this.miningTarget.x, y: this.miningTarget.y };
                    } else {
                        this.state = 'idle';
                    }
                }
                break;
            default: // idle
                super.update();
        }
    }

    draw(ctx) {
        super.draw(ctx);
        if (this.resourceLoad > 0) {
            ctx.fillStyle = '#3498db'; // 藍色代表礦
            ctx.fillRect(this.x - 5, this.y - this.size/2 - 10, 10, 5);
        }
    }
}

// 建築類別
class Building extends GameObject {
    constructor(x, y, size, color) {
        super(x, y, size, color);
        this.type = 'building';
    }
}

// 資源點類別
class ResourceNode extends GameObject {
    constructor(x, y) {
        super(x, y, 60, '#3498db'); // 藍色礦石
        this.type = 'resource';
        this.amount = 2000;
    }

    draw(ctx) {
        // 畫一個更像礦石堆的樣子
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.moveTo(this.x, this.y - 30);
        ctx.lineTo(this.x + 30, this.y);
        ctx.lineTo(this.x, this.y + 30);
        ctx.lineTo(this.x - 30, this.y);
        ctx.closePath();
        ctx.fill();

        if (this.isSelected) {
            ctx.strokeStyle = '#2ecc71';
            ctx.lineWidth = 3;
            ctx.strokeRect(this.x - this.size / 2, this.y - this.size / 2, this.size, this.size);
        }
    }
}

// --- 3. 事件監聽器 ---

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

canvas.addEventListener('contextmenu', (e) => e.preventDefault());

canvas.addEventListener('mousedown', (e) => {
    e.preventDefault();
    const worldX = mouse.x + camera.x;
    const worldY = mouse.y + camera.y;

    if (e.button === 0) { // 左鍵
        selectedObjects = [];
        gameObjects.forEach(obj => obj.isSelected = false);
        let clickedObject = null;
        for (const obj of [...gameObjects].reverse()) { // 從後往前遍歷，優先選取上層物件
            if (obj.isClicked(worldX, worldY)) {
                clickedObject = obj;
                break;
            }
        }
        if (clickedObject) {
            clickedObject.isSelected = true;
            if (clickedObject.type === 'unit' || clickedObject.type === 'miner') {
                selectedObjects.push(clickedObject);
            }
        }
    }

    if (e.button === 2) { // 右鍵
        if (selectedObjects.length > 0) {
            let targetObject = null;
            for (const obj of [...gameObjects].reverse()) {
                if (obj.isClicked(worldX, worldY)) {
                    targetObject = obj;
                    break;
                }
            }

            selectedObjects.forEach(unit => {
                if (unit.type === 'miner' && targetObject && targetObject.type === 'resource') {
                    unit.state = 'movingToMine';
                    unit.miningTarget = targetObject;
                    unit.target = { x: targetObject.x, y: targetObject.y };
                } else {
                    // 普通移動指令
                    if (unit.state) unit.state = 'idle'; // 中斷採礦
                    unit.target = { x: worldX, y: worldY };
                }
            });
        }
    }
});

// --- 4. 遊戲主迴圈 ---

function update() {
    // 捲動攝影機
    if (mouse.x > canvas.width - camera.scrollMargin) camera.x += camera.scrollSpeed;
    if (mouse.x < camera.scrollMargin) camera.x -= camera.scrollSpeed;
    if (mouse.y > canvas.height - camera.scrollMargin) camera.y += camera.scrollSpeed;
    if (mouse.y < camera.scrollMargin) camera.y -= camera.scrollSpeed;
    camera.x = Math.max(0, Math.min(camera.x, world.width - camera.width));
    camera.y = Math.max(0, Math.min(camera.y, world.height - camera.height));

    // 更新所有遊戲物件
    gameObjects.forEach(obj => obj.update());
}

function drawUI(ctx) {
    // 繪製頂部UI背景
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(0, 0, canvas.width, 40);

    // 繪製資源文字
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '20px Arial';
    ctx.fillText(`礦石: ${player.minerals}`, 20, 28);
    ctx.fillText(`能源: ${player.energy}`, 200, 28);
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.translate(-camera.x, -camera.y);

    // 繪製世界背景和網格
    ctx.fillStyle = world.backgroundColor;
    ctx.fillRect(0, 0, world.width, world.height);
    ctx.strokeStyle = world.gridColor;
    ctx.lineWidth = 1;
    for (let x = 0; x <= world.width; x += 100) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, world.height); ctx.stroke();
    }
    for (let y = 0; y <= world.height; y += 100) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(world.width, y); ctx.stroke();
    }

    // 繪製所有遊戲物件
    gameObjects.forEach(obj => obj.draw(ctx));

    ctx.restore();

    // 繪製UI
    drawUI(ctx);
}

function gameLoop() {
    update();
    draw();
    requestAnimationFrame(gameLoop);
}

// --- 5. 遊戲啟動 ---
function startGame() {
    // 創建指揮中心
    commandCenter = new Building(400, 400, 100, '#bdc3c7'); // 灰色
    gameObjects.push(commandCenter);

    // 創建礦石資源
    gameObjects.push(new ResourceNode(800, 350));
    gameObjects.push(new ResourceNode(850, 420));

    // 創建初始單位
    gameObjects.push(new Unit(300, 300, 40, '#e74c3c', 3)); // 紅色戰鬥單位
    gameObjects.push(new MinerUnit(500, 500)); // 黃色採礦單位

    console.log("遊戲迭代 2 開始：資源系統與UI");
    gameLoop();
}

startGame();
