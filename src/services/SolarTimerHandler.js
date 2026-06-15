class SolarTimerHandler {
  constructor() {
    this._timer = null;
    this._elapsed = 0;
    this.onTick = null;
    this.onCompleted = null;
  }

  start() {
    this._clearTimer();
    this._elapsed = 0;
    this._timer = setInterval(() => {
      this._elapsed += 2;
      if (this.onTick) this.onTick(this._elapsed);
      if (this._elapsed >= 120) {
        if (this.onCompleted) this.onCompleted();
        this._clearTimer();
      }
    }, 2000);
  }

  stop() {
    this._clearTimer();
  }

  _clearTimer() {
    if (this._timer) {
      clearInterval(this._timer);
      this._timer = null;
    }
    this._elapsed = 0;
  }
}

export default new SolarTimerHandler();
