import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NotificationPopover } from './notification-popover';

describe('NotificationPopover', () => {
  let component: NotificationPopover;
  let fixture: ComponentFixture<NotificationPopover>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NotificationPopover]
    })
    .compileComponents();

    fixture = TestBed.createComponent(NotificationPopover);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
