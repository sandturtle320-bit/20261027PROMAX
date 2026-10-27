let walkSpriteSheet; 
let standSpriteSheet; 
let jumpSpriteSheet; 
let jumpMoveSpriteSheet; 
let fallingSpriteSheet; 
let characterX = 100;  
let characterY = 100;  
let velocityY = 0; 
let gravity = 0.8; 
let jumpStrength = -20; 

let facingDirection = 1; 
let currentFrame = 0; 
let lastFrameTime = 0; 
let previousAnimation = "stand"; 
let animationState = "stand"; 

// 狀態系統變數
let isActionLocked = false; 
let isGliding = false; 
let isOnGround = false; 
let isShortJump = false; 

// 得分系統與金幣粒子陣列
let score = 0;
let coins = []; 

// 動畫影格設定
const WALK_FRAME_COUNT = 8; 
const STAND_FRAME_COUNT = 7; 
const JUMP_FRAME_COUNT = 10; 
const JUMP_MOVE_FRAME_COUNT = 23; 
const FALLING_FRAME_COUNT = 3;    

const BASE_FRAME_INTERVAL = 100;  
const MOVE_SPEED = 4; 

// 地圖系統設定
const TILE_SIZE = 40; 
let cameraX = 0;      

let levelMap = [
  "                                                                                ",
  "                                                                                ",
  "                                                                                ",
  "                                                                                ",
  "                                                                                ",
  "                                                                                ",
  "                      ?                                                         ",
  "                                                                                ",
  "            B?B?B                                                               ",
  "                                                                                ",
  "                                      P                                         ",
  "                                     PP                                         ",
  "                                    PPP                   BB                    ",
  "GGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGG    GGGGGGGGGGGGGGGGGGGGGGGGGGGGGG",
  "GGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGG    GGGGGGGGGGGGGGGGGGGGGGGGGGGGGG"
];

for (let i = 0; i < levelMap.length; i++) {
  levelMap[i] = levelMap[i].split('');
}

const HITBOX_W = 24;
const HITBOX_H = 50;

function preload() { 
  walkSpriteSheet = loadImage("action/walk/ALL3.png"); 
  standSpriteSheet = loadImage("action/stand/ALL1.png"); 
  jumpSpriteSheet = loadImage("action/jump/ALL2.png"); 
  jumpMoveSpriteSheet = loadImage("action/jumpforward/ALL4.png"); 
  fallingSpriteSheet = loadImage("action/falling/ALL5.png"); 
} 

function setup() { 
  createCanvas(windowWidth, windowHeight); 
  imageMode(CENTER); 
  frameRate(60); 
} 

