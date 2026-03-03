import {ChangeDetectorRef, Component, EventEmitter, inject, OnInit, Output} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ControlType, FormBuilderService } from '../../../services/form-builder.service';
import {
  FormArray,
  FormBuilder,
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  ValidationErrors
} from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { catchError, finalize, of, pipe, Subscription, switchMap, tap, throwError } from 'rxjs';
import { MetadataFormComponent } from '../metadata-form/metadata-form.component';
import {
  ContextDbRO,
  ContextDbVO,
  ContextState,
  FileDbVO,
  ItemVersionRO,
  ItemVersionState,
  ItemVersionVO,
  MdsPublicationVO,
  Storage
} from 'src/app/model/inge';
import { AddRemoveButtonsComponent } from 'src/app/components/shared/add-remove-buttons/add-remove-buttons.component';
import { remove_null_empty, remove_objects } from 'src/app/utils/utils_final';
import { ChipsComponent } from 'src/app/components/shared/chips/chips.component';
import { AaService } from 'src/app/services/aa.service';
import { ContextsService } from "../../../services/pubman-rest-client/contexts.service";
import { ItemsService } from 'src/app/services/pubman-rest-client/items.service';
import { ItemListStateService } from 'src/app/components/item-list/item-list-state.service';
import { FileFormComponent } from '../file-form/file-form.component';
import { FileUploadComponent, UploadedFile } from '../file-upload/file-upload.component';
import { CdkDrag, CdkDragDrop, CdkDropList } from '@angular/cdk/drag-drop';
import { FileStagingService } from 'src/app/services/pubman-rest-client/file-staging.service';
import { MessageService } from 'src/app/services/message.service';
import { itemToVersionId } from 'src/app/utils/utils';
import { ItemActionsModalComponent } from 'src/app/components/shared/item-actions-modal/item-actions-modal.component';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { ItemBadgesComponent } from "../../shared/item-badges/item-badges.component";
import { TranslatePipe } from "@ngx-translate/core";
import { BootstrapValidationDirective } from "../../../directives/bootstrap-validation.directive";
import { LoadingComponent } from "../../shared/loading/loading.component";
import { MiscellaneousService } from "../../../services/pubman-rest-client/miscellaneous.service";
import { AccordionGroupValidationDirective } from "../../../directives/accordion-group-validation.directive";

import { ValidationErrorMessageDirective } from "../../../directives/validation-error-message.directive";

@Component({
  selector: 'pure-item-form',
  standalone: true,
  imports: [CommonModule,
    FileFormComponent,
    FileUploadComponent,
    FormsModule,
    ReactiveFormsModule,
    ChipsComponent,
    MetadataFormComponent,
    AddRemoveButtonsComponent,
    CdkDropList,
    CdkDrag, ItemBadgesComponent, TranslatePipe, BootstrapValidationDirective, ValidationErrorMessageDirective, AccordionGroupValidationDirective, LoadingComponent],
  templateUrl: './item-form.component.html',
  styleUrls: ['./item-form.component.scss'],
})
export class ItemFormComponent implements OnInit {
//bsValidation = inject(BootstrapValidationDirective)

  aaService = inject(AaService);
  contextService = inject(ContextsService);
  fb = inject(FormBuilder);
  fbs = inject(FormBuilderService);
  fileStagingService = inject(FileStagingService);
  itemService = inject(ItemsService);
  listStateService = inject(ItemListStateService);
  miscellaneousService = inject(MiscellaneousService)

  messageService = inject(MessageService);
  modalService = inject(NgbModal);
  route = inject(ActivatedRoute);
  router = inject(Router);
  changeDetectorRef = inject(ChangeDetectorRef);

  externalReferences!: FormArray<FormGroup<ControlType<FileDbVO>>>;
  form!: FormGroup;
  item!: ItemVersionVO;
  form_2_submit: any;
  internalFiles!: FormArray<FormGroup<ControlType<FileDbVO>>>;
  switchFileSortingMode: boolean = false;
  user_contexts: ContextDbRO[] = [];

