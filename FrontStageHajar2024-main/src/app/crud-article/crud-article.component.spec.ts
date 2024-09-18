import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CrudArticleComponent } from './crud-article.component';

describe('CrudArticleComponent', () => {
  let component: CrudArticleComponent;
  let fixture: ComponentFixture<CrudArticleComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ CrudArticleComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(CrudArticleComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
