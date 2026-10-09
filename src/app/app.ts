import { Component, OnInit, inject, signal } from '@angular/core';
import { NavigationCancel, NavigationEnd, NavigationError, NavigationStart, Router, RouterOutlet } from '@angular/router';
import { ToastModule } from 'primeng/toast';
import { Auth, onAuthStateChanged } from '@angular/fire/auth';
import { LocationService } from './@core/services/location.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, ToastModule],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App implements OnInit {
  protected readonly title = signal('wasteMonitor');
  protected readonly isNavigating = signal(false);

  private readonly auth = inject(Auth);
  private readonly locationService = inject(LocationService);

  constructor(router: Router) {
    router.events.subscribe((event) => {
      if (event instanceof NavigationStart) {
        this.isNavigating.set(true);
      } else if (
        event instanceof NavigationEnd ||
        event instanceof NavigationCancel ||
        event instanceof NavigationError
      ) {
        this.isNavigating.set(false);
      }
    });
  }

  ngOnInit(): void {
    onAuthStateChanged(this.auth, (user) => {
      if (user) {
        this.locationService.restoreActiveTrackingIfAny();
      }
    });
  }
}