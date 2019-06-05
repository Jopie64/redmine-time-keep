import { FormBuilder } from '@angular/forms';
import { Observable, Subscription } from 'rxjs';
import { Component, OnInit, Input, OnDestroy, Output, EventEmitter } from '@angular/core';
import { map } from 'rxjs/operators';

const toDuration = tm =>
        parseInt(tm.hours, 10) * 3600
      + parseInt(tm.minutes, 10) * 60
      + parseInt(tm.seconds, 10);


@Component({
  selector: 'app-duration',
  templateUrl: './duration.component.html',
  styleUrls: ['./duration.component.css']
})
export class DurationComponent implements OnInit, OnDestroy {
  @Input()
  public duration$: Observable<number>;

  @Output()
  public change = new EventEmitter<number>();

  private conns = new Subscription();

  public durationForm = this.fb.group({
    hours: [0],
    minutes: [0],
    seconds: [0]
  });


  constructor(private fb: FormBuilder) { }

  ngOnInit() {
    this.conns.add(this.duration$
      .subscribe(dur => {
        // console.log('Duration', dur);
        this.durationForm.setValue({
          hours: Math.floor(dur / 3600),
          minutes: Math.floor((dur % 3600) / 60),
          seconds: dur % 60
        });
      }));
    this.conns.add(this.durationForm.valueChanges.pipe(
      map(toDuration))
      .subscribe(this.change));
  }

  ngOnDestroy() {
    this.conns.unsubscribe();
  }

}
