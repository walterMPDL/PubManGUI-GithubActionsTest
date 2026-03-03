import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgbHighlight, NgbTypeahead } from "@ng-bootstrap/ng-bootstrap";
import { FormArray, FormBuilder, FormControl, ReactiveFormsModule } from "@angular/forms";
import {
  catchError,
  debounceTime,
  distinctUntilChanged,
  filter,
  finalize,
  Observable,
  of,
  OperatorFunction,
  switchMap,
  tap
} from "rxjs";
import { ConeService, PersonResource } from "../../../services/cone.service";
import { HttpParams } from "@angular/common/http";
import { FormBuilderService } from 'src/app/services/form-builder.service';
import { IdType, OrganizationVO } from 'src/app/model/inge';
import { TranslatePipe } from "@ngx-translate/core";
import { BootstrapValidationDirective } from "../../../directives/bootstrap-validation.directive";
import { ValidationErrorMessageDirective } from "../../../directives/validation-error-message.directive";
import { ConeIconComponent } from "../cone-icon/cone-icon.component";

@Component({
  selector: 'pure-person-autosuggest',
  standalone: true,
  imports: [
    NgbTypeahead,
    ReactiveFormsModule,
    NgbHighlight,
    CommonModule,
    TranslatePipe,
    BootstrapValidationDirective, ValidationErrorMessageDirective, ConeIconComponent
  ],
  templateUrl: './person-autosuggest.component.html'
})
export class PersonAutosuggestComponent {


  @Input() formForPersonsCompleteName?: FormControl;
  @Input() formForPersonsGivenName?: FormControl;
  @Input() formForPersonsFamilyName?: FormControl;
  @Input() formForPersonOrganizations!: FormArray;

  @Input() formForPersonsIdValue!: FormControl;
  @Input() formForPersonsIdType?: FormControl;
  @Input() formForPersonsOrcid?: FormControl;

  @Input() validationError!: boolean;

  @Input() showConeAndOrcid =  false;


  searching: boolean = false;

  constructor(private coneService: ConeService, private fb: FormBuilder, private fbs: FormBuilderService) {
  }

  suggestPersons: OperatorFunction<string, readonly string[]> = (text$: Observable<string>) =>
    text$.pipe(
      filter(typed => (typed != null && typed.length >= 3)),
      tap(() => {
        this.searching = true
      }),
      debounceTime(500),
      distinctUntilChanged(),

      switchMap((term) => {
        console.log('searching');
        const params = new HttpParams().set('q', term).set('format', 'json');
        return this.coneService.find('/persons/query', params).pipe(
          catchError(() => {
            //this.searchFailed = true;
            console.log('search failed');
            return [];
          }),
        )
      }),
      tap(() => {
        this.searching = false;
      }),
      finalize(() => {
        this.searching = false;
      })
    );


  suggestPersonsSelector = (event: any) => {
    //console.log("setOU" + JSON.stringify(event));
    const coneId = event.item.id.substring(event.item.id.indexOf("/persons/"), event.item.id.length)
    // console.log("formForPersonId", JSON.stringify(this.formForPersonsId))
    this.formForPersonsIdValue.setValue(coneId);
    this.formForPersonsIdType?.setValue(IdType.CONE);
    console.log("Item", JSON.stringify(event.item));
    if (this.formForPersonsCompleteName) {
      this.formForPersonsCompleteName.setValue(event.item.value);
    }
    if (this.formForPersonsGivenName) {
      this.formForPersonsGivenName.setValue(event.item.value.substring(event.item.value.indexOf(", ") + 2, event.item.value.indexOf("(")));
    }
    if (this.formForPersonsFamilyName) {
      this.formForPersonsFamilyName.setValue(event.item.value.substring(0, event.item.value.indexOf(", ")));
    }
    console.log("formForPersonOrganization before set", this.formForPersonOrganizations?.value);
    if (!this.formForPersonOrganizations) {
      this.formForPersonOrganizations = this.fb.array([this.fbs.organization_FG(null)]);
      this.formForPersonOrganizations.insert(event.index + 1, this.fbs.organization_FG(null));
    }
    console.log("formForPersonOrganization after set", this.formForPersonOrganizations?.value);

    this.updatePerson(coneId, event.item.value.substring(event.item.value.indexOf("(") + 1, event.item.value.indexOf(")")));

    //Prevent that the whole ou object is set in the form control
    event.preventDefault();
  }

