import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CreateDriver } from './create-driver';

describe('CreateDriver', () => {
  let component: CreateDriver;
  let fixture: ComponentFixture<CreateDriver>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CreateDriver]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CreateDriver);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
