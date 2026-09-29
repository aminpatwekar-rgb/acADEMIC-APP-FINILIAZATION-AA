export type CanvasTool = 'pen' | 'highlighter' | 'eraser' | 'line' | 'rect' | 'circle' | 'text';
export type PaperPattern = 'blank' | 'ruled' | 'grid' | 'dotted';

export interface CanvasPoint {
  x: number;
  y: number;
  pressure?: number;
}

export interface CanvasStroke {
  id: string;
  tool: CanvasTool;
  color: string;
  width: number;
  points: CanvasPoint[];
  text?: string;
}

export class NotebookEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private strokes: CanvasStroke[] = [];
  private undoStack: CanvasStroke[][] = [];
  private redoStack: CanvasStroke[][] = [];
  private currentStroke: CanvasStroke | null = null;
  private activeTool: CanvasTool = 'pen';
  private activeColor: string = '#1e293b';
  private activeWidth: number = 3;
  private paperPattern: PaperPattern = 'ruled';
  private backgroundImage: HTMLImageElement | null = null;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Could not get 2D rendering context');
    this.ctx = context;
    this.setupResolution();
  }

  public setupResolution() {
    const dpr = window.devicePixelRatio || 1;
    const rect = this.canvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;

    this.canvas.width = rect.width * dpr;
    this.canvas.height = rect.height * dpr;
    this.ctx.scale(dpr, dpr);
    this.render();
  }

  public setTool(tool: CanvasTool) {
    this.activeTool = tool;
  }

  public setColor(color: string) {
    this.activeColor = color;
  }

  public setWidth(width: number) {
    this.activeWidth = width;
  }

  public setPattern(pattern: PaperPattern) {
    this.paperPattern = pattern;
    this.render();
  }

  public setBackgroundImage(imageSrc: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        this.backgroundImage = img;
        this.render();
        resolve();
      };
      img.onerror = reject;
      img.src = imageSrc;
    });
  }

  public clearBackgroundImage() {
    this.backgroundImage = null;
    this.render();
  }

  public startStroke(x: number, y: number, pressure: number = 0.5) {
    this.saveState();
    this.currentStroke = {
      id: Math.random().toString(36).substring(2, 9),
      tool: this.activeTool,
      color: this.activeColor,
      width: this.activeWidth,
      points: [{ x, y, pressure }],
    };
    this.render();
  }

  public addPoint(x: number, y: number, pressure: number = 0.5) {
    if (!this.currentStroke) return;
    this.currentStroke.points.push({ x, y, pressure });
    this.render();
  }

  public endStroke() {
    if (this.currentStroke && this.currentStroke.points.length > 0) {
      this.strokes.push(this.currentStroke);
      this.currentStroke = null;
      this.redoStack = []; // Clear redo on new action
      this.render();
    }
  }

  public addText(text: string, x: number, y: number) {
    this.saveState();
    this.strokes.push({
      id: Math.random().toString(36).substring(2, 9),
      tool: 'text',
      color: this.activeColor,
      width: this.activeWidth,
      points: [{ x, y }],
      text,
    });
    this.render();
  }

  private saveState() {
    this.undoStack.push(JSON.parse(JSON.stringify(this.strokes)));
    if (this.undoStack.length > 30) this.undoStack.shift();
  }

  public undo() {
    if (this.undoStack.length === 0) return;
    this.redoStack.push(JSON.parse(JSON.stringify(this.strokes)));
    this.strokes = this.undoStack.pop() || [];
    this.render();
  }

  public redo() {
    if (this.redoStack.length === 0) return;
    this.undoStack.push(JSON.parse(JSON.stringify(this.strokes)));
    this.strokes = this.redoStack.pop() || [];
    this.render();
  }

  public clear() {
    if (this.strokes.length === 0) return;
    this.saveState();
    this.strokes = [];
    this.render();
  }

  public getStrokes(): CanvasStroke[] {
    return this.strokes;
  }

  public setStrokes(strokes: CanvasStroke[]) {
    this.strokes = strokes;
    this.render();
  }

  public render() {
    const rect = this.canvas.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;

    // Reset transform & clear
    this.ctx.save();
    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.ctx.restore();

    // 1. Draw Paper Background
    this.drawBackground(width, height);

    // 2. Draw Background Image (Uploaded scan or PDF page)
    if (this.backgroundImage) {
      this.ctx.save();
      const imgRatio = this.backgroundImage.width / this.backgroundImage.height;
      const canvasRatio = width / height;
      let drawW = width;
      let drawH = height;
      let drawX = 0;
      let drawY = 0;

      if (imgRatio > canvasRatio) {
        drawH = width / imgRatio;
        drawY = (height - drawH) / 2;
      } else {
        drawW = height * imgRatio;
        drawX = (width - drawW) / 2;
      }

      this.ctx.drawImage(this.backgroundImage, drawX, drawY, drawW, drawH);
      this.ctx.restore();
    }

    // 3. Draw Completed Strokes
    for (const stroke of this.strokes) {
      this.renderSingleStroke(stroke);
    }

    // 4. Draw Current in-progress Stroke
    if (this.currentStroke) {
      this.renderSingleStroke(this.currentStroke);
    }
  }

  private drawBackground(width: number, height: number) {
    this.ctx.save();
    // Base sheet color: crisp white or warm parchment
    this.ctx.fillStyle = '#ffffff';
    this.ctx.fillRect(0, 0, width, height);

    if (this.paperPattern === 'ruled') {
      const lineSpacing = 32;
      this.ctx.strokeStyle = '#e2e8f0';
      this.ctx.lineWidth = 1;

      // Vertical margin line in light red/coral
      this.ctx.beginPath();
      this.ctx.moveTo(60, 0);
      this.ctx.lineTo(60, height);
      this.ctx.strokeStyle = '#fca5a5';
      this.ctx.stroke();

      // Horizontal lines
      this.ctx.strokeStyle = '#e2e8f0';
      for (let y = lineSpacing * 2; y < height; y += lineSpacing) {
        this.ctx.beginPath();
        this.ctx.moveTo(0, y);
        this.ctx.lineTo(width, y);
        this.ctx.stroke();
      }
    } else if (this.paperPattern === 'grid') {
      const gridSize = 24;
      this.ctx.strokeStyle = '#e2e8f0';
      this.ctx.lineWidth = 0.8;
      for (let x = gridSize; x < width; x += gridSize) {
        this.ctx.beginPath();
        this.ctx.moveTo(x, 0);
        this.ctx.lineTo(x, height);
        this.ctx.stroke();
      }
      for (let y = gridSize; y < height; y += gridSize) {
        this.ctx.beginPath();
        this.ctx.moveTo(0, y);
        this.ctx.lineTo(width, y);
        this.ctx.stroke();
      }
    } else if (this.paperPattern === 'dotted') {
      const dotSpacing = 24;
      this.ctx.fillStyle = '#cbd5e1';
      for (let x = dotSpacing; x < width; x += dotSpacing) {
        for (let y = dotSpacing; y < height; y += dotSpacing) {
          this.ctx.beginPath();
          this.ctx.arc(x, y, 1.2, 0, Math.PI * 2);
          this.ctx.fill();
        }
      }
    }

    this.ctx.restore();
  }

  private renderSingleStroke(stroke: CanvasStroke) {
    if (stroke.points.length === 0) return;

    this.ctx.save();

    if (stroke.tool === 'highlighter') {
      this.ctx.globalAlpha = 0.35;
      this.ctx.strokeStyle = stroke.color;
      this.ctx.lineWidth = stroke.width * 4;
      this.ctx.lineCap = 'square';
      this.ctx.lineJoin = 'miter';
    } else if (stroke.tool === 'eraser') {
      this.ctx.globalCompositeOperation = 'destination-out';
      this.ctx.lineWidth = stroke.width * 5;
      this.ctx.lineCap = 'round';
      this.ctx.lineJoin = 'round';
    } else if (stroke.tool === 'text' && stroke.text) {
      this.ctx.font = '16px ui-sans-serif, system-ui, sans-serif';
      this.ctx.fillStyle = stroke.color;
      const pt = stroke.points[0];
      this.ctx.fillText(stroke.text, pt.x, pt.y);
      this.ctx.restore();
      return;
    } else {
      // Pen & standard lines
      this.ctx.strokeStyle = stroke.color;
      this.ctx.lineWidth = stroke.width;
      this.ctx.lineCap = 'round';
      this.ctx.lineJoin = 'round';
    }

    if (stroke.tool === 'line') {
      const start = stroke.points[0];
      const end = stroke.points[stroke.points.length - 1];
      this.ctx.beginPath();
      this.ctx.moveTo(start.x, start.y);
      this.ctx.lineTo(end.x, end.y);
      this.ctx.stroke();
      this.ctx.restore();
      return;
    }

    if (stroke.tool === 'rect') {
      const start = stroke.points[0];
      const end = stroke.points[stroke.points.length - 1];
      this.ctx.strokeRect(start.x, start.y, end.x - start.x, end.y - start.y);
      this.ctx.restore();
      return;
    }

    if (stroke.tool === 'circle') {
      const start = stroke.points[0];
      const end = stroke.points[stroke.points.length - 1];
      const radius = Math.hypot(end.x - start.x, end.y - start.y);
      this.ctx.beginPath();
      this.ctx.arc(start.x, start.y, radius, 0, Math.PI * 2);
      this.ctx.stroke();
      this.ctx.restore();
      return;
    }

    // Freehand drawing with quadratic curve smoothing
    const pts = stroke.points;
    if (pts.length === 1) {
      this.ctx.beginPath();
      this.ctx.arc(pts[0].x, pts[0].y, stroke.width / 2, 0, Math.PI * 2);
      this.ctx.fillStyle = stroke.color;
      this.ctx.fill();
    } else {
      this.ctx.beginPath();
      this.ctx.moveTo(pts[0].x, pts[0].y);

      for (let i = 1; i < pts.length - 1; i++) {
        const xc = (pts[i].x + pts[i + 1].x) / 2;
        const yc = (pts[i].y + pts[i + 1].y) / 2;
        this.ctx.quadraticCurveTo(pts[i].x, pts[i].y, xc, yc);
      }

      this.ctx.lineTo(pts[pts.length - 1].x, pts[pts.length - 1].y);
      this.ctx.stroke();
    }

    this.ctx.restore();
  }

  public toDataURL(type: string = 'image/png'): string {
    return this.canvas.toDataURL(type);
  }

  public async toBlob(): Promise<Blob | null> {
    return new Promise(resolve => this.canvas.toBlob(resolve, 'image/png'));
  }
}
