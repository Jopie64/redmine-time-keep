import { WorktimeService } from './worktime.service';
import { RedmineService } from './redmine.service';
import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ReactiveFormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { MarkdownModule } from 'ngx-markdown';

import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { MatFormFieldModule, MatSelectModule, MatInputModule, MatSidenavModule,
  MatToolbarModule, MatProgressSpinnerModule, MatIconModule,
  MatButtonModule, MatListModule, MatExpansionModule, MatSliderModule, MatRadioModule } from '@angular/material';

import { AppComponent } from './app.component';
import { ConfigComponent } from './config/config.component';
import { HomeComponent } from './home/home.component';
import { IssueEntryComponent } from './issue-entry/issue-entry.component';
import { DurationComponent } from './duration/duration.component';
import { MainFrameComponent } from './main-frame/main-frame.component';
import { CommitComponent } from './commit/commit.component';

const routes: Routes = [
  { path: 'config', component: ConfigComponent },
  { path: '', component: HomeComponent },
  { path: 'commit/:issue', component: CommitComponent }
];

@NgModule({
  declarations: [
    AppComponent, ConfigComponent, HomeComponent, IssueEntryComponent,
    DurationComponent, MainFrameComponent, CommitComponent
  ],
  imports: [
    BrowserModule,
    BrowserAnimationsModule,
    ReactiveFormsModule,
    RouterModule.forRoot(routes),
    HttpClientModule,
    MarkdownModule.forRoot(),
    MatToolbarModule, MatFormFieldModule, MatSelectModule,
    MatProgressSpinnerModule, MatIconModule, MatButtonModule,
    MatSidenavModule, MatListModule, MatExpansionModule,
    MatInputModule, MatSliderModule, MatRadioModule
  ],
  providers: [RedmineService, WorktimeService],
  bootstrap: [AppComponent]
})
export class AppModule { }
