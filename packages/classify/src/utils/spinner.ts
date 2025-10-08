/**
 * Simple console spinner for progress indication
 * @module
 */

export class Spinner {
  private _text: string;
  private isRunning = false;

  constructor(initialText = "") {
    this._text = initialText;
  }

  start(): void {
    this.isRunning = true;
    if (this._text) {
      console.log(this._text);
    }
  }

  stop(): void {
    this.isRunning = false;
  }

  set text(value: string) {
    this._text = value;
    if (this.isRunning && value) {
      console.log(value);
    }
  }

  get text(): string {
    return this._text;
  }
}
