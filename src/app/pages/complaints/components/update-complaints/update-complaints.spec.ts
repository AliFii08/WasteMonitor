import { ComponentFixture, TestBed } from '@angular/core/testing';

import { UpdateComplaints } from './update-complaints';

describe('UpdateComplaints', () => {
  let component: UpdateComplaints;
  let fixture: ComponentFixture<UpdateComplaints>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UpdateComplaints]
    })
    .compileComponents();

    fixture = TestBed.createComponent(UpdateComplaints);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