  saveErrorMessage? :string;

  @Output() onChangeSwitchMode: EventEmitter<any> = new EventEmitter();

  authorizationInfo: any;

  genreSpecificResource = this.miscellaneousService.genrePropertiesResource;


  allValidationErrorSubscription?: Subscription;
  allValidationErrors: any[] = [];
  protected saveInProgress: boolean = false;

  ngOnInit(): void {
    this.user_contexts = this.aaService.principal.value.depositorContexts.filter(ctx => ctx.state === ContextState.OPENED)
      .sort((c1, c2) => (c1.name || '').localeCompare(c2.name || '')).reverse();
    this.route.data.pipe(
      /*
      switchMap(data => {
        // console.log('Data', JSON.stringify(data));
        //this.item = data['item'];
        return of(data['item']);
      })

       */
    ).subscribe(data => {

      if(data['templateItem']) {
        this.startFromTemplate(data['templateItem']);
      }
      else {
        this.itemUpdated(data['item'], true);
      }



      // manual Update for form validation
      //this.updateFormValidity(this.form);
    });
    /*
    this.context.valueChanges.subscribe(() => {
      console.log("Context changed!!!!");
      this.updateAuthInfo();
    });

     */





    /*
    this.contextService.getDepositorContextsForCurrentUser()
      .subscribe(
        contexts => {
          this.user_contexts = contexts.records.map(sr => sr.data); console.log('UserContexts: ' + JSON.stringify(this.user_contexts))
        }
      );

     */
  }

  ngAfterViewInit(): void {
    /*
    this.allValidationErrorSubscription = this.form.valueChanges.subscribe(value => {
      this.allValidationErrors = this.findErrorsRecursive(this.form)
    })
     */
  }

  ngOnDestroy(): void {
    this.allValidationErrorSubscription?.unsubscribe();
  }

  get context() {
    // console.log('Context: ', JSON.stringify(this.form.get('context')))
    return this.form.get('context') as FormGroup<ControlType<ContextDbVO>>
  }

  get files() {
    return this.form.get('files') as FormArray<FormGroup<ControlType<FileDbVO>>>;
  }

  get localTags() {
    return this.form.get('localTags') as FormArray<FormControl<ControlType<string>>>
  }

  get metadata_form() {
    return this.form.get('metadata') as FormGroup<ControlType<MdsPublicationVO>>
  }

  get message() {
    return this.form.get('message') as FormControl<ControlType<string>>
  }

  initInternalAndExternalFiles() {
    this.internalFiles?.clear();
    this.externalReferences?.clear();
    for (let i = 0; i < this.files.length; i++) {
      if (this.files.at(i).value.storage == 'INTERNAL_MANAGED') {
        if (!this.internalFiles) {
          this.internalFiles = this.fb.array([this.files.at(i)]);
        } else {
          this.internalFiles.push(this.files.at(i));
        }
      }

      if (this.files.at(i).value.storage == 'EXTERNAL_URL') {
        if (!this.externalReferences) {
          this.externalReferences = this.fb.array([this.files.at(i)]);
        } else {
          this.externalReferences.push(this.files.at(i));
        }
      }
    }
    //this.internalFiles?.updateValueAndValidity();
    //this.externalReferences?.updateValueAndValidity();
  }

  add_remove_local_tag(event: any) {
    if (event.action === 'add') {
      this.localTags.insert(event.index + 1, new FormControl());
    } else if (event.action === 'remove') {
      this.localTags.removeAt(event.index);
    }
  }

  context_change(contextObjectId: string) {
    // no contextService call needed, because we just need a contextDbRO
    let selectedContext = this.user_contexts?.find((context) => context.objectId == contextObjectId)
    this.form.get('context')?.patchValue({ objectId: contextObjectId, name: selectedContext?.name });
    this.updateAuthInfo();
  }

