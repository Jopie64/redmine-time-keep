import { RedmineService } from './../redmine.service';
import { Observable, Subject } from 'rxjs/Rx';
import { Component, OnInit, Input, EventEmitter, Output } from '@angular/core';
import { IssueHead } from '../issue-head';

@Component({
  selector: 'app-issue-entry',
  templateUrl: './issue-entry.component.html',
  styleUrls: ['./issue-entry.component.css']
})
export class IssueEntryComponent implements OnInit {

  @Input() head: IssueHead;
  @Output() onSelect = new EventEmitter();

  public open$ = new Subject<void>();

  public description$ = this.open$.asObservable()
    .switchMap(_ => this.redmine.getApi().getIssues({issue_id: this.head.id}))
    .map(r => r.length > 0 ? r[0].description : '')
    .startWith('');

  constructor(private redmine: RedmineService) { }

  ngOnInit() {
  }
}
