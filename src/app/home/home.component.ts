import { Router } from '@angular/router';
import { FormBuilder } from '@angular/forms';
import { Component, OnInit } from '@angular/core';
import { RedmineApi, RedmineService, SearchResult, addFilter, makeQuery, Query } from './../redmine.service';
import { ReplaySubject, Observable, Subject, BehaviorSubject, Subscription, of } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { IssueHead } from '../issue-head';
import { map, debounceTime, startWith, switchMap, mapTo, catchError, shareReplay, filter } from 'rxjs/operators';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css']
})
export class HomeComponent implements OnInit {

  private redmine$ = new ReplaySubject<RedmineApi>(1);

  public search = this.fb.group({
      search: ['']
    });

  public searchAgain$ = new Subject();
  public showCancel$ = this.search.valueChanges.pipe(map(v => v.search.length !== 0));

/*
  public test$ = this.redmine$
    .switchMap(r => this.search.valueChanges
      .debounceTime(500)
      .map(g => g.search as string)
      .switchMap(s => r.run(makeQuery('time_entries')
        .addFilter('user_id', '=', 'me'))))
      .subscribe(logObs('test'));
*/

  public issuesOrError$ = this.search.valueChanges.pipe(
    map(g => g.search as string),
    debounceTime(500),
    startWith(''),
    switchMap(v => this.searchAgain$.pipe(mapTo(v), startWith(v))),
    switchMap(s => this.redmine$.pipe(
      switchMap(r => r.run(this.makeIssueQuery(s)).pipe(
        map(i => i.issues.map(j => ({ id: j.id, tracker: j.tracker.name, title: j.subject}) as IssueHead)),
        catchError(e => e instanceof HttpErrorResponse
          ? of(e.message)
          : of('' + e))
      ))
    )),
    shareReplay(1));
  public issues$ = this.issuesOrError$.pipe(
    filter(v => v instanceof Array),
    map(v => v as SearchResult[]));
  public error$ = this.issuesOrError$.pipe(
    map(v => !(v instanceof Array) ? v : ''));

  constructor(private redmineService: RedmineService, private fb: FormBuilder, private router: Router) {
    this.refresh();
  }

  refresh() {
    try {
      this.redmine$.next(this.redmineService.getApi());
    } catch (e) {
      console.log('Redmine not configured. Go to config page.', e);
      this.router.navigate(['/config']);
    }
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

  clearSearch() {
    this.search.setValue({search: ''});
  }

  ngOnInit() {
    this.refresh();
  }

  commit(issue: IssueHead) {
    this.router.navigate(['/commit', issue.id]);
  }
}