  changeSortingMode() {
    this.switchFileSortingMode = !this.switchFileSortingMode;
    const elements = (document.getElementsByClassName('containerHideOnSort')) as any
    if (this.switchFileSortingMode == true) {
      for (let i = 0; i < elements.length; i++) {
        elements[i].style.display = 'none'
      }
    } else {
      for (let i = 0; i < elements.length; i++) {
        elements[i].style.display = 'block';
      }
    }

  }

  handleFileUploadNotification(uploadedFiles: UploadedFile[]) {


    if(uploadedFiles) {
      for(const file of uploadedFiles) {
        const internalFile = this.fbs.file_FG(null);
        internalFile.get("storage")?.setValue(Storage.INTERNAL_MANAGED);
        //real file name is set to original filename in backend
        //internalFile.get("name")?.setValue(file.name);
        internalFile.get("content")?.setValue(file.stagingId);
        internalFile.get("metadata")?.get("title")?.setValue(file.name);

        if (!this.internalFiles) {
          this.internalFiles = this.fb.array([internalFile]);
        } else {
          this.internalFiles.push(internalFile);
        }
      }
      } else {
        this.messageService.error('Authentication error. You need to be logged in, to stage a file');
      }

  }

  handleInternalFileNotification(event: any) {
    if (event.action === 'add') {
      this.addInternalFile(event.index);
    } else if (event.action === 'remove') {
      this.removeInternalFile(event.index);
    }
  }

  handleNoInternalFiles() {
    this.internalFiles.push(this.fbs.file_FG(null));
  }

  addInternalFile(index: number) {
    this.internalFiles.insert(index + 1, this.fbs.file_FG(null));
  }

  removeInternalFile(index: number) {
    this.internalFiles.removeAt(index);
  }

  handleExternalReferenceNotification(event: any) {
    if (event.action === 'add') {
      this.addExternalReference(event.index);
    } else if (event.action === 'remove') {
      this.removeExternalReference(event.index);
    }
  }

  handleNoExternalReferences() {
    if(!this.externalReferences) {
      this.externalReferences = this.fb.array([this.fbs.file_FG(null)]);
    }
    else {
      this.externalReferences.push(this.fbs.file_FG(null));
    }

  }

  addExternalReference(index: number) {
    this.externalReferences.insert(index + 1, this.fbs.file_FG(null));
  }

  removeExternalReference(index: number) {
    this.externalReferences.removeAt(index);
  }

  handleNotification(event: any) {
    alert(event);
  }

  /*
  onDragMove(event: CdkDragMove<any>): void {
    const elements=(document.getElementsByClassName('containerHideOnDrag'))as any
    //elements.style.transform = `translate3d(${xPos}px, ${yPos}px, 0)`;
    for (let i=0; i<elements.length; i++) {
      elements[i].style.display = 'none'
    }
  }
  */

  dropInternalFiles(event: CdkDragDrop<string[]>) {
    this.moveItemInArray(this.internalFiles, event.previousIndex, event.currentIndex);
    /*
    const elements=(document.getElementsByClassName('containerHideOnDrag'))as any
    for (let i=0; i<elements.length; i++) {
      elements[i].style.display = 'block';
    }
    */
  }

  dropExternalReferences(event: CdkDragDrop<string[]>) {
    this.moveItemInArray(this.internalFiles, event.previousIndex, event.currentIndex);
  }

  /** Copied from Angular CDK to make our FormArrays work with drag and drop */
  moveItemInArray<T = any>(array: FormArray<FormGroup<ControlType<T>>>, fromIndex: number, toIndex: number): void {
    let object: any = array.at(fromIndex);
    array.removeAt(fromIndex);
    array.insert(toIndex, object);
  }

