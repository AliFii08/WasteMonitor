import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Auth } from '@angular/fire/auth';

import { CreateComplaints } from './create-complaints';
import { QuejasService } from '../../../../@core/services/quejas.service';
import { NotificationService } from '../../../../@core/services/notification.service';
import { UserService } from '../../../../@core/services/user.service';

describe('CreateComplaints', () => {
  let component: CreateComplaints;
  let fixture: ComponentFixture<CreateComplaints>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CreateComplaints],
      providers: [
        { provide: Auth, useValue: { currentUser: null } },
        { provide: QuejasService, useValue: {} },
        { provide: NotificationService, useValue: {} },
        { provide: UserService, useValue: { currentUserSignal: () => null } },
      ],
    })
    .compileComponents();

    fixture = TestBed.createComponent(CreateComplaints);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
