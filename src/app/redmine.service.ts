import { IssueParams } from './redmine.service';
import { HttpHeaders, HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Injectable } from '@angular/core';
import { logObs } from './log.service';

export interface IdAndName {
  id: number;
  name: string;
  is_default?: boolean;
}
export interface Issue {
  id: number;
  description: string;
  subject: string;
  tracker: IdAndName;
}

export interface IssueParams {
  offset?: number;
  limit?: number;
  sort?: boolean;

  issue_id?: number;
}

export interface SearchResult {
  datetime: Date;
  description: string;
  id: number;
  title: string;
  type: string;
  url: string;
}

export interface SearchParams {
  q: string;
}

export interface RedmineApi {
  getIssues(params: IssueParams): Observable<Issue[]>;
//  test(cmd: string, arg: any): Observable<string>;
//  search(params: SearchParams): Observable<SearchResult[]>;
  getEnumeration(enumeration: string): Observable<IdAndName[]>;
  run(query: Query): Observable<any>;

  createTimeEntry(timeEntry: TimeEntry): Observable<void>;
}


export interface RedmineConfig {
  url: string;
  username: string;
  password: string;
}

export interface TimeEntry {
  issue_id: number;    // or project_id (only one is required): the issue id or project id to log time on
  spent_on?: Date;     // the date the time was spent (default to the current date)
  hours: number;       // (required): the number of spent hours
  activity_id: number; // the id of the time activity. This parameter is required unless a default activity is defined in Redmine.
  comments: string;    // short description for the entry (255 characters max)
}

export const addFilter = (params: any, name: string, operation: string, value?: string) => {
  const ret = { ...params };
  let filter = ret['f[]'];
  if (!filter) {
    filter = name;
  } else if (filter instanceof Array) {
    filter = [...filter, name];
  } else {
    filter = [filter, name];
  }
  ret['f[]'] = filter;
  ret[`op[${name}]`] = operation;
  if (value) {
    ret[`v[${name}][]`] = value;
  }
  return ret;
};

export class Query {
  constructor(public cmd: string, public params = {}) {
  }

  public addFilter(name: string, operation: string, value?: string) {
    this.params = addFilter(this.params, name, operation, value);
    return this;
  }
}

export const makeQuery = (cmd: string, params?: any) => new Query(cmd, params);

const makeUriComponent = (key, value) => encodeURIComponent(key) + '=' + encodeURIComponent(value);

const toRedmineQuery = (cmd: string, params?: any) => {
  let str = '';
  if (!params) {
    return cmd + '.json';
  } else if (typeof params === 'string') {
    return cmd + '.json?' + params;
  }
  // tslint:disable-next-line:forin
  for (const key in params) {
    if (str === '') {
        str += '?';
      } else {
          str += '&';
      }
      const value = params[key];
      if (value instanceof Array) {
        str += value.reduce((acc, v) => (acc ? acc + '&' : '') + makeUriComponent(key, v), null);
      } else {
        str += makeUriComponent(key, value);
      }
    }
  return `${cmd}.json${str}`;
};

interface QueryRunner {
  get: <T>(query: Query) => Observable<T>;
  post: (query: Query) => Observable<any>;  
}

const makeQueryRunner = (http: HttpClient, cred: RedmineConfig): QueryRunner => {
  const auth = 'Basic ' + btoa(cred.username + ':' + cred.password);
  const headers = new HttpHeaders()
    .set('Content-Type', 'application/json')
    .set('authorization', auth);
  return {
    get: <T>(query: Query): Observable<T> => {
      const queryUrl = toRedmineQuery(query.cmd, query.params);
      console.log('Running get query', queryUrl, query);
      return http.get<T>(cred.url + '/' + queryUrl, { headers })
        .do(logObs('Query ' + queryUrl));
    },
    post: (query: Query): Observable<any> => {
      const queryUrl = toRedmineQuery(query.cmd);
      console.log('Running post query', queryUrl, query);
      return http.post(cred.url + '/' + queryUrl, query.params, { headers })
        .do(logObs('Query ' + queryUrl));
    }
  };
};

@Injectable()
export class RedmineService {

  runQuery: QueryRunner;

  constructor(private http: HttpClient) {
    const cred = localStorage.getItem('credentials');
    if (cred) {
      this.setConfig(JSON.parse(cred));
    }
  }

  public setConfig(config: RedmineConfig) {
    this.runQuery = makeQueryRunner(this.http, config);
  }

  getApi(config: RedmineConfig = null): RedmineApi {
    const runQuery = config ? makeQueryRunner(this.http, config) : this.runQuery;
    if (!runQuery) {
      throw new Error('Redmine not configured');
    }
    return {
      getIssues: (params: IssueParams) => runQuery.get<any>(makeQuery('issues', params)).do(logObs('***getIssues')).map(v => v.issues),
//      test: (cmd: string, arg: any) => runQuery<any>(cmd, arg).map(v => JSON.stringify(v)).catch(e => Observable.of(JSON.stringify(e))),
//      search: (params: SearchParams) => runQuery<any>('search', params).map(v => v.results)
      getEnumeration: (enumeration: string) => runQuery.get<any>(makeQuery('enumerations/' + enumeration))
                        .map(v => v[enumeration] as IdAndName[]), // Observable<IdAndName[]>,
      run: (query: Query) => runQuery.get<any>(query),
      createTimeEntry: (timeEntry: TimeEntry) => runQuery.post(makeQuery('time_entries', { 'time_entry': timeEntry }))
    };
  }
}
