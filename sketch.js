let brushes = [];
let isBrushMoving = true;
const brushCount = 20;
const segmentCount = 200;
let currentPalette;
let drawingBuffer;

// 基準となるスクリーンサイズ
const BASE_SCREEN_WIDTH = 1920;
const BASE_SCREEN_HEIGHT = 1080;
let screenScaleFactor = 1;

// カラーパレットの定義
const colorPalettes = [
  ["#FF6B6B", "#4ECDC4", "#45B7D1", "#96CEB4", "#FFEEAD"], // 暖色系
  ["#2A2B2A", "#5E4955", "#996888", "#C99DA3", "#C6DDF0"], // モノクローム系
  ["#264653", "#2A9D8F", "#E9C46A", "#F4A261", "#E76F51"], // アースカラー
  ["#D8E2DC", "#FFE5D9", "#FFCAD4", "#F4ACB7", "#9D8189"], // パステル
  ["#03045E", "#023E8A", "#0077B6", "#0096C7", "#00B4D8"], // ブルースケール
];

function timestamp() {
  const d = new Date();
  return `${d.getFullYear()}${(d.getMonth() + 1).toString().padStart(2, "0")}${d
    .getDate()
    .toString()
    .padStart(2, "0")}-${d.getHours().toString().padStart(2, "0")}${d
    .getMinutes()
    .toString()
    .padStart(2, "0")}${d.getSeconds().toString().padStart(2, "0")}-${d
    .getMilliseconds()
    .toString()
    .padStart(3, "0")}`;
}

function setup() {
  createCanvas(windowWidth, windowHeight);
  drawingBuffer = createGraphics(windowWidth, windowHeight);
  drawingBuffer.background(255);
  updateScreenScaleFactor();
  frameRate(60);
  selectRandomPalette();
  initializeBrushes();

  // 初回起動時にランダムなモードを選択
  const initialMode = floor(random(3));
  brushes.forEach((brush) => brush.setMode(initialMode));
  isBrushMoving = true;
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  // 現在のバッファの内容を保存
  let tempBuffer = drawingBuffer.get();
  drawingBuffer = createGraphics(windowWidth, windowHeight);
  drawingBuffer.background(255);
  drawingBuffer.image(tempBuffer, 0, 0);
  updateScreenScaleFactor();
  initializeBrushes();
}

function updateScreenScaleFactor() {
  // 画面の対角線の長さを基準にスケールを計算
  const currentDiagonal = sqrt(sq(windowWidth) + sq(windowHeight));
  const baseDiagonal = sqrt(sq(BASE_SCREEN_WIDTH) + sq(BASE_SCREEN_HEIGHT));
  screenScaleFactor = currentDiagonal / baseDiagonal;
}

function draw() {
  if (isBrushMoving) {
    brushes.forEach((brush) => {
      brush.addToPos(
        random(-brush.step, brush.step),
        random(-brush.step, brush.step)
      );
      brush.updateSegmentsPos().draw(drawingBuffer);
    });
  }
  // メインキャンバスに描画バッファを表示
  image(drawingBuffer, 0, 0);
}

function selectRandomPalette() {
  currentPalette = colorPalettes[floor(random(colorPalettes.length))].map(
    (hex) => {
      const c = color(hex);
      return color(red(c), green(c), blue(c));
    }
  );
}

function initializeBrushes() {
  brushes = [];
  for (let i = 0; i < brushCount; i++) {
    const col = color(random(currentPalette));
    const newBrush = new VineBrush(
      random(width),
      random(height),
      segmentCount,
      col
    );

    // ブラシ初期化時にモードを未設定状態に
    newBrush.currentMode = -1; // 強制的にモード変更をトリガー

    brushes.push(newBrush);
  }
}

class VineBrush {
  constructor(x, y, segmentCounts, col) {
    this.xPos = x;
    this.yPos = y;
    this.segments = segmentCounts;
    this.posArr = new Array(segmentCounts); // 配列を事前に確保
    this.color = col;
    this.cachedColor = {
      r: red(col),
      g: green(col),
      b: blue(col)
    };
    this.r = 0.1;
    this.step = 0;
    this.dist = 0;
    this.strokeWgt = 0;
    this.noiseScale = 0;
    this.fillAlpha = 0;
    this.strokeAlpha = 0;
    this.scale = 0;
    this.currentMode = -1;
    this.tmpVector = createVector(0, 0); // 再利用可能なベクトル

    for (let i = 0; i < this.segments; ++i) {
      this.posArr[i] = createVector(x, y);
    }
  }

