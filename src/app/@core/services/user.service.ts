import { inject, Injectable, signal } from '@angular/core';
import { environment } from '../../../environments/environment.development';
import { HttpClient } from '@angular/common/http';
import { catchError, map, Observable, of, Subject, tap, finalize, shareReplay } from 'rxjs';
import { User } from '../interfaces/user.model';

@Injectable({
  providedIn: 'root',
})
export class UserService {

  //currentUserSignal = signal<User | null>(null);
  currentUserSignal = signal<User | null>(null);


  currentUser(): Observable<User | null> {
    return of(this.currentUserSignal());
  }
    
}
