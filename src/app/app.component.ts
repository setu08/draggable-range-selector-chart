import { AfterViewInit, Component, ElementRef, ViewChild } from '@angular/core';
import Chart, { ChartData, ChartOptions, Plugin } from 'chart.js/auto';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
})
export class AppComponent implements AfterViewInit {
  @ViewChild('chartCanvas') chartCanvas!: ElementRef;
  chart: Chart | null = null;
  verticalLineX1: number = 0; // Initial position of the first vertical line
  verticalLineX2: number = 0; // Initial position of the second vertical line
  isDragging1: boolean = false;
  isDragging2: boolean = false;
  offsetX1: number = 0;
  offsetX2: number = 0;

  ngAfterViewInit(): void {
    this.initializeChart();
  }

  initializeChart(): void {
    // Getting the 2D rendering context of the canvas
    const ctx = this.chartCanvas.nativeElement.getContext('2d');
    if (!ctx) return;

    //chartjs chart options, data and plugins
    const chartOptions: ChartOptions = this.createChartOptions();
    const chartData: ChartData = this.createChartData();
    this.chart = new Chart(ctx, {
      type: 'line',
      data: chartData,
      options: chartOptions,
      plugins: this.createChartPlugins(),
    });

    // Setting the initial positions for the vertical lines
    this.setInitialLinePositions();

    // Setting up event listeners for mouse drag
    this.setupEventListeners();
  }

  createChartOptions(): ChartOptions {
    return {
      scales: {
        x: { type: 'category', position: 'bottom' },
        y: { beginAtZero: true },
      },
      plugins: {
        legend: {
          display: false,
        },
        tooltip: {
          enabled: false,
        },
      },
      interaction: { intersect: false },
    };
  }

  createChartData(): ChartData {
    return {
      labels: ['January', 'February', 'March', 'April', 'May', 'June', 'July'],
      datasets: [
        {
          data: [12, 19, 3, 5, 2, 3, 10],
          borderColor: 'blue',
          borderWidth: 1,
          fill: false,
        },
      ],
    };
  }

  createChartPlugins(): Plugin[] {
    return [
      {
        id: 'rangeSelectorPlugin',
        beforeDraw: (chart) => {
          const ctx = chart.ctx;
          if (!ctx) return;

          const xAxis = chart?.scales['x'];
          const yAxis = chart?.scales['y'];
          if (!xAxis || !yAxis) return;

          this.drawRange(ctx, xAxis, yAxis);
          this.drawVerticalLine(ctx, this.verticalLineX1, yAxis);
          this.drawVerticalLine(ctx, this.verticalLineX2, yAxis);
        },
      },
    ];
  }

  //drawing the range between the vertical lines
  drawRange(ctx: CanvasRenderingContext2D, xAxis: any, yAxis: any): void {
    const rangeStart = Math.min(this.verticalLineX1, this.verticalLineX2);
    const rangeEnd = Math.max(this.verticalLineX1, this.verticalLineX2);
    ctx.fillStyle = 'rgba(0, 0, 255, 0.2)';
    ctx.fillRect(
      rangeStart,
      yAxis.top,
      rangeEnd - rangeStart,
      yAxis.bottom - yAxis.top
    );
  }

  //drawing a vertical line on the chart
  drawVerticalLine(ctx: CanvasRenderingContext2D, x: number, yAxis: any): void {
    ctx.beginPath();
    ctx.strokeStyle = 'red';
    ctx.moveTo(x, yAxis.top);
    ctx.lineTo(x, yAxis.bottom);
    ctx.stroke();
  }

  //setting the initial posiiton of chart inside chart graph
  setInitialLinePositions(): void {
    const chartRect = this.chartCanvas.nativeElement.getBoundingClientRect();
    const chartWidth = chartRect.width;
    const spacePercentage = 0.2;
    const spaceBetweenLines = chartWidth * spacePercentage;
    const midpoint = chartWidth / 2;
    this.verticalLineX1 = midpoint - spaceBetweenLines / 2;
    this.verticalLineX2 = midpoint + spaceBetweenLines / 2;
  }

  setupEventListeners(): void {
    const canvas = this.chart?.canvas;
    if (!canvas) return;

    canvas.addEventListener('mousedown', this.onMouseDown.bind(this));
    canvas.addEventListener('mousemove', this.onMouseMove.bind(this));
    canvas.addEventListener('mouseup', this.onMouseUp.bind(this));
  }

  onMouseDown(event: MouseEvent): void {
    const canvas = this.chart?.canvas;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const distanceToLeftLine = Math.abs(x - this.verticalLineX1);
    const distanceToRightLine = Math.abs(x - this.verticalLineX2);
    if (distanceToLeftLine < distanceToRightLine) {
      this.offsetX1 = x - this.verticalLineX1;
      this.isDragging1 = true;
    } else {
      this.offsetX2 = x - this.verticalLineX2;
      this.isDragging2 = true;
    }
  }

  onMouseMove(event: MouseEvent): void {
    const canvas = this.chart?.canvas;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    if (this.isDragging1) {
      this.verticalLineX1 = x - this.offsetX1;
      if (this.chart) {
        this.chart.update();
      }
    } else if (this.isDragging2) {
      this.verticalLineX2 = x - this.offsetX2;
      if (this.chart) {
        this.chart.update();
      }
    } else {
      const rangeStart = Math.min(this.verticalLineX1, this.verticalLineX2);
      const rangeEnd = Math.max(this.verticalLineX1, this.verticalLineX2);
      if (x >= rangeStart && x <= rangeEnd) {
        this.updateTooltip(event, x, rangeStart, rangeEnd);
      } else {
        this.hideTooltip();
      }
    }
  }

  onMouseUp(): void {
    this.isDragging1 = false;
    this.isDragging2 = false;
  }

  updateTooltip(
    event: MouseEvent,
    mouseX: number,
    rangeStart: number,
    rangeEnd: number
  ): void {
    const canvas = this.chart?.canvas;
    const xAxis = this.chart?.scales['x'];
    const yAxis = this.chart?.scales['y'];
    if (!canvas || !xAxis || !yAxis) return;

    const index = xAxis.getValueForPixel(mouseX) as any;
    const distanceToLeftLine = Math.abs(mouseX - rangeStart);
    const distanceToRightLine = Math.abs(mouseX - rangeEnd);

    const tooltip = document.getElementById('customTooltip');
    if (!tooltip) return;

    const tooltipContent = (lineType: string) => {
      const xValue = xAxis.getLabelForValue(index);
      const yValue = this.chart?.data.datasets?.[0]?.data?.[index];
      return `${lineType} Selector<br>x: ${xValue}<br>y: ${yValue}`;
    };

    if (distanceToLeftLine < distanceToRightLine) {
      tooltip.innerHTML = tooltipContent('Left');
      this.displayTooltip(tooltip, event.clientX, event.clientY);
    } else {
      tooltip.innerHTML = tooltipContent('Right');
      this.displayTooltip(tooltip, event.clientX, event.clientY);
    }
  }

  hideTooltip(): void {
    const tooltip = document.getElementById('customTooltip');
    if (tooltip) {
      tooltip.style.display = 'none';
    }
  }

  displayTooltip(tooltip: HTMLElement, clientX: number, clientY: number): void {
    tooltip.style.display = 'block';
    tooltip.style.left = clientX + 10 + 'px';
    tooltip.style.top = clientY - 20 + 'px';
  }
}
