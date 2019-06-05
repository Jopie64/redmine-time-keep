import { Subject, Observable, Subscription, merge, timer, of } from 'rxjs';
import { Injectable, OnDestroy } from '@angular/core';
import { mapTo, map, scan, shareReplay, switchMap } from 'rxjs/operators';


interface TimerState {
  lastStartTime: number;
  duration: number;
  running: boolean;
}

type TimerActionFn = (current: TimerState) => TimerState;

const toDuration = (beginTime: number) => (new Date()).getTime() - beginTime;

@Injectable()
export class WorktimeService implements OnDestroy {
  private conns = new Subscription();
  private currState: TimerState = { lastStartTime: (new Date()).getTime(), duration: 0, running: false };


  private startCmd$ = new Subject();
  private stopCmd$ = new Subject();
  private subtractTime$ = new Subject<number>();
  private action$ = merge(
    this.startCmd$.pipe(mapTo((timerState: TimerState) => ({ ...timerState,
        lastStartTime: (new Date()).getTime(),
        duration: this.currState.duration,
        running: true }))),
    this.stopCmd$.pipe(mapTo((timerState: TimerState) => timerState.running
        ? { ...timerState,
            duration: timerState.duration + toDuration(timerState.lastStartTime),
            running: false }
        : { ...timerState } )),
    this.subtractTime$.pipe(map(d => (timerState: TimerState) => ({ ...timerState,
        duration: Math.max(timerState.duration - d, 0) }))));

  public timerState$ = this.action$.pipe(
    scan((timerState, timerAction) => timerAction(timerState), this.currState),
    shareReplay(1));

  public isRunning$ = this.timerState$.pipe(map(s => s.running));

  public runningTime$ = this.timerState$.pipe(
      switchMap(({ lastStartTime, duration, running }) => running
        ? timer(0, 1000).pipe(
            map(_ => duration + toDuration(lastStartTime)))
        : of(duration)
      ),
      map(d => Math.floor(d / 1000)));

  constructor() {
    this.conns.add(this.timerState$.subscribe(v => this.currState = { ...v }));
  }

  ngOnDestroy() {
    this.conns.unsubscribe();
  }


  start() {
    this.startCmd$.next();
  }

  stop() {
    this.stopCmd$.next();
  }

  setDuration(newVal: number) {
    this.currState.duration = newVal * 1000;
  }

  subtract(duration: number) {
    this.stop();
    this.subtractTime$.next(duration * 1000);
  }
}