function draw() { 
  background("#6b8cff"); 

  // --- 1. 處理左右移動 ---
  let moveX = 0; 
  if (keyIsDown(RIGHT_ARROW)) { moveX = MOVE_SPEED; facingDirection = 1; } 
  if (keyIsDown(LEFT_ARROW))  { moveX = -MOVE_SPEED; facingDirection = -1; } 
  
  characterX += moveX; 
  if (checkCollision(characterX, characterY, HITBOX_W, HITBOX_H)) {
    characterX -= moveX; 
  }

  // --- 2. 物理系統與碰撞偵測 ---
  if (isGliding && velocityY > 0) {
    velocityY += gravity * 0.2; 
    if (velocityY > 2) velocityY = 2; 
  } else {
    velocityY += gravity;    
  }
  
  characterY += velocityY; 
  isOnGround = false; 
  
  if (checkCollision(characterX, characterY, HITBOX_W, HITBOX_H)) {
    if (velocityY > 0) { 
      let bottomTileRow = floor((characterY + HITBOX_H / 2) / TILE_SIZE);
      characterY = bottomTileRow * TILE_SIZE - HITBOX_H / 2 - 0.1; 
      velocityY = 0; 
      isOnGround = true; 
      isGliding = false; 
      isActionLocked = false; 
      isShortJump = false; 
    } else if (velocityY < 0) { 
      let topTileRow = floor((characterY - HITBOX_H / 2) / TILE_SIZE);
      characterY = (topTileRow + 1) * TILE_SIZE + HITBOX_H / 2 + 0.1; 
      velocityY = 0; 
      checkHitTile(characterX, characterY - HITBOX_H / 2 - 2);
    }
  }

  // 跌入深淵死亡重生
  if (characterY > levelMap.length * TILE_SIZE + 200) {
    characterX = 100;
    characterY = 100;
    velocityY = 0;
    isGliding = false;
    isActionLocked = false;
    isShortJump = false;
  }

  // --- 3. 判斷動畫狀態 ---
  const isJumping = !isOnGround; 
  
  if (isActionLocked) {
    animationState = "jump";
  } else {
    if (isGliding) {
      animationState = "falling";
    } else if (isJumping) {
      if (previousAnimation === "jump") {
        animationState = "falling";
      } else if (moveX !== 0) {
        animationState = "jumpMove"; 
      } else {
        if (velocityY > 0) {
          animationState = "falling";
        } else {
          animationState = "jump";
          isActionLocked = true; 
        }
      }
    } else {
      if (moveX !== 0) {
        animationState = "walk";
      } else {
        animationState = "stand";
      }
    }
  }

  let activeSpriteSheet;
  let activeFrameCount;

  if (animationState === "falling") { activeSpriteSheet = fallingSpriteSheet; activeFrameCount = FALLING_FRAME_COUNT; } 
  else if (animationState === "jumpMove") { activeSpriteSheet = jumpMoveSpriteSheet; activeFrameCount = JUMP_MOVE_FRAME_COUNT; } 
  else if (animationState === "jump") { activeSpriteSheet = jumpSpriteSheet; activeFrameCount = JUMP_FRAME_COUNT; } 
  else if (animationState === "walk") { activeSpriteSheet = walkSpriteSheet; activeFrameCount = WALK_FRAME_COUNT; } 
  else { activeSpriteSheet = standSpriteSheet; activeFrameCount = STAND_FRAME_COUNT; }
  
  const CHAR_HEIGHT = 60; 
  let displayScale = CHAR_HEIGHT / activeSpriteSheet.height; 
  
  // ** 關鍵修改：如果是前跳 (jumpMove)，將顯示大小放大 1.25 倍 **
  if (animationState === "jumpMove") {
    displayScale *= 1.25;
  }

  const frameWidth = activeSpriteSheet.width / activeFrameCount; 
  const frameHeight = activeSpriteSheet.height; 

  // --- 4. 動態播放速率控制 ---
  if (animationState !== previousAnimation) { 
    currentFrame = 0; 
    lastFrameTime = millis(); 
    previousAnimation = animationState; 
  } 

  let currentFrameInterval = BASE_FRAME_INTERVAL;
  if (animationState === "jumpMove") {
    if (isShortJump) {
      currentFrameInterval = 25; 
    } else {
      currentFrameInterval = 60; 
    }
  }

  if (millis() - lastFrameTime >= currentFrameInterval) { 
    currentFrame++;
    lastFrameTime = millis(); 
    
    if (animationState === "jump" && currentFrame >= JUMP_FRAME_COUNT) {
      isActionLocked = false;
      animationState = "falling";
      previousAnimation = "jump"; 
      currentFrame = 0;
    } else {
      currentFrame = currentFrame % activeFrameCount;
    }
  }
  currentFrame = min(currentFrame, activeFrameCount - 1);

  // --- 5. 攝影機跟隨 ---
  cameraX = max(0, characterX - width / 3);

  // --- 6. 繪製世界 ---
  push(); 
  let mapOffsetY = height - (levelMap.length * TILE_SIZE);
  translate(-cameraX, mapOffsetY); 

  drawMap();
  updateAndDrawCoins(); 

  push(); 
  translate(characterX, characterY); 
  scale(facingDirection * displayScale, displayScale); 
  image(activeSpriteSheet, 0, 0, frameWidth, frameHeight, currentFrame * frameWidth, 0, frameWidth, frameHeight); 
  pop(); 

  pop(); 

  fill(255);
  textSize(20);
  textAlign(LEFT, TOP);
  text("SCORE: " + score, 20, 20);
} 