  setMode(mode) {
    if (this.currentMode !== mode) {
      this.currentMode = mode;
      switch (mode) {
        case 0:
          this.dist = 1 * screenScaleFactor;
          this.step = 30 * screenScaleFactor;
          this.strokeWgt = 0.5 * screenScaleFactor;
          this.noiseScale = 0.05;
          this.fillAlpha = 10;
          this.strokeAlpha = 20;
          this.scale = 4 * screenScaleFactor;
          break;
        case 1:
          this.dist = 1 * screenScaleFactor;
          this.step = 20 * screenScaleFactor;
          this.strokeWgt = 5 * screenScaleFactor;
          this.noiseScale = 0.5;
          this.fillAlpha = 20;
          this.strokeAlpha = 20;
          this.scale = 20 * screenScaleFactor;
          break;
        case 2:
          this.dist = 1 * screenScaleFactor;
          this.step = 40 * screenScaleFactor;
          this.strokeWgt = 1 * screenScaleFactor;
          this.noiseScale = 0.5;
          this.fillAlpha = 20;
          this.strokeAlpha = 70;
          this.scale = 10 * screenScaleFactor;
          break;
      }
    }
  }

  setPos(x, y) {
    this.xPos = constrain(x, 1, width - 5);
    this.yPos = constrain(y, 1, height - 5);
    return this;
  }

  addToPos(x, y) {
    return this.setPos((this.xPos += x), (this.yPos += y));
  }

  updateSegmentsPos() {
    this.posArr[0].set(this.xPos, this.yPos);
    for (let i = 1; i < this.segments; ++i) {
      if (p5.Vector.dist(this.posArr[i], this.posArr[i - 1]) > this.dist) {
        p5.Vector.sub(this.posArr[i - 1], this.posArr[i], this.tmpVector);
        this.tmpVector.normalize().mult(this.dist);
        this.posArr[i].set(p5.Vector.sub(this.posArr[i - 1], this.tmpVector));
      }
    }
    return this;
  }

  draw(buffer) {
    if (this.currentMode === 2) {
      this.drawPerlinNoiseField(buffer);
    } else {
      this.drawVineMode(buffer);
    }
  }

  drawVineMode(buffer) {
    buffer.push();
    buffer.stroke(
      this.cachedColor.r,
      this.cachedColor.g,
      this.cachedColor.b,
      this.strokeAlpha
    );
    buffer.fill(
      this.cachedColor.r,
      this.cachedColor.g,
      this.cachedColor.b,
      this.fillAlpha
    );
    buffer.strokeWeight(this.strokeWgt);

    for (let i = this.segments - 1; i > -1; --i) {
      buffer.push();
      buffer.translate(this.posArr[i].x, this.posArr[i].y);
      
      if (i > 0) {
        buffer.rotate(
          atan2(
            this.posArr[i].y - this.posArr[i - 1].y,
            this.posArr[i].x - this.posArr[i - 1].x
          )
        );
      }

      let noisyR =
        this.r / 2 +
        noise(
          this.posArr[i].x * this.noiseScale,
          this.posArr[i].y * this.noiseScale
        ) *
          this.scale;
      buffer.ellipse(0, 0, noisyR * 2, noisyR * 2);
      buffer.pop();
    }
    buffer.pop();
  }

  drawPerlinNoiseField(buffer) {
    buffer.push();
    buffer.stroke(
      this.cachedColor.r,
      this.cachedColor.g,
      this.cachedColor.b,
      this.strokeAlpha
    );
    buffer.strokeWeight(0.5 * screenScaleFactor);

    for (let i = 0; i < this.segments - 1; i++) {
      let x = this.posArr[i].x;
      let y = this.posArr[i].y;
      let angle =
        noise(x * this.noiseScale, y * this.noiseScale) * TWO_PI * this.scale;
      let nx = x + cos(angle) * this.step;
      let ny = y + sin(angle) * this.step;
      buffer.line(x, y, nx, ny);
      this.posArr[i + 1].set(nx, ny);
    }
    buffer.pop();
  }
}

function keyPressed() {
  if (key === "s") {
    saveArtwork();
  } else if (key === "0") {
    handleMode(0);
  } else if (key === "1") {
    handleMode(1);
  } else if (key === "2") {
    handleMode(2);
  } else if (key === "3") {
    handleMode(3);
  } else if (key === "4") {
    handleMode(4);
  } else if (key === "h" || key === "H") {
    toggleGUI();
  }
}

function handleMode(mode) {
  switch (mode) {
    case 0:
      selectRandomPalette();
      initializeBrushes();
      isBrushMoving = false;
      drawingBuffer.background(255);
      console.log("リフレッシュしました。1, 2, 3のいずれかを押してください");
      break;
    case 1:
      isBrushMoving = true;
      console.log("つる模様モード");
      brushes.forEach((brush) => brush.setMode(0));
      break;
    case 2:
      isBrushMoving = true;
      console.log("ペイントモード");
      brushes.forEach((brush) => brush.setMode(1));
      break;
    case 3:
      isBrushMoving = true;
      console.log("パーリンノイズフィールドモード");
      brushes.forEach((brush) => brush.setMode(2));
      break;
    case 4:
      drawingBuffer.background(255);
      break;
  }
}

function saveArtwork() {
  saveCanvas(`sketch-${timestamp()}`, "png");
}

function toggleGUI() {
  const controlPanel = document.getElementById("control-panel");
  controlPanel.classList.toggle("hidden");
}
