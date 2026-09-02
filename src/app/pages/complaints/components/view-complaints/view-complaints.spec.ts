import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ViewComplaints } from './view-complaints';

describe('ViewComplaints', () => {
  let component: ViewComplaints;
  let fixture: ComponentFixture<ViewComplaints>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ViewComplaints]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ViewComplaints);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