  openActionsModal(type: 'release' | 'submit', item: ItemVersionVO) {
    const comp: ItemActionsModalComponent = this.modalService.open(ItemActionsModalComponent).componentInstance;
    comp.item = item!;
    comp.action = type;
    comp.successfullyDone.subscribe(data => {
      this.router.navigate(['/view/' + itemToVersionId(item! as ItemVersionRO)])
    })

  }

  get isNewItem() {
    return !this.form.get('objectId')?.value
  }

  get objectId() {
    return this.form.get('objectId')?.value
  }


  private startFromTemplate(item: ItemVersionVO) {
    const templateItem:ItemVersionVO = {
      metadata: item.metadata,
    }
    this.itemUpdated(templateItem, true);
  }

  private itemUpdated(item: ItemVersionVO, initial:boolean=false) {
    this.item = item;

    if(initial) {
      this.form = this.fbs.item_FG(item);
      if (this.user_contexts.length > 0 && this.isNewItem) {
        // no contextService call needed, because we just need a contextDbRO
        this.form.get('context')?.patchValue({ objectId: this.user_contexts[0].objectId, name: this.user_contexts[0].name });
      }
    }
    else {
      this.fbs.updateItem_FG(this.form, this.item)
      /*
      if (!this.isNewItem) {
        this.listStateService.itemUpdated.next(this.objectId);
      }
       */
    }



    this.initInternalAndExternalFiles();
    this.updateAuthInfo();
    //this.form.updateValueAndValidity();
  }

  updateAuthInfo() {
    if (this.form.value !== null
      && this.form.value !== undefined) {



      if(!this.isNewItem) {
        this.itemService.retrieveAuthorizationInfo(this.objectId, true).subscribe(authInfo => {
          this.authorizationInfo = authInfo;
          console.log('this.authorizationInfo: ', this.authorizationInfo);
        });
      }
      else {
        this.itemService.retrieveAuthorizationInfoForCreation(this.context.value.objectId || '', true).subscribe(authInfo => {
          this.authorizationInfo = authInfo;
          console.log('this.authorizationInfo: ', this.authorizationInfo);
        });
      }


    }
  }

  get allValid() {
    return this.form.valid &&
      (this.internalFiles ? this.internalFiles.valid : true) &&
      (this.externalReferences ? this.externalReferences.valid : true)
  }

  get validForSave() {
    if(this.isNewItem || this.form.get("publicState")?.value === ItemVersionState.PENDING) {
      return this.form?.get("metadata")?.get("title")?.valid;
    }
    else {
      return this.allValid;
    }

  }

  get anyDirty() {
    return this.form.dirty ||
      (this.internalFiles && this.internalFiles.dirty) &&
      (this.externalReferences && this.externalReferences.dirty)
  }

  submit(saveType: 'save'|'save_to_view'|'submit'|'release') {
    console.log('submitterId', typeof saveType);
    console.log('submitterId', saveType);

    // reassembling files in "files" from "internalFiles" and externalReferences
    this.files.clear();
    if (this.internalFiles) {
      this.internalFiles.controls.forEach(internalFileControl => {
        this.files.push(internalFileControl);
      })
    }
    if (this.externalReferences) {
      this.externalReferences.controls.forEach(externalReferenceControl => {
        this.files.push(externalReferenceControl);
      });
    }
    // set sorting (sortkz) for files
    for (let i = 0; i < this.files.length; i++) {
      //console.log("Setting new sortkz: ", i);
      this.files.at(i).get('sortkz')?.setValue(i);
      //console.log("Setting new sortkz: ", this.files.at(i).get('sortkz'));
    }
    // cleanup form
    this.form_2_submit = remove_null_empty(this.form.value);
    this.form_2_submit = remove_objects(this.form_2_submit);

    /*
    console.log('form_2_submit.valid:', JSON.stringify(this.form_2_submit.valid));
    console.log('form_2_submit.errors:', JSON.stringify(this.form_2_submit.errors));
    console.log('form.valid', JSON.stringify(this.form.valid));
    console.log('form.errors:', JSON.stringify(this.form.errors));
    */
    // this.printValidationErrors(this.form); // call for debug function

    let valid = saveType === "save" || saveType == "save_to_view" ? this.validForSave : this.allValid;
    if(!valid) {
      alert('Validation Error when creating new Publication ' + JSON.stringify(this.form.errors) + JSON.stringify(this.form.valid));
      return;
    }

    // submit form
    this.saveInProgress = true;
    if (this.aaService.isLoggedIn) {
      if (this.form_2_submit.objectId) {
        //Update item
        this.itemService.update(this.form_2_submit.objectId, this.form_2_submit as ItemVersionVO).pipe(
          this.savePipe(saveType)
          //this.savePipe
        ).subscribe();
      } else {
        //Create item
        this.itemService.create(this.form_2_submit as ItemVersionVO).pipe(
          this.savePipe(saveType)
        ).subscribe();
      }
    } else {
      alert('You must be logged in to update/create a publication');
    }
  }

