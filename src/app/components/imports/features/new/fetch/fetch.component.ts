import { Component, inject, OnInit, ElementRef, HostListener } from '@angular/core';

import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';

import { ImportValidatorsService } from 'src/app/components/imports/services/import-validators.service';
import { ImportsService } from 'src/app/components/imports/services/imports.service';
import type { GetArxivParams, GetCrossrefParams } from 'src/app/components/imports/interfaces/imports-params';
import { AaService } from 'src/app/services/aa.service';

import { _, TranslatePipe } from "@ngx-translate/core";
import { MessageService } from "src/app/services/message.service";

import { ValidationErrorComponent } from "src/app/components/shared/validation-error/validation-error.component";


@Component({
  selector: 'pure-imports-new-fetch',
  standalone: true,
  imports: [
    FormsModule,
    ReactiveFormsModule,
    TranslatePipe,
    ValidationErrorComponent
],
  templateUrl: './fetch.component.html',
})
export default class FetchComponent implements OnInit {
  importsSvc = inject(ImportsService);
  valSvc = inject(ImportValidatorsService);
  router = inject(Router);
  fb = inject(FormBuilder);
  aaSvc = inject(AaService);
  msgSvc = inject(MessageService);
  elRef: ElementRef = inject(ElementRef);

  dinamicPlaceholder = "10.1000/1000xyz";

  public fetchForm: FormGroup = this.fb.group({
    source: ['crossref'],
    identifier: ['', [Validators.required, this.valSvc.forbiddenURLValidator(/http/i)]],
    fullText: ['FULLTEXT_DEFAULT']
  });

  get getCrossrefParams(): GetCrossrefParams {
    const importParams: GetCrossrefParams = {
      identifier: this.fetchForm.controls['identifier'].value
    }
    return importParams;
  }

  arxiv = /arxiv:/gi;
  get getArxivParams(): GetArxivParams {
    const importParams: GetArxivParams = {
      identifier: this.fetchForm.controls['identifier'].value.replace(this.arxiv, '').trim(),
      fullText: this.fetchForm.controls['fullText'].value
    }
    return importParams;
  }

  ngOnInit(): void {
    this.fetchForm.controls['source'].valueChanges.subscribe(source => {
      if (source === 'arxiv') {
        this.dinamicPlaceholder = 'arXiv:yymm.nnnnn';
      } else {
        this.dinamicPlaceholder = '10.1000/1000xyz';
      }
    });
  }

  onSubmit(): void {
    if (this.fetchForm.valid) {

      const source = this.fetchForm.controls['source'].value;
      this.fetchStart();

      switch (source) {
        case 'crossref':
          this.importsSvc.getCrossref(this.getCrossrefParams).subscribe({
            next: () => {
              this.router.navigateByUrl('/edit_import');
            },
            error: (response) => {
              if (response.error.cause !== undefined) {
                this.msgSvc.warning(JSON.stringify(response.error.cause.cause.message));
              } else {
                this.msgSvc.warning(JSON.stringify(response.error.exception));
              }
              this.fetchEnd();
            },
          });
          break;
        case 'arxiv':
          this.importsSvc.getArxiv(this.getArxivParams).subscribe({
            next: () => {
              this.router.navigateByUrl('/edit_import');
            },
            error: (response) => {
              if (response.error.cause !== undefined) {
                this.msgSvc.warning(JSON.stringify(response.error.cause.cause.message));
              } else {
                this.msgSvc.warning(JSON.stringify(response.error.exception));
              }
              this.fetchEnd();
            },
          });
      }
    }
  }

  fetchStart(): void {
    let element = document.getElementById('go') as HTMLButtonElement;
    element.ariaDisabled = 'true';
    element.tabIndex = -1;
    element.classList.add('disabled');
    element.classList.replace('border-2', 'border-0');
    element.innerHTML = '<span class="spinner-border spinner-border-sm text-secondary" aria-hidden="true"></span>'
  }

  fetchEnd(): void {
    let element = document.getElementById('go') as HTMLButtonElement;
    element.ariaDisabled = 'false';
    element.tabIndex = 0;
    element.classList.remove('disabled');
    element.classList.replace('border-0', 'border-2');
    element.innerHTML = 'GO'
  }

  checkIfAllRequired() {
    if (this.fetchForm.invalid) {
      Object.keys(this.fetchForm.controls).forEach(key => {
        const field = this.fetchForm.get(key);
        if (field!.hasValidator(Validators.required) && (field!.untouched)) {
          field!.markAsPending();
        }
      });
    }
  }

  @HostListener('document:click', ['$event'])
  clickOutside(event: Event) {
    if (this.elRef.nativeElement.parentElement.contains(event.target) && !this.elRef.nativeElement.contains(event.target)) {
      this.fetchForm.reset();
      this.fetchForm.controls['source'].setValue('crossref');
      this.fetchForm.controls['fullText'].setValue('FULLTEXT_DEFAULT'); ""
    }
  }
}
