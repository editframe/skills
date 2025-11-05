export class PIDController {
  private readonly kp: number;
  private readonly ki: number;
  private readonly kd: number;

  private target: number;
  private integral: number;
  private lastError: number;

  constructor(kp: number, ki: number, kd: number) {
    this.kp = kp;
    this.ki = ki;
    this.kd = kd;

    this.target = 0;
    this.integral = 0;
    this.lastError = 0;
  }

  setTarget(target: number): void {
    this.target = target;
    this.integral = 0; // Reset integral when the target changes
  }

  calculate(currentValue: number): number {
    const error = this.target - currentValue;

    this.integral += error;
    const derivative = error - this.lastError;

    const output =
      this.kp * error + this.ki * this.integral + this.kd * derivative;

    this.lastError = error;

    return output;
  }
}