  updatePerson(coneId: string, ouName: string) {
    const selected_ou = ouName.includes(',') ? ouName.substring(ouName.indexOf('(') + 1, ouName.lastIndexOf(',')) : ouName;
    this.coneService.getPersonResource(coneId).subscribe(
      (person: PersonResource) => {
        if (Array.isArray(person.http_purl_org_dc_elements_1_1_identifier)) {
          let orcid = person.http_purl_org_dc_elements_1_1_identifier.filter(identifier => identifier.http_www_w3_org_2001_XMLSchema_instance_type.includes('ORCID'));
          if (this.formForPersonsOrcid) {
            this.formForPersonsOrcid.setValue(orcid[0].http_www_w3_org_1999_02_22_rdf_syntax_ns_value);
          }
          else {
            this.formForPersonsOrcid = this.fb.nonNullable.control(orcid[0].http_www_w3_org_1999_02_22_rdf_syntax_ns_value);
          }
        } else if (person.http_purl_org_dc_elements_1_1_identifier && person.http_purl_org_dc_elements_1_1_identifier.http_www_w3_org_2001_XMLSchema_instance_type === 'ORCID') {
          let orcid = person.http_purl_org_dc_elements_1_1_identifier.http_www_w3_org_1999_02_22_rdf_syntax_ns_value;
          if (this.formForPersonsOrcid) {
            this.formForPersonsOrcid.setValue(orcid);
          }
          else {
            this.formForPersonsOrcid = this.fb.nonNullable.control(orcid);
          }
        }

        let ou_id = '', ou_name = '';
        if (Array.isArray(person.http_purl_org_escidoc_metadata_terms_0_1_position)) {
          const ou_2_display = person.http_purl_org_escidoc_metadata_terms_0_1_position.filter(ou => ou.http_purl_org_eprint_terms_affiliatedInstitution.startsWith(selected_ou));
          if (ou_2_display && ou_2_display.length === 1) {
            ou_id = ou_2_display[0].http_purl_org_dc_elements_1_1_identifier;
            ou_name = ou_2_display[0].http_purl_org_eprint_terms_affiliatedInstitution;
          }
        } else {
          ou_id = person.http_purl_org_escidoc_metadata_terms_0_1_position.http_purl_org_dc_elements_1_1_identifier;
          ou_name = person.http_purl_org_escidoc_metadata_terms_0_1_position.http_purl_org_eprint_terms_affiliatedInstitution;
        }
        console.log("OU", ou_id, ou_name)
        const patched_ou: OrganizationVO = {
          identifier: ou_id,
          name: ou_name
        }
        this.formForPersonOrganizations.clear();
        this.formForPersonOrganizations.push(this.fbs.organization_FG(patched_ou));
      });
  }

  deleteFields() {
    if (this.formForPersonsCompleteName) {
      this.formForPersonsCompleteName.setValue('');
    }
    if (this.formForPersonsGivenName) {
      this.formForPersonsGivenName.setValue('');
    }
    if (this.formForPersonsFamilyName) {
      this.formForPersonsFamilyName.setValue('');
    }
    console.log("formForPersonOrganization before delete", this.formForPersonOrganizations?.value);
    if (this.formForPersonOrganizations) {
      this.formForPersonOrganizations.clear();
    }
    console.log("formForPersonOrganization after delete", this.formForPersonOrganizations?.value);
    this.formForPersonsIdValue.setValue(null);
    this.formForPersonsIdType?.setValue(null);
    this.formForPersonsOrcid?.setValue(null);
    //this.formForPersonsIdValue.get('id')?.setValue(null);
    //this.formForPersonsIdValue.get('type')?.setValue(null);
  }
}
