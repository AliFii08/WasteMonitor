import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CreateComplaints } from './create-complaints';

describe('CreateComplaints', () => {
  let component: CreateComplaints;
  let fixture: ComponentFixture<CreateComplaints>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CreateComplaints]
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
