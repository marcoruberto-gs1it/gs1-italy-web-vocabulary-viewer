import { Component, signal } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';
import { provideHttpClient } from '@angular/common/http';
import { Home } from './app/home/home';

@Component({
  selector: 'app-root',
  template: `
    <app-home></app-home>
  `,
  imports: [Home],
})
export class App {
  name = 'Angular';
  counter = signal(0);
}

bootstrapApplication(App, {
  providers: [provideHttpClient()],
});
