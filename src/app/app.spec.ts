import { TestBed } from '@angular/core/testing';
import { Auth } from '@angular/fire/auth';
import { provideRouter } from '@angular/router';
import { MessageService } from 'primeng/api';
import { App } from './app';
import { LocationService } from './@core/services/location.service';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        { provide: Auth, useValue: {} },
        { provide: LocationService, useValue: { restoreActiveTrackingIfAny: () => undefined } },
        { provide: MessageService, useValue: {} },
        provideRouter([]),
      ],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('should include the router outlet', () => {
    const fixture = TestBed.createComponent(App);
    expect((fixture.nativeElement as HTMLElement).querySelector('router-outlet')).toBeTruthy();
  });
});
