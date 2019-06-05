import { RedmineService } from './../redmine.service';
import { Component } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { Observable, of, concat } from 'rxjs';
import { switchMap, map, shareReplay, mapTo, tap, catchError } from 'rxjs/operators';
import { HttpClient, HttpHeaders, HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';

type HttpStatus = 0 | 1 | 2 | string;

@Component({
  selector: 'app-config',
  templateUrl: './config.component.html',
  styleUrls: ['./config.component.css']
})
export class ConfigComponent {
  credentials = this.fb.group({
    url: ['', Validators.required],
    username: ['', Validators.required],
    password: ['', Validators.required],
    passwordConfirm: ['', [Validators.required, _ => this.passEqual()]]
  });

  httpStatus$ = this.credentials.statusChanges.pipe(
    switchMap((v): Observable<HttpStatus> => v !== 'VALID'
      ? of(0)
      : concat(
          of(1 as HttpStatus),
          this.testRedmineLogin(this.credentials.value).pipe(map(t => t === '' ? 2  as HttpStatus : t as HttpStatus)))),
    shareReplay(1));

  showSpinner$ = this.httpStatus$.pipe(map(v => v === 1));
  showContinue$ = this.httpStatus$.pipe(map(v => v === 2));
  showError$ = this.httpStatus$.pipe(map(v => typeof v === 'string' ? v : null));

  passEqual() {
    if (!this || !this.credentials) {
      return null;
    }
    if (this.credentials.controls.password.value === this.credentials.controls.passwordConfirm.value) {
      return null;
    }
    return { passEqual: true };
  }

  testRedmineLogin(cred: any): Observable<string> {
    const auth = 'Basic ' + btoa(cred.username + ':' + cred.password);
    const headers = new HttpHeaders()
      .set('Content-Type', 'application/json')
      .set('authorization', auth);
    return this.http.get(cred.url + '/issues.json?limit=1', { headers }).pipe(
      mapTo(''),
      tap(null, v => console.log('Http Error', v)),
      catchError(e => e instanceof HttpErrorResponse
        ? of(e.message)
        : of('' + e)
      ));
  }

  constructor(private fb: FormBuilder, private http: HttpClient, private router: Router, private redmine: RedmineService) {
    const creds = localStorage.getItem('credentials');
    if (creds) {
      try {
        this.credentials.setValue(JSON.parse(creds));
      } catch (e) {
        console.log(`Stored values were incorrect.`, e);
      }
    }
  }

  save() {
    localStorage.setItem('credentials', JSON.stringify(this.credentials.value));
    this.redmine.setConfig(this.credentials.value);
    this.router.navigate(['/']);
  }
}