  savePipe(saveType: 'save' | 'save_to_view' | 'submit' | 'release') {
    return pipe(
      tap((result: ItemVersionVO) => {
        //console.log("TAP" + result);
        this.itemUpdated(result);

        this.messageService.success('Item saved successfully!', true);
        console.log('Saved Item', JSON.stringify(result));

        if(saveType !== "save" && saveType !=="save_to_view") {
          this.openActionsModal(saveType, result)
        } else if(saveType === "save_to_view") {
          this.router.navigate(['/view/' + itemToVersionId(result! as ItemVersionRO)])
        }
      }),
      catchError((err) => {
        //return  EMPTY;
        //TODO Better error handling?


        return throwError(() => err);
      }),
      finalize(() => {
        this.saveInProgress = false;
      })
    )

  }

  // Debugging function to print validation errors
  printValidationErrors(form: FormGroup, formField?: string) {
    console.log('Form status:', form.status, formField);
    console.log('Form errors:', form.errors);
    Object.keys(form.controls).forEach(field => {
      const control = form.get(field);
      if (control instanceof FormGroup) {
        this.printValidationErrors(control, field);
      } else if (control instanceof FormArray) {
        control.controls.forEach((arrayControl, index) => {
          if (arrayControl instanceof FormGroup) {
            this.printValidationErrors(arrayControl, `${field}[${index}]`);
          } else {
            if (arrayControl?.invalid && arrayControl?.touched) {
              console.log(`Status ${field}[${index}]:`, arrayControl?.status);
              console.log(`Validation errors for ${field}[${index}]:`, arrayControl?.errors);
            }
          }
        });
      } else {
        if (control?.invalid && control?.touched) {
          console.log(`Status ${field}:`, control?.status);
          console.log(`Validation errors for ${field}:`, control?.errors);
        }
      }
    });
  }

  get errors() {
    return this.findErrorsRecursive(this.form);
  }

  findErrorsRecursive(
    formToInvestigate: FormGroup | FormArray
  ): ValidationErrors[] {
    let errors: any[] = [];
    const recursiveFunc = (form: FormGroup | FormArray) => {
      Object.keys(form.controls).forEach((field) => {
        const control = form.get(field);
        if (control?.errors) {
          errors.push({name: field,errors: control.errors});
        }
        if (control instanceof FormGroup || control instanceof FormArray) {
          recursiveFunc(control);
        }
      });
    };
    recursiveFunc(formToInvestigate);
    console.log(errors);
    return errors;
  }

  /*
  openChangeContextModal() {
    const changeContextComp: ChangeContextModalComponent = this.modalService.open(ChangeContextModalComponent).componentInstance;
    changeContextComp.item = this.item;
    changeContextComp.successfullyDone.subscribe(data => {
        this.itemUpdated(data);
    })
  }

   */
}

/*
export interface shouldObject {
  should: {
    term?: Array<{objectid: string}>
  }
}
*/