function checkHitTile(hitX, hitY) {
  let col = floor(hitX / TILE_SIZE);
  let row = floor(hitY / TILE_SIZE);

  if (row >= 0 && row < levelMap.length && col >= 0 && col < levelMap[0].length) {
    if (levelMap[row][col] === '?') {
      levelMap[row][col] = 'E'; 
      score += 100;             
      
      coins.push({
        x: col * TILE_SIZE + TILE_SIZE / 2,
        y: row * TILE_SIZE,
        vy: -8,       
        life: 20      
      });
    }
  }
}

function updateAndDrawCoins() {
  for (let i = coins.length - 1; i >= 0; i--) {
    let c = coins[i];
    c.y += c.vy; 
    c.vy += 0.6; 
    c.life--;

    fill("#FFD700");
    stroke("#B8860B");
    strokeWeight(2);
    ellipse(c.x, c.y, 16, 22);
    noStroke();

    if (c.life <= 0) {
      coins.splice(i, 1);
    }
  }
}

function drawMap() {
  for (let row = 0; row < levelMap.length; row++) {
    for (let col = 0; col < levelMap[row].length; col++) {
      let tile = levelMap[row][col];
      let tileX = col * TILE_SIZE;
      let tileY = row * TILE_SIZE;

      if (tileX + TILE_SIZE > cameraX && tileX < cameraX + width) {
        if (tile === 'G') {
          fill("#D95D39"); 
          rect(tileX, tileY, TILE_SIZE, TILE_SIZE);
        } else if (tile === 'B') {
          fill("#A33B20"); 
          rect(tileX, tileY, TILE_SIZE, TILE_SIZE);
        } else if (tile === '?') {
          fill("#F2C94C"); 
          rect(tileX, tileY, TILE_SIZE, TILE_SIZE);
        } else if (tile === 'E') {
          fill("#8B5A2B"); 
          rect(tileX, tileY, TILE_SIZE, TILE_SIZE);
        } else if (tile === 'P') {
          fill("#27AE60"); 
          rect(tileX, tileY, TILE_SIZE, TILE_SIZE);
        }
      }
    }
  }
}

function checkCollision(cx, cy, cw, ch) {
  let left = cx - cw / 2;
  let right = cx + cw / 2;
  let top = cy - ch / 2;
  let bottom = cy + ch / 2; 

  let startCol = floor(left / TILE_SIZE);
  let endCol = floor(right / TILE_SIZE);
  let startRow = floor(top / TILE_SIZE);
  let endRow = floor(bottom / TILE_SIZE);

  for (let r = startRow; r <= endRow; r++) {
    for (let c = startCol; c <= endCol; c++) {
      if (r >= 0 && r < levelMap.length && c >= 0 && c < levelMap[0].length) {
        let tile = levelMap[r][c];
        if (tile !== ' ') { 
          return true; 
        }
      }
    }
  }
  return false;
}

function keyPressed() { 
  if (keyCode === 32) { 
    if (isOnGround && !isActionLocked) {
      velocityY = jumpStrength; 
      isShortJump = false; 
    } else if (!isOnGround) {
      isGliding = !isGliding;  
      isActionLocked = false; 
      
      if (isGliding) {
        if (velocityY > 0) {
          velocityY = 0; 
        } else {
          velocityY *= 0.5; 
        }
      }
    }
    return false; 
  } 
} 

function keyReleased() {
  if (keyCode === 32) {
    if (velocityY < 0) {
      velocityY = 0;      
      isShortJump = true; 
    }
  }
}

function windowResized() { 
  resizeCanvas(windowWidth, windowHeight); 
}