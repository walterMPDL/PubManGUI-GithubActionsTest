import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, inject, OnInit, ElementRef, HostListener } from '@angular/core';

import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';

import { ContextDbRO, ImportFormat } from 'src/app/model/inge';
import { ImportValidatorsService } from 'src/app/components/imports/services/import-validators.service';
import { ImportsService } from 'src/app/components/imports/services/imports.service';
import type { PostImportParams } from 'src/app/components/imports/interfaces/imports-params';
import { SeparateFilterPipe } from 'src/app/components/imports/pipes/separateFilter.pipe';

import { AaService } from 'src/app/services/aa.service';
import { _, TranslatePipe } from "@ngx-translate/core";

import { ValidationErrorComponent } from "src/app/components/shared/validation-error/validation-error.component";
import { NgbTooltip } from "@ng-bootstrap/ng-bootstrap";

@Component({
  selector: 'pure-imports-new-import',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    SeparateFilterPipe,
    TranslatePipe,
    ValidationErrorComponent,
    NgbTooltip
  ],
  templateUrl: './import.component.html',
  styles: [".dropzone { width: 100%; padding: 0.5rem 1.5rem 0.5rem 1.5rem; text-align: center; border: dashed 2px; }"], // TO-DO move to scss
})
export default class ImportComponent implements OnInit {
  importsSvc = inject(ImportsService);
  valSvc = inject(ImportValidatorsService);
  router = inject(Router);
  fb = inject(FormBuilder);
  aaSvc = inject(AaService);
  elRef: ElementRef = inject(ElementRef);

  formatObject: any = null;
  lastFormat: string = '';
  coneSwitch!: HTMLInputElement;
  data: any = '';

  constructor(
    private changeDetector: ChangeDetectorRef
  ) { }

  importFormat = Object.keys(ImportFormat);
  user_contexts?: ContextDbRO[] = [];

  public importForm: FormGroup = this.fb.group({
    contextId: ['', [Validators.required]],
    importName: [null, [Validators.required]],
    format: [null, [Validators.required]],
    formatConfig: [''],
    cone: [],
    fileName: [null, [Validators.required]]
  });

  ngOnInit(): void {
    this.aaSvc.principal.subscribe(
      p => {
        this.user_contexts = p.depositorContexts.sort((a, b) => (a.name || '').localeCompare(b.name || '')).reverse();
      }
    );
    this.importForm.controls['contextId'].setValue(this.user_contexts![0].objectId);
    this.importForm.controls['contextId'].markAsTouched();
  }

  onFormatChange($event: any): void {
    $event.preventDefault();
    this.getFormatConfiguration($event.target.value);
  }

  getFormatConfiguration(format: string) {
    this.importsSvc.getFormatConfiguration(format).subscribe(response => {
      this.formatObject = response;
      this.changeDetector.detectChanges();
      if (this.formatObject && this.formatObject.format !== this.lastFormat) {
        this.setSelectDefaultOption();
        this.setCoNE();
        this.lastFormat = format;
      };
    });
  }

  resetFormatConfiguration() {
    this.formatObject = null;
    this.lastFormat = '';
    this.importForm.get('formatConfig')?.setValue('');


  }

  hasConfig(): boolean {
    return (this.formatObject !== null && Object.keys(this.formatObject).length > 0);
  }

  setCoNE(): void {
    const defaultArray = this.formatObject["_default"];
    const coNEEntry = defaultArray.find((entry: string) => entry.startsWith("CoNE="));
    if (coNEEntry) {
      this.coneSwitch = document.getElementById("coneSwitch") as HTMLInputElement;
      this.coneSwitch.checked = (coNEEntry.split("=")[1] === "true");
    }
  }

  hasSelect(): boolean {
    return (this.formatObject !== null && Object.keys(this.formatObject).length > 2);
  }

  getSelectName(): string {
    return Object.keys(this.formatObject)[2];
  }

  getSelectOptionList(): string[] {
    return Object.entries(this.formatObject)[2][1] as string[];
  }

  setSelectDefaultOption(): void {
    if (this.formatObject) {
      const defaultArray = this.formatObject["_default"];
      if (!defaultArray || defaultArray.length === 1) {
        return;
      }
      const defaultValue = defaultArray.find((entry: string) => entry.startsWith(this.getSelectName())).split("=")[1];
      this.importForm.get('formatConfig')?.setValue(defaultValue);
    }
  }

  onDragOver($event: any): void {
    $event.preventDefault();
  }

  onFileDrop($event: any): void {
    $event.preventDefault();
    if ($event.dataTransfer?.files && $event.dataTransfer.files[0]) {
      this.importForm.controls['fileName'].setValue($event.dataTransfer.files[0].name);
      this.importForm.controls['fileName'].markAsTouched();
      this.getData($event.dataTransfer.files[0]);
    } 
 
    this.importForm.get('fileName')?.clearAsyncValidators();
    this.importForm.get('fileName')?.updateValueAndValidity();
  }

  onFileChange($event: any): void {
    $event.preventDefault();
    if ($event.target.files && $event.target.files[0]) {
      this.importForm.controls['fileName'].setValue($event.target.files[0].name);
      this.importForm.controls['fileName'].markAsTouched();
      this.getData($event.target.files[0]);
    } 

    this.importForm.get('fileName')?.clearAsyncValidators();
    this.importForm.get('fileName')?.updateValueAndValidity();
  }

  onFileRemove():void {
    this.importForm.controls['fileName'].setValue(null);
    this.importForm.controls['fileName'].markAsUntouched();
    this.importForm.get('fileName')?.clearAsyncValidators();
    this.importForm.get('fileName')?.updateValueAndValidity();
    this.data = null; 
    this.elRef.nativeElement.querySelector('#fileChoose').value = null;
  }

  getData(file: File) {
    const reader = file.stream().getReader();
    let result: any = '';

    reader.read().then(
      function processData({ done, value }): any {
        if (done) {
          return;
        }

        const chunk = value;
        result += new TextDecoder().decode(chunk);

        return reader.read().then(processData);
      }
    ).finally(() => { this.data = result; });
  }

  get getImportParams(): PostImportParams {
    const importParams: PostImportParams = {
      contextId: this.importForm.controls['contextId'].value,
      importName: this.importForm.controls['importName'].value,
      format: this.importForm.controls['format'].value,
      formatConfig: 'CoNE=' + (this.importForm.controls['cone'].value ? 'true' : 'false') + (this.hasSelect() ? ',' + this.getSelectName() + '=' + this.importForm.controls['formatConfig'].value : '')
    }
    return importParams;
  }

  onSubmit(): void {
    if (this.importForm.valid) {
      this.importsSvc.postImport(this.getImportParams, this.data).subscribe(() => {
        this.importsSvc.checkImports();
        this.router.navigate(['/imports/myimports']);
      });
    }
  }

  checkIfAllRequired() {
    if (this.importForm.invalid) {
      Object.keys(this.importForm.controls).forEach(key => {
        const field = this.importForm.get(key);
        if (field!.hasValidator(Validators.required) && field!.untouched) {
          field!.markAsPending();
        }
      });
    }
  }

  @HostListener('document:click', ['$event'])
  clickOutside(event: Event) {
    if (this.elRef.nativeElement.parentElement.contains(event.target) && !this.elRef.nativeElement.contains(event.target)) {
      this.importForm.reset();
      this.importForm.controls['contextId'].setValue(this.user_contexts![0].objectId);
      this.importForm.controls['contextId'].markAsTouched();
      this.resetFormatConfiguration();
      this.data = null;
    }
  }
}
