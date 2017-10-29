import { obsLog } from './../log.service';
import { FormControl, FormBuilder } from '@angular/forms';
import { Component, OnInit, OnDestroy } from '@angular/core';
import { RedmineApi, RedmineService, SearchResult, addFilter, makeQuery, Query } from './../redmine.service';
import { ReplaySubject, Observable, Subject, BehaviorSubject, Subscription } from 'rxjs/Rx';
import { HttpErrorResponse } from '@angular/common/http';

export interface IssueHead {
  id: number;
  tracker: string;
  title: string;
}

interface TimerState {
  lastStartTime: number;
  duration: number;
  running: boolean;
}

type TimerActionFn = (current: TimerState) => TimerState;

const toDuration = (beginTime: number) => (new Date()).getTime() - beginTime;

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css']
})
export class HomeComponent implements OnInit, OnDestroy {

  private redmine$ = new ReplaySubject<RedmineApi>(1);
  private conns = new Subscription();

  public search = this.fb.group({
      search: ['']
    });

  public durationForm = this.fb.group({
    hours: [0],
    minutes: [0],
    seconds: [0]
  });

  public timerStartCmd$ = new Subject();
  public timerStopCmd$ = new Subject();

  public timerAction$ = Observable.merge(
    this.timerStartCmd$.mapTo((timerState: TimerState) => ({ ...timerState,
      lastStartTime: (new Date()).getTime(),
      duration: this.getDuration() * 1000,
      running: true })),
    this.timerStopCmd$.mapTo((timerState: TimerState) => timerState.running
      ? { ...timerState,
          duration: timerState.duration + toDuration(timerState.lastStartTime),
          running: false }
      : { ...timerState}));

  public runTime$ = this.timerAction$
    .scan((timerState, timerAction) => timerAction(timerState),
      { lastStartTime: (new Date()).getTime(), duration: 0, running: false } as TimerState)
    .shareReplay(1);

  public isRunning$ = this.runTime$.map(s => s.running);

  public runningTime$ = this.runTime$
      .switchMap(({ lastStartTime, duration, running }) => running
        ? Observable.timer(0, 1000)
            .map(_ => duration + toDuration(lastStartTime))
        : Observable.of(duration))
      .map(d => Math.floor(d / 1000));




  public test$ = this.redmine$
    .switchMap(r => this.search.valueChanges
      .debounceTime(500)
      .map(g => g.search as string)
      .switchMap(s => r.run(makeQuery('time_entries')
        .addFilter('user_id', '=', 'me'))))
      .subscribe(obsLog('test'));


  public issuesOrError$ = this.search.valueChanges
    .map(g => g.search as string)
    .debounceTime(500)
    .startWith('')
    .switchMap(s => this.redmine$
      .switchMap(r => r.run(this.makeIssueQuery(s))
        .map(i => i.issues.map(j => ({ id: j.id, tracker: j.tracker.name, title: j.subject}) as IssueHead))
        .catch(e => e instanceof HttpErrorResponse
          ? Observable.of(e.message)
          : Observable.of('' + e))))
    .shareReplay(1);
  public issues$ = this.issuesOrError$
    .filter(v => v instanceof Array)
    .map(v => v as SearchResult[]);
  public error$ = this.issuesOrError$
    .map(v => !(v instanceof Array) ? v : '');

  constructor(private redmineService: RedmineService, private fb: FormBuilder) {
    this.refresh();
    this.conns.add(this.runningTime$
      .subscribe(dur => {
        // console.log('Duration', dur);
        this.durationForm.setValue({
          hours: Math.floor(dur / 3600),
          minutes: Math.floor((dur % 3600) / 60),
          seconds: dur % 60
        });
      }));
  }

  refresh() {
    this.redmine$.next(this.redmineService.getApi());
  }

  getDuration() {
    return parseInt(this.durationForm.value.hours, 10) * 3600
      + parseInt(this.durationForm.value.minutes, 10) * 60
      + parseInt(this.durationForm.value.seconds, 10);
  }

  makeIssueQuery(search: string): Query {
    const ret = makeQuery('issues');
    if (search.length === 0) {
      ret
        .addFilter('assigned_to_id', '=', 'me')
        .addFilter('status_id', 'o');
    } else if (isNaN(search as any)) {
      ret
        .addFilter('assigned_to_id', '=', 'me')
        .addFilter('status_id', 'o')
        .addFilter('subject', '~', search);
    } else {
      ret.params = {
        issue_id: search
      };
    }

    return ret;
  }

  ngOnInit() {
    this.refresh();
  }

  ngOnDestroy() {
    this.conns.unsubscribe();
  }
}
