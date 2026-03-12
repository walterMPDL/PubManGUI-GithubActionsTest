import { Component, EventEmitter, inject, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CdkDragHandle, CdkDragPlaceholder } from '@angular/cdk/drag-drop';
import { FormArray, FormBuilder, FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { ContentCategories, MdsFileVO, OA_STATUS, Visibility } from 'src/app/model/inge';
import { ControlType } from '../../../services/form-builder.service';
import { IpEntry, MiscellaneousService } from 'src/app/services/pubman-rest-client/miscellaneous.service';
import { AddRemoveButtonsComponent } from 'src/app/components/shared/add-remove-buttons/add-remove-buttons.component';
import { LoadingComponent } from 'src/app/components/shared/loading/loading.component';
import { Errors } from 'src/app/model/errors';
import { TranslatePipe } from "@ngx-translate/core";
import { BootstrapValidationDirective } from "../../../directives/bootstrap-validation.directive";
import { ValidationErrorMessageDirective } from "../../../directives/validation-error-message.directive";
import { ConeAutosuggestComponent } from "../../shared/cone-autosuggest/cone-autosuggest.component";
import { tap } from "rxjs";
import { ConeService } from "../../../services/cone.service";
import { isFormValueEmpty } from 'src/app/utils/utils';

@Component({
  selector: 'pure-file-form',
  standalone: true,
  imports: [
    AddRemoveButtonsComponent,
    CommonModule,
    LoadingComponent,
    ReactiveFormsModule,
    CdkDragHandle,
    CdkDragPlaceholder,
    TranslatePipe,
    BootstrapValidationDirective,
    ValidationErrorMessageDirective,
    ConeAutosuggestComponent
  ],
  templateUrl: './file-form.component.html',
  styleUrl: './file-form.component.scss'
})
export class FileFormComponent {
  @Input() file_form!: FormGroup;
  @Input() index!: number;
  @Input() index_length!: number;
  @Output() notice = new EventEmitter();

  fb = inject(FormBuilder);
  miscellaneousService = inject(MiscellaneousService);
  genreSpecificResource = this.miscellaneousService.genrePropertiesResource;

  contentCategory_types = Object.keys(ContentCategories);
  visibility_types = Object.keys(Visibility);
  oaStatus_types = Object.keys(OA_STATUS);

  ipRangeCompleteList: IpEntry[] = [] as IpEntry[];

  error_types = Errors;

  audiencePriorityList = ['mpg'];
  isContentFormDisabled = false;

  constructor(miscellaneousService: MiscellaneousService, private coneService: ConeService) {
    miscellaneousService.retrieveIpList().subscribe(
      result => {
        this.sortAudienceList(result); /* console.log('Miscellaneous IPList: ', this.ipRangeCompleteList) */
      }
    )
  }

  ngOnInit(): void {
    if (this.file_form?.get('storage')?.value === 'EXTERNAL_URL' && !isFormValueEmpty(this.file_form.get('content')?.value))
      { 
        this.file_form.get('content')?.disable(); 
      }    
  }

  get allowedAudienceIds() {
    //console.log('Allowed Audiences: ', this.file_form.get('allowedAudienceIds'));
    return this.file_form.get('allowedAudienceIds') as FormArray<FormControl>;
  }

  get metadata() {
    return this.file_form.get('metadata') as FormGroup<ControlType<MdsFileVO>>;
  }

  contentCategory_change(event: any) {
    this.metadata.get('contentCategory')?.setValue(event.target.value)
  }

  visibility_change(event: any) {
    this.file_form.get('visibility')?.setValue(event.target.value)
  }

  allowedAudienceIds_change(event: any) {
    console.log('changed visibility', event.target.value)
  }

  handleAllowedAudienceIdsNotification(event: any) {
    console.log('audience notification', event.action);
    console.log('audience json', this.allowedAudienceIds);
    if (event.action === 'add') {
      console.log('add audience');
      this.addAllowedAudienceId(event.index);
    } else if (event.action === 'remove') {
      console.log('remove audience');
      this.removeAllowedAudienceIds(event.index);
    }
  }

  addAllowedAudienceId(index: number) {
    this.allowedAudienceIds.insert(index + 1, this.fb.control(null));
  }

  removeAllowedAudienceIds(index: number) {
    this.allowedAudienceIds.removeAt(index);
  }

  sortAudienceList(ipEntryList: IpEntry[]) {
    if (ipEntryList) {
          this.ipRangeCompleteList = ipEntryList;
          this.ipRangeCompleteList.sort((a, b) => {

            const aIndex = this.audiencePriorityList.indexOf(a.id);
            const bIndex = this.audiencePriorityList.indexOf(b.id);

            if (aIndex !== -1 && bIndex !== -1) {
              return aIndex - bIndex;
            } else if (aIndex !== -1) {
              return -1;
            } else if (bIndex !== -1) {
              return 1;
            } else {
              return (a.name).localeCompare(b.name);
            }
          });
        }
  }

  protected readonly Visibility = Visibility;


  licenseSelected(coneQueryResult: any) {

    if (coneQueryResult && coneQueryResult.parsedId) {
      this.coneService.getConeResource(coneQueryResult.parsedId).pipe(
        tap(data => {
          console.log(data);
          this.metadata.get("license")?.setValue(data.http_purl_org_dc_elements_1_1_relation);
        })
      ).subscribe();

    }

  }
}
